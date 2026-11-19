(() => {
'use strict';
if (window.__roPlusLoaded) return;
window.__roPlusLoaded = true;
const NAME = chrome.runtime.getManifest().name;   // 表示名は manifest.json の name 1か所
const ONROTOOL = location.hostname === 'rotool.gungho.jp';
let failed = false, enabled = true, DICT = null, TRIE = null, MAXLEN = 1, loading = false;
chrome.storage.local.get({ enabled: true }).then(v => { enabled = v.enabled; }).catch(() => {});
chrome.storage.onChanged.addListener(c => { if (c.enabled) { enabled = c.enabled.newValue; if (!enabled) hide(); } });

const nk = s => s.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const isAN = c => /[0-9a-z]/.test(c || '');
const isKT = c => /[\u30A0-\u30FF]/.test(c || '');
// 語の途中（英数字どうし・カタカナどうし）の一致は除外
const isL = c => /[\p{L}\p{N}]/u.test(c || '');
const joined = (a, b) => (isAN(a) && isAN(b)) || (isKT(a) && isKT(b));

function loadDict() {
  if (loading || failed) return; loading = true;
  if (!chrome.runtime || !chrome.runtime.id) { failed = true; return; }
  fetch(chrome.runtime.getURL('data/dict.json')).then(r => r.json()).then(j => {
    DICT = j; TRIE = {};
    for (const k of Object.keys(j.d)) {
      let n = TRIE; for (const ch of k) n = (n.c || (n.c = new Map())).get(ch) || (n.c.set(ch, {}), n.c.get(ch));
      n.k = k; if (k.length > MAXLEN) MAXLEN = k.length;
    }
  }).catch(() => { failed = true; });
}

// ---- 表示用整形（enchant-db の tipHtml を移植。説明文は省略しない） ----
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function tipLn(l) {
  const m = l.match(/^\x02(.*?)\x03\s*(.*)$/);
  if (!m) return `<div class="ln">${esc(l)}</div>`;
  return `<div class="cg"><b class="cd">${esc(m[1].replace(/：$/, ''))}</b>${m[2] ? m[2].split(' ／ ').map(e => `<div class="ef">${esc(e)}</div>`).join('') : ''}</div>`;
}
function tipHtml(t) {
  const [a, b] = t.split('\n§\n');
  let h = a.split('\n').filter(l => l !== '\x06').map(l => l.startsWith('\x05') ? `<div class="in">${esc(l.slice(1))}</div>` : tipLn(l)).join('');
  if (b !== undefined) {
    const ps = [...b.matchAll(/(\S[^:\n]*?) : ((?:(?! \S[^:\n]*? : ).)+)/g)].map(m => `<span>${esc(m[1])}</span><b>${esc(m[2])}</b>`);
    h += `<div class="spec">${ps.join('')}</div>`;
  }
  return h;
}

// ---- ツールチップ（Shadow DOM でサイトのCSSと分離） ----
const host = document.createElement('div');
host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:0;top:0;pointer-events:none';
const ITEM_URL = id => 'https://rotool.gungho.jp/item/' + encodeURIComponent(id) + '/0/';
const root = host.attachShadow({ mode: 'closed' });
root.innerHTML = `<style>
:host{all:initial}
#tip{position:fixed;pointer-events:none;max-width:560px;max-height:90vh;overflow:hidden;background:#1d2233;color:#f1f3fa;font:13px/1.5 "BIZ UDPGothic","Meiryo","Yu Gothic UI",sans-serif;padding:8px 12px;display:none;box-shadow:0 4px 18px rgba(0,0,0,.45);border:1px solid #4a5273;text-align:left;letter-spacing:0}
#tip.cols{max-width:min(1100px,96vw);columns:2;column-gap:20px}#tip.cols3{columns:3}#tip.cols4{columns:4;font-size:11px;max-width:98vw}
#tip .hd{font-weight:700;font-size:14px;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #4a5273;break-after:avoid}
#tip .hd i{font-style:normal;font-size:10px;font-weight:700;margin-left:6px;padding:0 4px;border:1px solid currentColor;opacity:.75}
#tip .ln{padding-left:1em;text-indent:-1em;break-inside:avoid}
#tip .cg{break-inside:avoid;margin-top:3px}#tip .cg .cd{display:block;color:#ffe9a8;font-weight:700}
#tip .ef{padding-left:2em;text-indent:-1em}#tip .ef::before{content:"・"}
#tip .in{opacity:.75;margin-bottom:4px}
#tip .spec{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:1px 10px;margin-top:6px;padding-top:6px;border-top:1px solid #4a5273}
#tip .spec span{opacity:.7}#tip .spec b{font-weight:400}
#tip .ft{margin-top:6px;opacity:.5;font-size:10px;break-before:avoid}
</style><div id="tip"></div>`;
const TIP = root.getElementById('tip');
(document.body || document.documentElement).appendChild(host);
const st = document.createElement('style');
st.textContent = '::highlight(ro-plus-hl){background-color:rgba(255,196,0,.38)}';
document.documentElement.appendChild(st);
const HL = (window.CSS && CSS.highlights && window.Highlight) ? new Highlight() : null;
if (HL) CSS.highlights.set('ro-plus-hl', HL);

let shownKey = null, hit = null;   // hit: いまマウスが乗っているアイテム {id, r}（クリックで公式ツールを開く）
const curCss = document.createElement('style');
curCss.textContent = 'html,html *{cursor:pointer !important}';
function setHit(h) {
  hit = h;
  if (h) { if (!curCss.isConnected) document.documentElement.appendChild(curCss); }
  else if (curCss.isConnected) curCss.remove();
}
function hide() { TIP.style.display = 'none'; shownKey = null; setHit(null); if (HL) HL.clear(); }
function show(typ, name, text, x, y) {
  if (!host.isConnected) document.documentElement.appendChild(host);
  const key = name + '|' + text.length;
  if (shownKey !== key) {
    shownKey = key;
    typ = typ === 'i' ? 'アイテム' : typ === 'e' ? 'エンチャント' : typ;
    TIP.className = ''; TIP.style.fontSize = ''; TIP.style.display = 'block';
    TIP.innerHTML = `<div class="hd">${esc(name)}<i>${typ}</i></div>` + tipHtml(text) + `<div class="ft">${esc(NAME)}（非公式）</div>`;
    for (const c of ['cols', 'cols3', 'cols4']) {
      if (TIP.scrollHeight <= TIP.clientHeight + 1 && TIP.scrollWidth <= TIP.clientWidth + 1) break;
      TIP.classList.add(c);
    }
    for (let fs = 13; fs > 8 && TIP.scrollHeight > TIP.clientHeight + 1; fs--) TIP.style.fontSize = fs + 'px';   // 長い説明も切らずに収める
    if (TIP.scrollHeight <= TIP.clientHeight + 1) { /* ok */ }
  }
  const w = TIP.offsetWidth, h = TIP.offsetHeight;
  let l = x + 16, t = y - h - 14;
  if (t < 4) t = y + 22;
  if (t + h > innerHeight - 4) t = Math.max(4, innerHeight - h - 4);
  if (l + w > innerWidth - 4) l = Math.max(4, x - w - 16);
  TIP.style.left = l + 'px'; TIP.style.top = t + 'px';
}

// ---- 辞書にない [名前] は公式ツールから取得して表示（拡張のバックグラウンド経由） ----
const remote = new Map();   // name -> Promise<{name,text}|null>
function parseItem(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const art = doc.querySelector('article'); if (!art) return null;
  const h = art.querySelector('h1,h2,h3'); const title = h ? h.textContent.replace(/マイセットに追加/g, '').replace(/🎒/g, '').trim() : '';
  let reg = h && h.nextElementSibling; while (reg && !reg.textContent.trim()) reg = reg.nextElementSibling;
  if (!reg) return null;
  const c = reg.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith('\n')); c.querySelectorAll('p,div,li,tr,hr,table').forEach(b => b.append('\n'));
  const text = c.textContent.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  return text ? { name: title, text } : null;
}
function lookupRemote(name) {
  if (!remote.has(name)) {
    remote.set(name, new Promise(res => {
      try { chrome.runtime.sendMessage({ t: 'item', name }, r => { try { const p = r && r.html ? parseItem(r.html) : null; res(p ? { ...p, id: r.id } : null); } catch (_) { res(null); } }); } catch (_) { res(null); }
    }));
  }
  return remote.get(name);
}
let curRemote = null;
function bracketAt(node, off) {
  const d = node.data; let i = Math.min(off, d.length - 1);
  for (const st of [i, i - 1]) {
    if (st < 0) continue;
    const a = d.lastIndexOf('[', st), e = d.indexOf(']', Math.max(st, a));
    if (a < 0 || e < 0 || e < st || d.slice(a, e).includes(']')) continue;
    const name = d.slice(a + 1, e).trim();
    if (name.length < 2 || name.length > 30) continue;
    const r = document.createRange(); r.setStart(node, a); r.setEnd(node, e + 1);
    return { name, r };
  }
  return null;
}

// ---- マウス位置の文字から辞書を引く ----
const cache = new WeakMap();
function norm(node) {
  const data = node.data, c = cache.get(node);
  if (c && c.data === data) return c;
  let s = '', map = [], start = [];
  for (let i = 0; i < data.length; i++) {
    start[i] = s.length;
    const n = nk(data[i]);
    for (const ch of n) { s += ch; map.push(i); }
  }
  start[data.length] = s.length;
  const r = { data, s, map, start };
  cache.set(node, r); return r;
}
function caretAt(x, y) {
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p && p.offsetNode ? [p.offsetNode, p.offset] : null; }
  const r = document.caretRangeFromPoint && document.caretRangeFromPoint(x, y);
  return r ? [r.startContainer, r.startOffset] : null;
}
function find(node, off) {
  const N = norm(node), s = N.s;
  for (const ci of [off, off - 1]) {
    if (ci < 0 || ci >= node.data.length) continue;
    const ni = N.start[ci];
    if (ni >= s.length || N.map[ni] !== ci) continue;
    let best = null;
    for (let a = Math.max(0, ni - MAXLEN + 1); a <= ni; a++) {
      let n = TRIE;
      for (let j = a; j < s.length; j++) {
        n = n.c && n.c.get(s[j]); if (!n) break;
        if (n.k && j >= ni) {
          const k = n.k;
          if (k.length <= 2 && (isL(s[a - 1]) || isL(s[j + 1]))) continue;   // 短い名前は単独で書かれているときだけ
          if (joined(k[0], s[a - 1])) continue;
          if (joined(k[k.length - 1], s[j + 1])) continue;
          if (ONROTOOL && DICT.d[k][0] === 'e' && !(s[a - 1] === '[' && s[j + 1] === ']')) continue;   // 公式ツール本文の「Str + 7」等はエンチャではない
          if (!best || k.length > best.k.length) best = { k, a, e: j };
        }
      }
    }
    if (best) {
      const r = document.createRange();
      r.setStart(node, N.map[best.a]); r.setEnd(node, N.map[best.e] + 1);
      return { k: best.k, r };
    }
  }
  return null;
}
function inRect(r, x, y) {
  for (const q of r.getClientRects()) if (x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1) return true;
  return false;
}
function probe(x, y) {
  if (!enabled) return hide();
  if (!DICT) { loadDict(); return; }
  const c = caretAt(x, y);
  if (!c || c[0].nodeType !== 3) return hide();
  const el = c[0].parentElement;
  if (!el || el.closest('input,textarea,select,script,style,[contenteditable]:not([contenteditable="false"])') || host.contains(el)) return hide();
  const f = find(c[0], c[1]);
  if (f && inRect(f.r, x, y)) {
    curRemote = null;
    if (HL) { HL.clear(); HL.add(f.r); }
    const en = DICT.d[f.k]; show(en[0], en[1], DICT.t[en[2]], x, y); setHit(en[0] === 'i' && en[3] ? { id: en[3], r: f.r } : null); return;
  }
  const b = bracketAt(c[0], c[1]);
  if (b && inRect(b.r, x, y)) {
    if (HL) { HL.clear(); HL.add(b.r); }
    curRemote = b.name;
    lookupRemote(b.name).then(res => { if (curRemote === b.name && res) { show('アイテム', res.name || b.name, res.text, px, py); setHit(res.id ? { id: res.id, r: b.r } : null); } });
    return;
  }
  curRemote = null; hide();
}
let raf = 0, px = 0, py = 0;
document.addEventListener('mousemove', e => {
  px = e.clientX; py = e.clientY;
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; try { probe(px, py); } catch (_) { hide(); } });
}, { passive: true });
// ヒットしている文字をクリックすると、公式ツールのそのアイテムページを新しいタブで開く
document.addEventListener('click', e => {
  if (!hit || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if (!inRect(hit.r, e.clientX, e.clientY)) return;
  e.preventDefault(); e.stopPropagation();
  window.open(ITEM_URL(hit.id), '_blank', 'noopener,noreferrer');
}, true);
document.addEventListener('scroll', hide, { passive: true, capture: true });
document.addEventListener('mouseleave', hide);
window.addEventListener('blur', hide);
})();
