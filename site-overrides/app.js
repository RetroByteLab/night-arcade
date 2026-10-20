const CATEGORIES = ['Racing', 'Arcade', 'Adventure', 'Sports', 'Puzzle', 'Platformer', 'Simulation', 'Multiplayer'];
const CATEGORY_ICONS = { Racing: '⌁', Arcade: '✧', Adventure: '◇', Sports: '◎', Puzzle: '▦', Platformer: '↗', Simulation: '◉', Multiplayer: '♧' };
const DEVICE_FILTERS = [['All devices', ''], ['Desktop checked', 'desktop'], ['Phone / tablet checked', 'phone-emulated'], ['Needs device review', 'needs-review']];
const STORE = { favorites: 'night-arcade:favorites:v1', recent: 'night-arcade:recent:v1' };
let games = [];
let activeView = 'blank';
let activeCategory = '';
let activeDevice = '';
let sortMode = 'featured';
let searchTerm = '';
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function readSet(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } }
function readRecent() { try { const value = JSON.parse(localStorage.getItem(STORE.recent) || '[]'); return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []; } catch { return []; } }
function writeSet(key, value) { try { localStorage.setItem(key, JSON.stringify([...value])); } catch { showToast('This browser is not saving local preferences.'); } }
function safeHttpUrl(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function hasBlankLaunch(game) { return ['about-blank-local', 'about-blank-embed', 'about-blank-html'].includes(game.launchMethod); }
function isLibraryEntry(game) { return hasBlankLaunch(game) || game.libraryVisible === true; }
function playButtonText(game) {
  if (game.compatibility === 'incompatible') return 'Compatibility details';
  if (!hasBlankLaunch(game)) return game.id === 'snow-rider-3d' ? 'Unavailable' : game.releaseType === 'download' ? 'Creator download page' : 'View source';
  if (typeof game.playLabel === 'string') return esc(game.playLabel);
  return 'Play';
}
function getFavorites() { return readSet(STORE.favorites); }
function getById(id) { return games.find((game) => game.id === id); }
function showToast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2800); }

function renderCategories() {
  const pool = activeView === 'blank' ? games.filter(isLibraryEntry) : games;
  $('#category-nav').innerHTML = CATEGORIES.map((name) => `<button class="category-item" data-category="${esc(name)}"><span class="category-glyph">${CATEGORY_ICONS[name]}</span>${esc(name)}<span class="category-count">${pool.filter((game) => game.categories.includes(name)).length}</span></button>`).join('');
  $('#filter-row').innerHTML = `<button class="filter-chip ${activeCategory ? '' : 'selected'}" data-category="">All categories</button>` + CATEGORIES.map((name) => `<button class="filter-chip ${activeCategory === name ? 'selected' : ''}" data-category="${esc(name)}">${esc(name)}</button>`).join('');
  $('#device-filter-row').innerHTML = DEVICE_FILTERS.map(([label, value]) => `<button class="filter-chip ${activeDevice === value ? 'selected' : ''}" data-device="${esc(value)}">${esc(label)}</button>`).join('');
  document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
    activeCategory = button.dataset.category || '';
    activeDevice = '';
    activeView = activeView === 'blank' ? 'blank' : 'all';
    updateNav(); renderCategories(); renderGrid(); scrollToLibrary();
  }));
  document.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => {
    activeDevice = button.dataset.device || '';
    activeView = activeView === 'blank' ? 'blank' : 'all';
    activeCategory = '';
    updateNav(); renderCategories(); renderGrid(); scrollToLibrary();
  }));
}

function updateNav() {
  const labels = { all: 'SOURCE CATALOG', blank: 'GAME LIBRARY', favorites: 'FAVORITES', recent: 'RECENTLY PLAYED' };
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === activeView));
  $('#view-label').textContent = activeCategory || (activeDevice ? DEVICE_FILTERS.find(([, value]) => value === activeDevice)?.[0]?.toUpperCase() : labels[activeView]) || 'ALL GAMES';
  $('#all-count').textContent = games.length;
  $('#blank-count').textContent = games.filter(isLibraryEntry).length;
}

