import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../player-runtime.js', import.meta.url), 'utf8');

function runtime({withFrame = true, boot = true} = {}) {
  const windowEvents = {}, frameEvents = {}, documentEvents = {};
  const status = {textContent: '', setAttribute() {}};
  const frame = {addEventListener(name, fn) {frameEvents[name] = fn;}};
  const document = {
    readyState: 'loading', body: {dataset: {}}, head: {append() {}}, createElement() {return {};},
    querySelector(selector) {return boot && withFrame && selector === 'iframe#game' ? frame : null;},
    getElementById(id) {return boot ? id === 'status' ? status : id === 'stage' || id === 'fullscreen' ? {} : null : null;},
    addEventListener(name, fn) {documentEvents[name] = fn;},
  };
  let timeout;
  const window = {addEventListener(name, fn) {windowEvents[name] = fn;}};
  vm.runInNewContext(source, {window, document, setTimeout(fn) {timeout = fn; return 1;}, clearTimeout() {}});
  return {api: window.NightArcadePlayer, window, windowEvents, frameEvents, documentEvents, document, status, timeout: () => timeout?.()};
}

test('fullscreen permission denial is explained without calling a fullscreen API', async () => {
  const {api} = runtime({boot: false});
  let calls = 0, message;
  assert.equal(await api.requestFullscreen({ownerDocument: {fullscreenEnabled: false}, requestFullscreen() {calls++;}}, value => {message = value;}), false);
  assert.equal(calls, 0);
  assert.match(message, /unavailable|restrict/);
});

test('fullscreen handles supported, unsupported, rejected and Safari-prefixed requests', async () => {
  const {api} = runtime({boot: false});
  assert.equal(await api.requestFullscreen({ownerDocument: {fullscreenEnabled: true}, async requestFullscreen() {}}, () => {}), true);
  assert.equal(await api.requestFullscreen({ownerDocument: {}, async webkitRequestFullscreen() {}}, () => {}), true);
  for (const target of [null, {}, {ownerDocument: {}, async requestFullscreen() {throw new Error('denied');}}]) {
    let message;
    assert.equal(await api.requestFullscreen(target, value => {message = value;}), false);
    assert.ok(message);
  }
});

test('iframe load is only loaded, never initialized or confirmed playable', () => {
  const r = runtime();
  r.frameEvents.load();
  assert.equal(r.document.body.dataset.playerState, 'loaded');
  assert.match(r.status.textContent, /gameplay unverified/);
  r.windowEvents['night-arcade:runtime-initialized']();
  assert.equal(r.document.body.dataset.playerState, 'loaded');
});

test('explicit Ruffle initialization is distinct from gameplay confirmation', () => {
  const r = runtime({withFrame: false});
  r.windowEvents['night-arcade:runtime-initialized']();
  assert.equal(r.document.body.dataset.playerState, 'initialized');
  assert.match(r.status.textContent, /gameplay unverified/);
});

test('fatal player errors persist across subsequent load events', () => {
  const r = runtime();
  r.windowEvents.error({target: r.window, message: 'Missing engine'});
  r.frameEvents.load();
  assert.equal(r.document.body.dataset.playerState, 'failed');
  assert.match(r.status.textContent, /Missing engine/);
});

test('slow cross-origin games stay unverified rather than being falsely failed', () => {
  const r = runtime();
  r.timeout();
  assert.match(r.status.textContent, /Still loading/);
  assert.notEqual(r.document.body.dataset.playerState, 'failed');
});

test('all catalog entries remain present and audited, and no gameplay passes are invented', () => {
  const games = JSON.parse(readFileSync(new URL('../games.json', import.meta.url), 'utf8'));
  const report = JSON.parse(readFileSync(new URL('../game-health.json', import.meta.url), 'utf8'));
  assert.equal(games.length, 405);
  assert.equal(games.filter(g => g.launchMethod.startsWith('about-blank')).length, 265);
  assert.deepEqual(games.map(g => g.id).sort(), report.gameIds);
  assert.ok(Object.values(report.games).every(g => g.state === 'untested'));
  assert.ok(Object.values(report.games).every(g => !g.issues.some(issue => issue.severity === 'error')));
});

test('Cimulity entry, fallback pages and chunks consistently retain the Pages prefix', () => {
  for (const file of ['index.html', '404.html', '_not-found.html', '_next/static/chunks/turbopack-fe09bce983acb009.js', '_next/static/chunks/e46c7d273755a5d4.js', '_next/static/chunks/14d04adcb102ad5f.js']) {
    const text = readFileSync(new URL('../games/cimulity/' + file, import.meta.url), 'utf8');
    assert.ok(!/(?<!\/night-arcade)\/games\/cimulity/.test(text));
    assert.ok(text.includes('/night-arcade/games/cimulity'));
  }
});

test('popup recovery exposes ordinary explicit choices and no automatic retry', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const choice = app.slice(app.indexOf('function showLaunchOptions('), app.indexOf('async function fetchPlayerHtml('));
  assert.ok(!choice.includes('window.open('));
  assert.ok(choice.includes("$('#launch-inline').hidden = !localPath"));
  assert.ok(app.includes('game && openInlineLauncher(game)'));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['launch-options', 'launch-inline', 'launch-direct', 'launch-cancel']) assert.ok(html.includes('id="' + id + '"'));
});
