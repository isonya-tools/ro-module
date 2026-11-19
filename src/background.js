// [名前] の公式ツール検索用。content script からの依頼で rotool.gungho.jp を取得する（CORS回避）
const BASE = 'https://rotool.gungho.jp';
const cache = new Map();
async function get(name) {
  const sr = await fetch(BASE + '/item/prediction_conversion_search_name/?item_name=' + encodeURIComponent(name));
  const arr = await sr.json();
  const hit = Array.isArray(arr) && (arr.find(x => x.item_name === name) || null);
  if (!hit) return null;
  const pr = await fetch(BASE + '/item/' + encodeURIComponent(hit.item_id) + '/0/');
  return { html: await pr.text(), id: hit.item_id };
}
// トップページのバナー一覧（他ドメインのゲーム起動ページ用）
let bannerCache = null;
chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (m && m.t === 'banners') {
    if (!bannerCache) bannerCache = fetch('https://ragnarokonline.gungho.jp/cms/articles_exclude_shop?banner=1', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []).catch(() => []);
    bannerCache.then(a => { if (!a.length) bannerCache = null; send(a); });
    return true;
  }
  if (!m || m.t !== 'item' || typeof m.name !== 'string' || m.name.length > 40) return;
  if (!cache.has(m.name)) cache.set(m.name, get(m.name).catch(() => null));
  cache.get(m.name).then(r => send(r || {}));
  return true;
});