function gameCard(game, index) {
  const favorite = getFavorites().has(game.id);
  const external = !hasBlankLaunch(game);
  const unavailable = external && game.id === 'snow-rider-3d';
  const publisher = game.launchMethod === 'about-blank-embed';
  const cardStatus = unavailable ? 'Awaiting authorized HTML' : game.compatibility === 'supported' ? 'About:blank supported' : game.compatibility === 'untested' ? 'Jump in' : 'External website required';
  const description = game.description === 'Publisher-provided HTML game embed.' ? '' : game.description;
  const buttonText = playButtonText(game);
  const thumbnail = game.thumbnail ? safeHttpUrl(new URL(game.thumbnail, document.baseURI).href) : '';
  const source = safeHttpUrl(game.sourceUrl);
  const warnings = Array.isArray(game.warnings) ? game.warnings : [];
  const licenseUrl = safeHttpUrl(game.licenseUrl);
  const showLicense = game.license !== 'Publisher-provided embed HTML';
  return `<article class="game-card">
    <div class="card-art" style="--art:${esc(game.accent || '#292f40')}">${thumbnail ? `<img src="${esc(thumbnail)}" alt="" loading="lazy" decoding="async">` : ''}<span class="art-symbol" aria-hidden="true">${esc(game.symbol || '✦')}</span><span class="game-number">${String(index + 1).padStart(2, '0')}</span><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-favorite="${esc(game.id)}" aria-label="${favorite ? 'Remove from' : 'Add to'} favorites" aria-pressed="${favorite}">${favorite ? '♥' : '♡'}</button></div>
    <div class="card-info"><div class="card-title-row"><h3 title="${esc(game.title)}">${esc(game.title)}</h3></div><button class="card-play" data-play="${esc(game.id)}" ${unavailable ? 'disabled title="Awaiting an authorized HTML version"' : ''}><span>${external && !unavailable ? '↗' : '▶'}</span>${buttonText}</button>${warnings.map((warning) => `<div class="content-warning" role="note">⚠ ${esc(warning)}</div>`).join('')}${description ? `<p>${esc(description)}</p>` : ''}<div class="card-meta"><span class="game-category">${esc((game.categories || ['Other'])[0])}</span><span class="compat-badge ${external || game.compatibility !== 'supported' ? 'external' : ''}" title="${esc(game.compatibilityNote)}" aria-label="Status: ${esc(cardStatus)}">${esc(cardStatus)}</span></div>${publisher && source ? `<a class="publisher-play" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Open on publisher ↗</a>` : ''}</div>
    ${source ? `<div class="card-source"><a href="${esc(source)}" target="_blank" rel="noopener noreferrer" title="${esc(game.sourceInfo || game.sourceName || 'Game source')}">${publisher ? 'Publisher ↗' : game.id === 'snow-rider-3d' ? 'Official game ↗' : 'Source ↗'}</a>${showLicense ? licenseUrl ? `<a href="${esc(licenseUrl)}" target="_blank" rel="noopener noreferrer" title="${esc(game.sourceInfo)}">${esc(game.license)}</a>` : `<span title="${esc(game.license || 'License not recorded')}">${esc(game.license || 'License not recorded')}</span>` : ''}</div>` : ''}
  </article>`;
}

function getVisibleGames() {
  let visible = [...games];
  if (activeView === 'blank') visible = visible.filter(isLibraryEntry);
  if (activeView === 'favorites') { const favorites = getFavorites(); visible = visible.filter((game) => favorites.has(game.id)); }
  if (activeView === 'recent') { const recent = readRecent(); visible = recent.map(getById).filter(Boolean); }
  if (activeCategory) visible = visible.filter((game) => (game.categories || []).includes(activeCategory));
  if (activeDevice) visible = visible.filter((game) => (game.deviceCompatibility || []).includes(activeDevice));
  if (searchTerm) {
    const query = searchTerm.toLocaleLowerCase();
    visible = visible.filter((game) => [game.title, game.description, ...(game.keywords || []), ...(game.categories || [])].join(' ').toLocaleLowerCase().includes(query));
  }
  if (sortMode === 'az') visible.sort((a, b) => a.title.localeCompare(b.title));
  if (sortMode === 'newest') visible.sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')) || a.title.localeCompare(b.title));
  if (sortMode === 'played') { const recent = readRecent(); visible.sort((a, b) => { const ai = recent.indexOf(a.id); const bi = recent.indexOf(b.id); return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.title.localeCompare(b.title); }); }
  if (sortMode === 'featured') visible.sort((a, b) => (a.featuredRank ?? 999) - (b.featuredRank ?? 999) || a.title.localeCompare(b.title));
  return visible;
}

