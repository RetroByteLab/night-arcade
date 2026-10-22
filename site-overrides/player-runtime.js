(() => {
  const labels = {
    untested: 'Untested',
    loaded: 'Player loaded; gameplay unverified',
    initialized: 'Runtime initialized; gameplay unverified',
    playable: 'Confirmed playable',
    failed: 'Failed',
  };

  async function requestFullscreen(target, report) {
    if (!target) { report('Fullscreen target is unavailable.'); return false; }
    const doc = target.ownerDocument || document;
    if ((doc.fullscreenEnabled === false && doc.webkitFullscreenEnabled !== true) || (doc.fullscreenEnabled == null && doc.webkitFullscreenEnabled === false)) {
      report('Fullscreen is unavailable in this frame or browser. Managed settings may restrict it.');
      return false;
    }
    const request = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!request) { report('This browser does not support fullscreen for this player.'); return false; }
    try { await request.call(target); return true; }
    catch { report('Fullscreen was not permitted. Continue in the current player or use its ordinary page.'); return false; }
  }

  window.NightArcadePlayer = {labels, requestFullscreen};
  const frame = document.querySelector('iframe#game');
  let stage = document.getElementById('stage') || document.getElementById('night-arcade-stage');
  if (window.nightArcadeRuntime || (!frame && !stage) || !document.getElementById('fullscreen')) return;
  window.nightArcadeRuntime = true;
  if (frame && !stage) {
    stage = document.createElement('main');
    stage.id = 'stage';
    frame.before(stage);
    stage.append(frame);
  }
  const style = document.createElement('style');
  style.textContent = 'html,body{height:100%;margin:0}body{display:flex!important;flex-direction:column!important}body>header{position:relative!important;inset:auto!important;height:auto!important;min-height:44px;flex:none;flex-wrap:wrap}#status,#state{display:block!important;flex:1 0 100%;order:5;max-width:100%;font-size:11px;line-height:1.4;overflow-wrap:anywhere;padding-bottom:6px}#stage{position:relative;flex:1;min-height:0;overflow:hidden}#stage:fullscreen{width:100vw;height:100vh}#stage>iframe{position:relative!important;inset:auto!important;margin:0!important;width:100%!important;height:100%!important;border:0}';
  document.head.append(style);
  let status = document.getElementById('status') || document.getElementById('state');
  if (!status) {
    status = document.createElement('span');
    status.id = 'status';
    document.querySelector('header')?.append(status);
  }
  status?.setAttribute('role', 'status');
  let state = 'untested';
  let timer;
  const setState = (next, detail = '') => {
    if (state === 'failed' && next !== 'failed') return;
    state = next;
    document.body.dataset.playerState = next;
    if (status) {
      status.textContent = detail || labels[next];
      status.title = status.textContent;
    }
  };
  const loaded = () => {
    clearTimeout(timer);
    if (state !== 'initialized' && state !== 'playable') setState('loaded');
  };
  frame?.addEventListener('load', loaded);
  frame?.addEventListener('error', () => setState('failed', 'The game frame could not be loaded. Its publisher or browser policy may be unavailable.'));
  window.addEventListener('load', loaded, {once: true});
  if (document.readyState === 'complete') loaded();
  window.addEventListener('night-arcade:runtime-initialized', () => {
    if (!frame) setState('initialized');
  });
  window.addEventListener('error', event => {
    if (event.target === window && event.message && event.message !== 'Script error.') {
      setState('failed', 'Player error: ' + event.message);
    } else if (event.target?.tagName === 'SCRIPT' || event.target?.tagName === 'LINK') {
      setState('failed', 'A required player resource could not be loaded.');
    }
  }, true);
  window.addEventListener('unhandledrejection', () => setState('failed', 'The player reported an initialization error.'));
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#fullscreen')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = document.getElementById('night-arcade-stage') || stage || frame;
    requestFullscreen(target, message => {
      if (status) { status.textContent = message; status.title = message; }
    });
  }, true);
  timer = setTimeout(() => {
    if (state === 'untested' && status) {
      status.textContent = 'Still loading. Check the connection or ask your administrator about blocked resources.';
      status.title = status.textContent;
    }
  }, 25000);
  window.addEventListener('pagehide', () => clearTimeout(timer), {once: true});
})();
