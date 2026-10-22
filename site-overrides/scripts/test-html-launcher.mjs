import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const launcher = source.slice(source.indexOf('const FULLSCREEN_FRAME_CSS'), source.indexOf('\nfunction openPublisherBlank('));
const htmlLoader = source.slice(source.indexOf('async function fetchPlayerHtml('), source.indexOf('\nfunction openInlineLauncher('));

function setup({blocked = false, status = 200, closedAfterFetch = false, openThrows = false, body = '<html><head></head><body>game</body></html>', fetchThrows = null} = {}) {
  const events = [];
  let base;
  let styles = '';
  const popup = {closed: false, opener: {}, focus() {}, document: {
    createElement() {return {};},
    body: {style:{}, append(script) {events.push(['bootstrap',script.textContent]);vm.runInNewContext(script.textContent,{document:popup.document});}}, open() {events.push('document.open');},
    write(value) {events.push(['write', value]);}, close() {events.push('document.close');},
  }};
  const context = {URL, AbortController, setTimeout, clearTimeout, document: {baseURI: 'https://arcade.example/library/'},
    window: {open(url, target) {events.push(['open', url, target]); if (openThrows) throw new Error('Blocked by sandbox'); return blocked ? null : popup;}},
    showToast(message) {events.push(['toast', message]);},
    showLaunchOptions(game, message) {events.push(['options', game.localPath, message]);},
    async fetch(url) {
      events.push(['fetch', url.href]);
      if (fetchThrows) { const error = new Error(fetchThrows); error.name = fetchThrows; throw error; }
      if (closedAfterFetch) popup.closed = true;
      return {ok: status === 200, status, async text() {return body;}};
    },
    DOMParser: class {parseFromString() {return {
      querySelectorAll() {return [];},
      createElement() {return {};}, head: {prepend(node) {base = node.href;}, append(node) {styles += node.textContent || (node.src ? `<script defer src="${node.src}"></script>` : '');}},
      documentElement: {get outerHTML() {return `<html><head><base href="${base}"><style>${styles}</style></head><body>game</body></html>`;}},
    };}},
  };
  vm.createContext(context);
  vm.runInContext(htmlLoader + launcher, context);
  return {run: context.openHtmlBlank, events, popup};
}

test('opens about:blank before fetching and writes HTML with asset base', async () => {
  const {run, events, popup} = setup();
  const pending = run({localPath: 'games/example/index.html'});
  assert.deepEqual(events[0], ['open', 'about:blank', '_blank']);
  assert.equal(await pending, true);
  assert.ok(events.some(e => Array.isArray(e) && e[0] === 'fetch' && e[1] === 'https://arcade.example/library/games/example/index.html'));
  assert.ok(events.some(e => Array.isArray(e) && e[0] === 'write' && e[1].includes('<base href="https://arcade.example/library/games/example/index.html">')));
  assert.equal(popup.opener, null);
});