function renderGrid() {
  updateNav();
  const shown = getVisibleGames();
  $('#game-grid').innerHTML = shown.map(gameCard).join('');
  $('#result-count').textContent = `(${shown.length})`;
  $('#empty-state').hidden = shown.length > 0;
  $('#game-grid').hidden = shown.length === 0;
  $('#clear-history').hidden = activeView !== 'recent' || readRecent().length === 0;
  $('#library-title').firstChild.textContent = activeView === 'favorites' ? 'Your favorites ' : activeView === 'recent' ? 'Recently played ' : activeCategory ? `${activeCategory} games ` : activeDevice ? `${DEVICE_FILTERS.find(([, value]) => value === activeDevice)?.[0]} games ` : activeView === 'featured' ? 'Featured games ' : 'The library ';
  if (activeView === 'blank') $('#library-title').firstChild.textContent = activeCategory ? `${activeCategory} games ` : 'Game library ';
  if (activeView === 'all' && !activeCategory && !activeDevice) $('#library-title').firstChild.textContent = 'Source catalog ';
  document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => toggleFavorite(button.dataset.favorite)));
  document.querySelectorAll('[data-play]').forEach((button) => button.addEventListener('click', () => launchGame(button.dataset.play)));
}

function toggleFavorite(id) {
  const favorites = getFavorites();
  if (favorites.has(id)) { favorites.delete(id); showToast('Removed from favorites'); }
  else { favorites.add(id); showToast('Added to favorites'); }
  writeSet(STORE.favorites, favorites); renderGrid();
}

function recordPlay(id) {
  const recent = readRecent().filter((entry) => entry !== id);
  recent.unshift(id);
  try { localStorage.setItem(STORE.recent, JSON.stringify(recent.slice(0, 30))); } catch { /* Recent play is a convenience, not a launch dependency. */ }
}

function openInlineLauncher(game) {
  const localPath = typeof game.localPath === 'string' && /^games\/[a-z0-9-]+\/index\.html$/.test(game.localPath) ? game.localPath : '';
  if (!localPath) { showToast('This game does not have a safe local launch path.'); return false; }
  const panel = $('#inline-launcher');
  const frame = $('#inline-frame');
  $('#inline-game-title').textContent = game.title;
  frame.title = game.title;
  $('#inline-status').textContent = 'Pop-up blocked; playing here';
  $('#inline-loading').hidden = false;
  panel.hidden = false;
  frame.onload = () => {
    $('#inline-loading').hidden = true;
    $('#inline-status').textContent = 'Game ready';
    try {
      const player = frame.contentDocument.createElement('script');
      player.src = new URL('embed-player.js?v=20261020-3', document.baseURI).href;
      frame.contentDocument.head.append(player);
    } catch { /* Only our same-origin wrappers can be sized here. */ }
  };
  frame.src = new URL(localPath, document.baseURI).href;
  $('#inline-return').focus();
  return true;
}

const FULLSCREEN_FRAME_CSS = ['iframe:fullscreen', 'iframe:-webkit-full-screen'].map((selector) => `${selector}{position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;aspect-ratio:auto!important;display:block!important;background:#000}`).join('');

function applyFullscreenStyles(doc) {
  const style = doc.createElement('style');
  style.id = 'night-arcade-fullscreen';
  style.textContent = FULLSCREEN_FRAME_CSS;
  doc.head.append(style);
}

