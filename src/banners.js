// ニュース一覧(/cms/news/)の先頭に、トップページのバナー(スライダー)を3列の固定表示で並べる。トライアルサービスは除外。
(() => {
'use strict';
if (window.__roModBanners) return;
if (!/^\/cms\/news\/?$/.test(location.pathname)) return;   // 一覧ページのみ（個別記事は対象外）
window.__roModBanners = true;
const ORIGIN = location.origin;
const abs = u => { try { return new URL(u, ORIGIN).href; } catch (_) { return ''; } };
const isTrial = b => b.url === '/cms/news/1' || /トライアル/.test([b.title, b.bannerAltText, decodeURIComponent(String(b.bannerImage || ''))].join(' '));

async function run() {
  let on = true;
  try { on = (await chrome.storage.local.get({ banners: true })).banners; } catch (_) {}
  if (!on || document.getElementById('ro-mod-banners')) return;
  const r = await fetch('/cms/articles_exclude_shop?banner=1', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!r.ok) return;
  const list = (await r.json()).slice(0, 13).filter(b => b && b.bannerImage && b.url && !isTrial(b));   // トップのスライダーと同じ先頭13件から、トライアルを除く
  if (!list.length) return;
  const anchor = document.querySelector('.article-list') || document.querySelector('.layout-main__content') || document.querySelector('main');
  if (!anchor || !anchor.parentNode) return;
  const css = document.createElement('style');
  css.textContent = '#ro-mod-banners{margin:0 0 24px;box-sizing:border-box}'
    + '#ro-mod-banners .rb-grid{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:center}'
    + '#ro-mod-banners a{display:block;line-height:0;flex:none}#ro-mod-banners img{display:block;max-width:none;height:auto;width:auto}#ro-mod-banners a:hover{opacity:.85}';
  const box = document.createElement('div'); box.id = 'ro-mod-banners';
  const grid = document.createElement('div'); grid.className = 'rb-grid';
  let bw = 0;
  for (const b of list) { const a = document.createElement('a'); a.href = abs(b.url);
    const im = document.createElement('img'); im.alt = b.bannerAltText || b.title || ''; im.title = im.alt;
    // 元画像の半分のサイズで固定（公式トップのスライダーと同じ）
    im.addEventListener('load', () => { im.style.width = Math.round(im.naturalWidth / 2) + 'px'; bw = Math.max(bw, Math.round(im.naturalWidth / 2)); fit(); });
    im.src = abs(b.bannerImage);
    a.appendChild(im); grid.appendChild(a); }
  // ページ本文の幅に縛られず、ブラウザの表示幅いっぱいまで使う（1行は最大5枚）
  function fit() {
    box.style.width = ''; box.style.marginLeft = '';
    const sw = document.documentElement.clientWidth, pad = 16;
    const left = box.getBoundingClientRect().left;
    let w = sw - pad * 2;
    if (bw) w = Math.min(w, bw * 5 + 12 * 4);
    box.style.width = w + 'px';
    box.style.marginLeft = (pad - left + (sw - pad * 2 - w) / 2) + 'px';
  }
  addEventListener('resize', fit);
  box.append(css, grid);
  anchor.parentNode.insertBefore(box, anchor);
  fit();
  // 上の見出し（お知らせ）との間の余白を詰める（ページ側の余白が12pxを超える分だけ）
  const hd = document.querySelector('.layout-header');
  if (hd) {
    const gap = box.getBoundingClientRect().top - hd.getBoundingClientRect().bottom;
    if (gap > 12) box.style.marginTop = '-' + Math.round(gap - 12) + 'px';
  }
}
run().catch(() => {});
})();