test('writes the document from a popup-owned script instead of the opener realm', async () => {
  const {run,events}=setup();
  assert.equal(await run({localPath:'games/example/index.html'}),true);
  const bootstrap=events.find(e=>Array.isArray(e)&&e[0]==='bootstrap');
  assert.match(bootstrap[1],/^document\.open\(\);document\.write\(/);
  assert.equal(events.filter(e=>Array.isArray(e)&&e[0]==='write').length,1);
  const activeLaunchers=source.slice(source.indexOf('async function openHtmlBlank('),source.indexOf('function openCompatibilityNotice('));
  assert.ok(!activeLaunchers.includes('popup.document.open('));
  assert.ok(!activeLaunchers.includes('doc.open('));
});

test('rejects unsafe or absent paths without opening a tab', async () => {
  for (const localPath of ['../game.html', 'https://other.example/game', 'games/../index.html', '']) {
    const {run, events} = setup();
    assert.equal(await run({localPath}), false);
    assert.ok(!events.some(e => Array.isArray(e) && e[0] === 'open'));
  }
});

test('HTML blank launch overrides toolbar offsets during fullscreen', async () => {
  const {run, events} = setup();
  assert.equal(await run({localPath: 'games/example/index.html'}), true);
  const html = events.filter(e => Array.isArray(e) && e[0] === 'write').at(-1)[1];
  assert.match(html, /iframe:fullscreen\{position:fixed!important;inset:0!important/);
  assert.match(html, /width:100vw!important;height:100vh!important/);
  assert.match(html, /iframe:-webkit-full-screen/);
  assert.match(html, /transform:none!important/);
  assert.match(html, /script defer src="https:\/\/arcade.example\/library\/embed-player.js/);
});

test('publisher sizing centers fixed game content through resize and fullscreen', async () => {
  let bounds = {width: 1280, height: 676};
  let resize, click, fullscreens = 0;
  const frame = {src: 'https://y8.com/embed/slope', style: {setProperty(k,v) {this[k]=v;}}, before() {}};
  const stage = {append() {}, getBoundingClientRect: () => bounds, async requestFullscreen() {fullscreens++;}};
  const context = {URL, window: {}, fetch: async () => ({ok:true, json:async () => ({'/embed/slope':{width:960,height:641}})}),
    ResizeObserver: class {constructor(fn) {resize=fn;} observe() {}},
    document: {currentScript: {src:'https://arcade.example/embed-player.js'}, head:{append() {}},
      getElementById: () => frame, createElement: tag => tag === 'div' ? stage : {},
      addEventListener(type, fn) {if(type==='click') click=fn;}}};
  vm.runInNewContext(readFileSync(new URL('../embed-player.js', import.meta.url), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  for (const viewport of [{width:1280,height:676},{width:1440,height:900},{width:390,height:800}]) {
    bounds=viewport; resize();
    const scale=Number(frame.style.transform.match(/scale\((.*)\)/)[1]);
    const width=960*scale, height=641*scale;
    assert.ok(width<=bounds.width+0.001 && height<=bounds.height+0.001);
    assert.ok(Math.abs(parseFloat(frame.style.left)*2+width-bounds.width)<0.001);
    assert.ok(Math.abs(parseFloat(frame.style.top)*2+height-bounds.height)<0.001);
  }
  let stopped=false;
  await click({target:{closest:()=>true},preventDefault(){},stopImmediatePropagation(){stopped=true;}});
  assert.equal(fullscreens,1); assert.equal(stopped,true);
});

test('blocked popup offers explicit inline/direct options without fetching or opening more tabs', async () => {
  const {run, events} = setup({blocked: true});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
  assert.equal(events.filter(e => Array.isArray(e) && e[0] === 'open').length, 1);
  assert.ok(!events.some(e => Array.isArray(e) && e[0] === 'fetch'));
  assert.ok(events.some(e => Array.isArray(e) && e[0] === 'options'));
});

test('failed HTML fetch stays in blank tab and displays the failure', async () => {
  const {run, events, popup} = setup({status: 404});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
  assert.match(popup.document.body.textContent, /404/);
  assert.equal(events.filter(e => Array.isArray(e) && e[0] === 'open').length, 1);
});

test('closing the popup while loading does not record success', async () => {
  const {run} = setup({closedAfterFetch: true});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
});

test('a sandbox exception offers recovery instead of becoming an unhandled launch rejection', async () => {
  const {run, events} = setup({openThrows: true});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
  assert.equal(events.filter(e => Array.isArray(e) && e[0] === 'open').length, 1);
  assert.ok(events.some(e => Array.isArray(e) && e[0] === 'options'));
});

test('non-HTML responses do not get executed as player documents', async () => {
  const {run, events} = setup({body: '{"blocked":true}'});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
  assert.ok(!events.some(e => Array.isArray(e) && e[0] === 'write'));
});

test('aborted or timed-out fetches explain the failure without retrying popups', async () => {
  const {run, events, popup} = setup({fetchThrows: 'AbortError'});
  assert.equal(await run({localPath: 'games/example/index.html'}), false);
  assert.match(popup.document.body.textContent, /timed out/);
  assert.equal(events.filter(e => Array.isArray(e) && e[0] === 'open').length, 1);
});

test('main library includes selected official alternatives without making them blank launches', () => {
  const snow = {id: 'snow-rider-3d', title: 'Snow Rider 3D', launchMethod: 'external', libraryVisible: true, featuredRank: -2};
  const context = {games: [snow, {id: 'other', title: 'Other', launchMethod: 'external'}, {id: 'slope', title: 'Slope', launchMethod: 'about-blank-html'}], activeView: 'blank', activeCategory: '', activeDevice: '', searchTerm: '', sortMode: 'featured'};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function hasBlankLaunch('), source.indexOf('function playButtonText(')) + source.slice(source.indexOf('function getVisibleGames('), source.indexOf('function renderGrid(')), context);
  assert.deepEqual(Array.from(context.getVisibleGames(), game => game.id), ['snow-rider-3d', 'slope']);
  assert.equal(context.hasBlankLaunch(snow), false);
});

test('Snow Rider is unavailable rather than silently using an external Play action', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function hasBlankLaunch('), source.indexOf('function getFavorites(')), context);
  assert.equal(context.playButtonText({id: 'snow-rider-3d', launchMethod: 'external'}), 'Unavailable');
});

test('Snow Rider uses the supplied Miniplay embed without claiming tested gameplay', () => {
  const catalog = JSON.parse(readFileSync(new URL('../games.json', import.meta.url), 'utf8'));
  const snow = catalog.find(game => game.id === 'snow-rider-3d');
  assert.equal(snow.launchMethod, 'about-blank-html');
  assert.equal(snow.compatibility, 'untested');
  assert.equal(snow.localPath, 'games/snow-rider-miniplay/index.html');
  const html = readFileSync(new URL('../' + snow.localPath, import.meta.url), 'utf8');
  assert.ok(html.includes('src="https://www.miniplay.com/embed/snow-rider-3d"'));
  assert.ok(html.includes("getElementById('stage').requestFullscreen()"));
  assert.ok(!html.includes('cdn.jsdelivr.net'));
  assert.ok(!html.includes('gd_sdk_referrer_url'));
});

test('featured spotlight is absent from the page and initialization', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('id="featured-section"'));
  assert.ok(!html.includes('data-view="featured"'));
  assert.ok(!source.includes('renderFeature('));
});

test('default sorting is A-Z and the selector matches it', () => {
  assert.match(source, /let sortMode = 'az'/);
  assert.match(source, /\$\('#sort-select'\)\.value = sortMode/);
  const context = {games:[{id:'z',title:'Zebra',launchMethod:'about-blank-html'},{id:'a',title:'Apple',launchMethod:'about-blank-html'}],activeView:'blank',activeCategory:'',activeDevice:'',searchTerm:'',sortMode:'az'};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function hasBlankLaunch('),source.indexOf('function playButtonText('))+source.slice(source.indexOf('function getVisibleGames('),source.indexOf('function renderGrid(')),context);
  assert.deepEqual(Array.from(context.getVisibleGames(),g=>g.title),['Apple','Zebra']);
});

test('new originals have local blank launch paths and honest test status', () => {
  const catalog=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  const games=catalog.filter(g=>g.id.startsWith('flipline-') || ['classic-basket-random','soccer-random'].includes(g.id));
  assert.equal(games.length,16);
  for(const game of games){
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    const html=readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8');
    assert.ok(html.includes('Fullscreen'));
    assert.ok(!html.includes('{{TITLE}}'));
  }
  const manifest=JSON.parse(readFileSync(new URL('../catalog-sources/flipline.json',import.meta.url),'utf8'));
  assert.equal(manifest.games.length,14);
  for(const record of manifest.games) assert.match(record.sha256,/^[a-f0-9]{64}$/);
});

test('six requested publisher entries keep sources, safe paths, and honest compatibility',()=>{
  const records=JSON.parse(readFileSync(new URL('../catalog-sources/requested-publishers.json',import.meta.url),'utf8'));
  const games=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  assert.equal(records.length,6);
  for(const record of records){
    const game=games.find(g=>g.id===record.catalogId);
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    assert.match(game.localPath,/^games\/tpg-[a-z0-9-]+\/index\.html$/);
    assert.equal(new URL(record.embedUrl).hostname,'www.twoplayergames.org');
    const html=readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8');
    assert.ok(html.includes(record.embedUrl));
    assert.ok(html.includes("getElementById('stage').requestFullscreen()"));
    assert.ok(!html.includes('{{'));
  }
});

test('additional publisher batch has ten unique local players and recorded embed permission',()=>{
  const records=JSON.parse(readFileSync(new URL('../catalog-sources/more-publishers.json',import.meta.url),'utf8'));
  const catalog=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  assert.equal(records.length,10);
  assert.equal(new Set(catalog.map(g=>g.id)).size,catalog.length);
  for(const record of records){
    const game=catalog.find(g=>g.id===record.catalogId);
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    assert.match(record.pageSha256,/^[a-f0-9]{64}$/);
    const html=readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8');
    assert.ok(html.includes(record.embedUrl));
    assert.ok(html.includes('allowfullscreen'));
    assert.ok(html.includes("getElementById('stage').requestFullscreen()"));
  }
});

test('large batch adds forty unique publisher embed players without upgrading compatibility claims',()=>{
  const records=JSON.parse(readFileSync(new URL('../catalog-sources/large-publishers.json',import.meta.url),'utf8'));
  const catalog=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  assert.equal(records.length,40);
  assert.equal(new Set(records.map(g=>g.catalogId)).size,40);
  assert.equal(new Set(catalog.map(g=>g.id)).size,catalog.length);
  for(const record of records){
    const game=catalog.find(g=>g.id===record.catalogId);
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    assert.equal(record.embedHttpResponse,200);
    assert.match(record.pageSha256,/^[a-f0-9]{64}$/);
    assert.match(record.embedPageSha256,/^[a-f0-9]{64}$/);
    const html=readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8');
    assert.ok(html.includes(record.embedUrl));
    assert.ok(html.includes('allowfullscreen'));
    assert.ok(html.includes("getElementById('stage').requestFullscreen()"));
    assert.ok(!html.includes('gd_sdk_referrer_url'));
    assert.ok(!html.includes('{{'));
  }
});

test('recognizable classics batch adds twenty distinct publisher players with honest test status',()=>{
  const records=JSON.parse(readFileSync(new URL('../catalog-sources/popular-publishers.json',import.meta.url),'utf8'));
  const earlier=JSON.parse(readFileSync(new URL('../catalog-sources/large-publishers.json',import.meta.url),'utf8'));
  const catalog=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  assert.equal(records.length,20);
  assert.equal(new Set([...earlier,...records].map(g=>g.catalogId)).size,60);
  assert.equal(new Set(catalog.map(g=>g.id)).size,catalog.length);
  for(const record of records){
    const game=catalog.find(g=>g.id===record.catalogId);
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    assert.equal(record.embedHttpResponse,200);
    assert.match(record.pageSha256,/^[a-f0-9]{64}$/);
    const html=readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8');
    assert.ok(html.includes(record.embedUrl));
    assert.ok(html.includes('allowfullscreen'));
  }
});

test('recognizable Miniplay games preserve fan-game identity and embed-only permissions',()=>{
  const records=JSON.parse(readFileSync(new URL('../catalog-sources/recognizable-miniplay.json',import.meta.url),'utf8'));
  const catalog=JSON.parse(readFileSync(new URL('../games.json',import.meta.url),'utf8'));
  assert.equal(records.length,3);
  for(const record of records){
    const game=catalog.find(g=>g.id===record.catalogId);
    assert.equal(game.launchMethod,'about-blank-html');
    assert.equal(game.compatibility,'untested');
    assert.equal(new URL(record.embedUrl).hostname,'www.miniplay.com');
    assert.ok(readFileSync(new URL('../'+game.localPath,import.meta.url),'utf8').includes(record.embedUrl));
    if(game.id!=='miniplay-friday-night-funkin'){
      assert.ok(game.title.includes('(Fan Game)'));
      assert.ok(game.warnings.length>0);
    }
  }
});