async function openHtmlBlank(game) {
  const localPath = typeof game.localPath === 'string' && /^games\/[a-z0-9-]+\/index\.html$/.test(game.localPath) ? game.localPath : '';
  if (!localPath) { showToast('No local HTML file is available for this game.'); return false; }
  const popup = window.open('about:blank', '_blank');
  if (!popup || popup.closed) { showToast('The blank tab was blocked by the browser.'); return false; }
  try {
    popup.document.write('<!doctype html><html><head><title>Night Arcade</title></head><body style="background:#090c14;color:white;font:16px Arial;padding:24px">Loading game HTML...</body></html>');
    popup.document.close();
    const url = new URL(localPath, document.baseURI);
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw new Error(`HTML request failed (${response.status})`);
    const html = await response.text();
    if (popup.closed) return false;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('base').forEach((node) => node.remove());
    const base = parsed.createElement('base');
    base.href = url.href;
    parsed.head.prepend(base);
    applyFullscreenStyles(parsed);
    const player = parsed.createElement('script');
    player.defer = true;
    player.src = new URL('embed-player.js?v=20261020-3', document.baseURI).href;
    parsed.head.append(player);
    popup.document.open();
    popup.document.write('<!doctype html>' + parsed.documentElement.outerHTML);
    popup.document.close();
    popup.opener = null;
    try { popup.focus(); } catch { /* Focusing is not a launch requirement. */ }
    return true;
  } catch (error) {
    try { popup.document.body.textContent = `Could not load the game HTML: ${error.message}`; } catch { /* The browser may have closed the tab. */ }
    showToast('The local HTML game could not be loaded.');
    return false;
  }
}

