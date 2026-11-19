// ゲーム起動ページ: Androidワンタイムパスワードの広告と、中央左のRAGNAROKロゴ画像を非表示にし、
// ロゴの場所にトップページのバナーを上から順に2列で全部並べる（トライアルサービスは除外）。
(() => {
'use strict';
if (window.__roModMember) return;
window.__roModMember = true;
const ORIGIN = 'https://ragnarokonline.gungho.jp';
const abs = u => { try { return new URL(u, ORIGIN).href; } catch (_) { return ''; } };
const isTrial = b => b.url === '/cms/news/1' || /トライアル/.test([b.title, b.bannerAltText, decodeURIComponent(String(b.bannerImage || ''))].join(' '));

function hideOtp() {
  for (const im of document.querySelectorAll('img[src*="otp_free_banner"]')) {
    const a = im.closest('a') || im; a.style.display = 'none';
    const br = a.nextElementSibling; if (br && br.tagName === 'BR') br.style.display = 'none';
  }
}
async function run() {
  let on = true;
  try { on = (await chrome.storage.local.get({ banners: true })).banners; } catch (_) {}
  if (!on) return;
  hideOtp();
  const logo = document.querySelector('img[src*="logo_start"]');
  if (!logo || document.getElementById('ro-mod-banners')) return;
  const list = await new Promise(res => { try { chrome.runtime.sendMessage({ t: 'banners' }, r => res(Array.isArray(r) ? r : [])); } catch (_) { res([]); } });
  const items = list.slice(0, 13).filter(b => b && b.bannerImage && b.url && !isTrial(b));
  if (!items.length) return;
  const holder = logo.parentElement;
  const css = document.createElement('style');
  css.textContent = '#ro-mod-banners{width:max-content;max-width:none}#ro-mod-banners .rb-grid{display:grid;grid-template-columns:max-content;gap:6px}'
    + '#ro-mod-banners a{display:block;line-height:0}#ro-mod-banners img{display:block;border:0;max-width:none;width:auto;height:auto}#ro-mod-banners a:hover{opacity:.85}';
  const box = document.createElement('div'); box.id = 'ro-mod-banners';
  const grid = document.createElement('div'); grid.className = 'rb-grid';
  for (const b of items) {
    const a = document.createElement('a'); a.href = abs(b.url); a.target = '_blank'; a.rel = 'noopener';
    const im = document.createElement('img'); im.alt = b.bannerAltText || b.title || ''; im.title = im.alt;
    // 元画像の半分のサイズで固定（公式トップのスライダーと同じ）
    im.addEventListener('load', () => { im.style.width = Math.round(im.naturalWidth / 2) + 'px'; });
    im.src = abs(b.bannerImage);
    a.appendChild(im); grid.appendChild(a);
  }
  box.append(css, grid);
  // ロゴと同じ高さの枠に固定し、バナーははみ出させる（隣の「ゲーム起動」ボタン等の行が縦に広がらないように）
  const lh = Math.round(logo.getBoundingClientRect().height) || 300;
  holder.style.height = lh + 'px'; holder.style.position = 'relative'; holder.style.verticalAlign = 'top';
  box.style.position = 'absolute'; box.style.top = '0'; box.style.left = '0';
  const pad = holder.closest('table.tbr_a') || holder.closest('table');
  // ロゴを入れていた表の幅をバナーの幅に合わせ、右側のアカウント行（ゲーム起動ボタン等）をバナーの右へ押し出す
  const slot = logo.closest('table');
  const reserve0 = () => { if (slot) { const w = box.offsetWidth; slot.style.width = w + 'px'; slot.style.minWidth = w + 'px'; holder.style.width = w + 'px'; } };
  const reserve = () => { reserve0(); if (pad) pad.style.marginBottom = Math.max(0, Math.round(box.getBoundingClientRect().bottom - pad.getBoundingClientRect().bottom) + 12) + 'px'; };
  if (window.ResizeObserver) new ResizeObserver(reserve).observe(box);
  reserve();
  logo.style.display = 'none';
  const br = logo.nextElementSibling; if (br && br.tagName === 'BR') br.style.display = 'none';
  holder.appendChild(box);
}
run().catch(() => {});
})();
