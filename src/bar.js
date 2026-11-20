(() => {
'use strict';
if (!/^(ragnarokonline|rotool|member)\.gungho\.jp$|^isonya-tools\.web\.app$|^ro-blog\.livedoor\.biz$/.test(location.hostname) || window.top !== window || window.__roLoupeBar) return;
window.__roLoupeBar = true;
const NAME = chrome.runtime.getManifest().name;
const BASE = 'https://ragnarokonline.gungho.jp';
const RT = 'https://rotool.gungho.jp';
const TOOLS = [['アイテム検索', RT + '/item/'], ['モンスター検索', RT + '/monster/'], ['マップ検索', RT + '/map/'], ['スキル検索', RT + '/skill/'], ['スキルツリー', RT + '/character_skill_tree/']];
const MAIN = [
  ['ストア', BASE + '/store/'],
  ['スペシャルエンチャ', BASE + '/gameguide/system/equip-powerup/special-enchant.html'],
  ['ファロスエンチャ', BASE + '/gameguide/system/equip-powerup/pharos-enchant.html'],
  ['季節エンチャ', BASE + '/gameguide/system/equip-powerup/house-of-Mysteries.html']
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = u => u.startsWith('http') ? u : BASE + u;
const H = 52;
const U = p => chrome.runtime.getURL(p);
const host = document.createElement('div');
host.style.cssText = 'all:initial;position:fixed;z-index:9000;left:0;top:0;width:100%';
const root = host.attachShadow({ mode: 'closed' });
const others = window.__RO_LOOPE_LINKS || [];
const CATS = [['md', 'メモリアルダンジョン'], ['other', 'その他']];   // 'old' は載せない
const SPECIAL = MAIN.slice(1);
const rest = others.filter(o => o.c !== 'old');
const groups = CATS.map(([k, n]) => [n, others.filter(o => o.c === k || (k === 'other' && !['md', 'old'].includes(o.c)))]).filter(g => g[1].length);
const LAY = window.__RO_LOOPE_LAYOUT;
const enchLay = LAY ? `<div class="cols">${LAY.map(col => `<div class="cl">${col.map((s, i) => `<div class="sec${i ? ' nx' : ''}">${s.h ? `<div class="gh">${esc(s.h)}</div>` : ''}${s.i.map(o => `<a href="${esc(abs(o.u))}">${esc(o.t)}</a>`).join('')}</div>`).join('')}</div>`).join('')}</div>` : null;
const enchMenu = enchLay || `<div class="rest">${SPECIAL.map(([t, u], i) => `<a class="sp${i === SPECIAL.length - 1 ? ' last' : ''}" href="${esc(u)}">${esc(t)}</a>`).join('')}${rest.map(o => `<a href="${esc(abs(o.u))}">${esc(o.t)}</a>`).join('')}</div>`;
const lnk = ([t, u]) => `<a href="${esc(u)}" target="_self" rel="noopener">${esc(t)}</a>`;
const toolMenu = `<a href="${BASE}/" target="_self" rel="noopener">公式トップ</a><div class="dd t"><a href="${RT}/" target="_self" rel="noopener">公式ツール ▾</a><div class="pn tl"><div class="pi">${TOOLS.map(([t, u]) => `<a href="${u}" target="_self" rel="noopener">${esc(t)}</a>`).join('')}</div></div></div>`;
root.innerHTML = `<style>
*{box-sizing:border-box}
#bar{height:${H}px;display:flex;align-items:stretch;gap:2px;padding:0 10px;background:#1d2233;color:#f1f3fa;font:13px/1 "BIZ UDPGothic","Meiryo","Yu Gothic UI",sans-serif;border-bottom:2px solid #5a6db0;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.g{display:flex;align-items:stretch;height:100%;padding:0 4px;background:color-mix(in srgb,var(--c) 14%,transparent);margin-right:6px}
.gt{--c:#5aa9e6}.gs{--c:#e6a23c}.ge{--c:#5fcf97}.gx{--c:#c58be8}.gg{--c:#ff9fb8}.gn{--c:#f08fb4}
.nm{font:500 18px/1 'RoLoupeTitle','BIZ UDPGothic',sans-serif;margin-right:10px;white-space:nowrap;align-self:center;color:#ffe9a8;letter-spacing:.04em}
a,.dd>span{display:flex;align-items:center}
.big{gap:8px;padding:4px 12px;font-weight:700;font-size:14px}.big img{width:40px;height:40px}
.g.first{margin-left:auto;margin-right:0}.g.gap{margin-left:14px}
@media (max-width:1400px){.big{font-size:12px;gap:5px;padding:4px 7px}.big img{width:30px;height:30px}a{padding:0 7px}.dd>span{padding:0 7px}}
a{color:inherit;text-decoration:none;padding:0 10px;white-space:nowrap}
a:hover{background:#34406b}
.dd{position:static;display:flex}
.dd>span{padding:0 10px;cursor:default;white-space:nowrap}
.dd:hover>span{background:#34406b}
.pn{position:fixed;left:10px;top:${H - 2}px;width:min(900px,calc(100vw - 20px));overflow:hidden;filter:drop-shadow(0 6px 9px rgba(0,0,0,.5))}
.pi{display:flex;gap:4px;background:#1d2233;border:1px solid #5a6db0;padding:6px;max-height:calc(100vh - ${H + 8}px);overflow:auto;transform:translateY(-100%);transition:transform .38s cubic-bezier(.22,1,.36,1)}
.pn{visibility:hidden;pointer-events:none;transition:visibility 0s .38s}
.dd:hover .pn{visibility:visible;pointer-events:auto;transition:visibility 0s}.dd:hover .pn .pi{transform:none}
.dd.t{position:relative}.pn.tl{position:absolute;left:0;top:100%;width:max-content;min-width:150px}.pn.tl .pi{flex-direction:column;padding:4px}.pn.en .pi{flex-direction:column}.dd.e{position:relative}.pn.en{position:absolute;left:0;top:100%;width:600px;max-width:96vw}.pn .rest a.sp.last{border-bottom:1px solid #4a5273;margin-bottom:4px;padding-bottom:8px}.pn .rest{columns:2;column-gap:8px;width:100%}.gh{font-weight:400;color:rgba(241,243,250,.5);padding:4px 10px;border-bottom:1px solid #4a5273;margin-bottom:2px;font-size:12px}
.cols{display:flex;gap:14px;width:100%}.cl{flex:1;min-width:0}.sec.nx{margin-top:6px;padding-top:6px;border-top:1px solid #4a5273}.sec.nx:has(.gh){border-top:0}.sec .gh{margin-top:2px}
.sm{font-size:11px;opacity:.9;align-self:center;padding:0 8px;margin:0 8px 0 2px}.sm:hover{background:none;text-decoration:underline}
.pn a{break-inside:avoid;padding:6px 10px;font-size:12px;display:block}
</style><div id="bar"><span class="nm">${esc(NAME)}</span><div class="g gg"><a class="big" href="https://member.gungho.jp/front/member/webgs/rocenter_old.aspx" target="_self" rel="noopener"><img src="${U('icons/game.png')}" alt="">ゲーム起動</a></div><div class="g gx"><a class="big" href="https://md-manager.web.app/" target="_blank" rel="noopener"><img src="${U('icons/md.png')}" alt="">入場制限MD管理</a></div><div class="g gt gap">${toolMenu}</div><div class="g gs">${lnk(MAIN[0])}</div><div class="g ge"><div class="dd e"><span>エンチャント ▾</span><div class="pn en"><div class="pi">${enchMenu}</div></div></div></div><div class="g gn">${lnk(['ニュース一覧', BASE + '/cms/news/'])}${lnk(['RO公式ブログ', 'https://ro-blog.livedoor.biz/'])}</div> <div class="g gx first"><a class="big" href="https://isonya-tools.web.app/" target="_self" rel="noopener"><img src="${U('icons/tools.png')}" alt="">いそにゃ開発ツール集</a></div></div>`;
const ff = document.createElement('style');
ff.textContent = `@font-face{font-family:'RoLoupeTitle';src:url('${U('fonts/title.woff2')}') format('woff2');font-display:swap}`;
document.documentElement.appendChild(ff);
const st = document.createElement('style');
function apply(on) {
  if (on) {
    if (!host.isConnected) document.documentElement.appendChild(host);
    st.textContent = `html{margin-top:${H}px !important}`;
    if (!st.isConnected) document.documentElement.appendChild(st);
  } else { host.remove(); st.remove(); }
}
root.querySelectorAll('.dd').forEach(d => d.addEventListener('mouseenter', () => {
  const pn = d.querySelector('.pn'); if (!pn) return; pn.style.left = '0px';
  const over = pn.getBoundingClientRect().right - (innerWidth - 8);
  if (over > 0) pn.style.left = -over + 'px';
}));
chrome.storage.local.get({ bar: true }).then(v => apply(v.bar)).catch(() => apply(true));
chrome.storage.onChanged.addListener(c => { if (c.bar) apply(c.bar.newValue); });
})();