function openPublisherBlank(game) {
  let playUrl;
  try {
    playUrl = new URL(game.embedUrl);
    if (playUrl.protocol !== 'https:' || playUrl.hostname !== 'html5.gamemonetize.co' || playUrl.username || playUrl.password) throw new Error('Invalid publisher URL');
  } catch { showToast('This game does not have an approved publisher URL.'); return false; }
  const popup = window.open('about:blank', '_blank');
  if (!popup || popup.closed) return false;
  try {
    const doc = popup.document;
    doc.open();
    doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Night Arcade</title><style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090c14;color:#edf0f7;font:13px Arial,Helvetica,sans-serif}
      .bar{height:52px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid #333;background:#11151c}.name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:bold}.state{color:#b3bac8;font-size:11px}
      button,a{flex:none;padding:8px;border:1px solid #414a5b;border-radius:4px;background:#202633;color:inherit;text-decoration:none;font:12px Arial,Helvetica,sans-serif;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #81d9df;outline-offset:2px}
      iframe{width:100%;height:calc(100% - 52px);border:0;background:#11151c}.loading{position:absolute;inset:52px 0 0;display:grid;place-items:center;pointer-events:none;background:#11151c}body.loaded .loading{display:none}@media(max-width:640px){.state{display:none}.bar{gap:6px;padding:0 8px}button,a{font-size:11px;padding:8px 6px}}
    </style></head><body><header class="bar"><span class="name" id="name"></span><span class="state" id="state">Loading publisher game</span><a id="publisher" target="_blank" rel="noopener noreferrer" title="Play directly on the publisher's website">Publisher ↗</a><button id="fullscreen" type="button">Fullscreen</button><button id="return" type="button">Library</button></header><div class="loading">Loading publisher game...</div><iframe id="game" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"></iframe></body></html>`);
    doc.close();
    applyFullscreenStyles(doc);
    doc.title = `${game.title} - Night Arcade`;
    doc.getElementById('name').textContent = game.title;
    doc.getElementById('publisher').href = playUrl.href;
    const frame = doc.getElementById('game');
    const state = doc.getElementById('state');
    frame.title = game.title;
    // A cross-origin frame's load event cannot establish gameplay compatibility.
    frame.addEventListener('load', () => { doc.body.classList.add('loaded'); state.textContent = 'Publisher frame loaded'; });
    frame.src = playUrl.href;
    doc.getElementById('fullscreen').addEventListener('click', async () => {
      try { await frame.requestFullscreen(); }
      catch { state.textContent = 'Fullscreen unavailable; use Publisher'; }
    });
    doc.getElementById('return').addEventListener('click', () => popup.close());
    popup.opener = null;
    try { popup.focus(); } catch { /* Keeping the library focused must not cancel a launch. */ }
    return !popup.closed;
  } catch {
    try { popup.close(); } catch { /* The browser may already have closed it. */ }
    return false;
  }
}

function openAboutBlank(game) {
  if (game.launchMethod === 'about-blank-embed') return openPublisherBlank(game);
  const localPath = typeof game.localPath === 'string' && /^games\/[a-z0-9-]+\/index\.html$/.test(game.localPath) ? game.localPath : '';
  if (!localPath) { showToast('This game does not have a safe local launch path.'); return false; }
  const popup = window.open('about:blank', '_blank');
  if (!popup || popup.closed) return false;
  const playUrl = new URL(localPath, document.baseURI).href;
  const label = esc(game.title);
  try {
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} — Night Arcade</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090c14;color:#e9edf5;font:13px system-ui,sans-serif}.bar{height:42px;position:absolute;z-index:5;inset:0 0 auto;display:flex;align-items:center;gap:12px;padding:0 13px;background:#0c1019ee;border-bottom:1px solid #283143}.name{font-weight:650}.state{color:#92a0b5;font-size:11px}.grow{flex:1}.bar button,.bar a{padding:6px 10px;border:1px solid #394252;border-radius:4px;color:#e4e8f1;background:#171d2a;text-decoration:none;cursor:pointer;font:11px system-ui,sans-serif}.bar button:hover,.bar a:hover{border-color:#a994ff}.bar .back{background:#a994ff;color:#171322;border-color:#a994ff;font-weight:700}iframe{position:absolute;inset:42px 0 0;width:100%;height:calc(100% - 42px);border:0;background:#0d1019}.hint{position:absolute;z-index:4;inset:42px 0 0;display:grid;place-items:center;color:#abb5c5;background:#101520;pointer-events:none}body.loaded .hint{display:none}@media(max-width:520px){.bar{height:48px}.state{display:none}iframe{inset:48px 0 0;height:calc(100% - 48px)}}</style></head><body><header class="bar"><span class="name">${label}</span><span class="state" id="state">Opening your game…</span><span class="grow"></span><button id="fullscreen" type="button">Fullscreen</button><button class="back" id="return" type="button">Return to library</button></header><div class="hint" id="hint">Loading game…</div><iframe id="game" title="${label}" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen></iframe><script>const frame=document.getElementById('game'),status=document.getElementById('state');frame.addEventListener('load',()=>{document.body.classList.add('loaded');status.textContent='Game ready';});frame.src=${JSON.stringify(playUrl)};document.getElementById('fullscreen').addEventListener('click',async()=>{try{await frame.requestFullscreen();}catch{status.textContent='Fullscreen unavailable in this browser';}});document.getElementById('return').addEventListener('click',()=>window.close());setTimeout(()=>{if(!document.body.classList.contains('loaded')){status.textContent='Still loading — check your connection';}},10000);</script></body></html>`);
    popup.document.close();
    applyFullscreenStyles(popup.document);
    popup.opener = null;
  } catch {
    try { popup.close(); } catch { /* The browser may already have closed the popup. */ }
    return false;
  }
  try { popup.focus(); } catch { /* Browser may keep the library focused. */ }
  return !popup.closed;
}

function openCompatibilityNotice(game) {
  const source = safeHttpUrl(game.sourceUrl);
  const popup = window.open('about:blank', '_blank');
  if (!popup || popup.closed) { showToast('The new tab was blocked. Use the Official source link to play this game.'); return false; }
  const title = esc(game.title);
  const reason = esc(game.compatibilityNote || 'This local copy has not passed the current load and input checks.');
  const sourceLink = source ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Open the official publisher page to play</a>` : '';
  try {
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — compatibility</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090c14;color:#e9edf5;font:16px system-ui,sans-serif}.notice{max-width:640px;padding:36px;line-height:1.6}.badge{color:#ffcf89;font-size:12px;font-weight:700;letter-spacing:.12em}h1{font-size:32px;margin:.5em 0}a{color:#c5b6ff}.reason{color:#b8c1d0}.actions{display:flex;gap:18px;align-items:center;margin-top:26px}button{border:1px solid #596277;border-radius:5px;background:#171d2a;color:#fff;padding:10px 14px;cursor:pointer}</style></head><body><main class="notice"><div class="badge">ABOUT:BLANK INCOMPATIBLE</div><h1>${title}</h1><p class="reason">${reason}</p><div class="actions">${sourceLink}<button type="button" onclick="window.close()">Close tab</button></div></main></body></html>`);
    popup.document.close();
    popup.opener = null;
  } catch { try { popup.close(); } catch { /* Browser already closed it. */ } return false; }
  try { popup.focus(); } catch { /* Browser may keep the library focused. */ }
  return !popup.closed;
}

function launchGame(id) {
  const game = getById(id);
  if (!game) return;
  if (game.id === 'snow-rider-3d' && !hasBlankLaunch(game)) { showToast('Snow Rider needs an authorized HTML version before it can launch here.'); return; }
  const source = safeHttpUrl(game.sourceUrl);
  if (game.launchMethod === 'about-blank-html') {
    openHtmlBlank(game).then((opened) => { if (opened) { recordPlay(id); renderGrid(); } });
    return;
  }
  if (game.compatibility === 'incompatible') { openCompatibilityNotice(game); return; }
  if (hasBlankLaunch(game)) {
    if (openAboutBlank(game)) { recordPlay(id); renderGrid(); }
    else showToast('The new tab was blocked. Allow pop-ups, then retry the about:blank launch.');
    return;
  }
  if (!source) { showToast('No valid source URL is available for this game.'); return; }
  const popup = window.open(source, '_blank');
  if (popup && !popup.closed) { try { popup.opener = null; } catch { /* Cross-browser safety best effort. */ } recordPlay(id); renderGrid(); }
  else showToast('The new tab was blocked. Allow pop-ups, then retry the official game link.');
}

function scrollToLibrary() { $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function bindUi() {
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.view; activeCategory = ''; activeDevice = ''; renderCategories(); renderGrid(); $('#sidebar').classList.remove('open'); scrollToLibrary(); }));
  $('#search-input').addEventListener('input', (event) => { searchTerm = event.target.value.trim(); $('#clear-search').hidden = !event.target.value; renderGrid(); });
  $('#clear-search').addEventListener('click', () => { $('#search-input').value = ''; searchTerm = ''; $('#clear-search').hidden = true; renderGrid(); $('#search-input').focus(); });
  $('#sort-select').addEventListener('change', (event) => { sortMode = event.target.value; renderGrid(); });
  $('#clear-history').addEventListener('click', () => { try { localStorage.removeItem(STORE.recent); } catch { showToast('This browser does not allow clearing local history.'); return; } renderGrid(); showToast('Recently played history cleared'); });
  $('#inline-return').addEventListener('click', () => { $('#inline-frame').src = 'about:blank'; $('#inline-launcher').hidden = true; });
  $('#inline-fullscreen').addEventListener('click', async () => { try { await $('#inline-frame').requestFullscreen(); } catch { $('#inline-status').textContent = 'Fullscreen unavailable in this browser'; } });
  $('#reset-filters').addEventListener('click', () => { activeCategory = ''; activeDevice = ''; activeView = 'all'; searchTerm = ''; $('#search-input').value = ''; $('#clear-search').hidden = true; renderCategories(); renderGrid(); });
  $('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } if (event.key === 'Escape') $('#sidebar').classList.remove('open'); });
}

async function init() {
  bindUi();
  try {
    const response = await fetch('games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load catalog (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Game catalog must be a JSON array.');
    const ids = new Set();
    games = data.filter((game) => game && typeof game.id === 'string' && /^[a-z0-9-]+$/.test(game.id) && !ids.has(game.id) && (ids.add(game.id), true) && typeof game.title === 'string' && typeof game.description === 'string' && Array.isArray(game.categories));
    renderCategories(); updateNav(); renderGrid();
  } catch (error) {
    $('#game-grid').hidden = true; $('#empty-state').hidden = false;
    $('#empty-state h3').textContent = 'Could not load the game catalog';
    $('#empty-state p').textContent = `${error.message} Serve this folder over HTTP and check games.json.`;
  }
}
init();
