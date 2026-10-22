(() => {
  const frame = document.getElementById('game');
  if (!frame || window.nightArcadeSized) return;
  let source;
  try { source = new URL(frame.src); } catch { return; }
  if (!['y8.com', 'www.y8.com'].includes(source.hostname)) return;
  window.nightArcadeSized = true;
  const assetBase = document.currentScript.src;
  const stage = document.createElement('div');
  stage.id = 'night-arcade-stage';
  frame.before(stage);
  stage.append(frame);
  const style = document.createElement('style');
  style.textContent = `body{display:flex!important;flex-direction:column!important}body>header{flex:none}#night-arcade-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#000}#night-arcade-stage:fullscreen{width:100vw;height:100vh}#night-arcade-stage iframe{position:absolute!important;inset:auto!important;margin:0!important;border:0!important;max-width:none!important;max-height:none!important;transform-origin:0 0!important;display:block!important}`;
  document.head.append(style);
  let size;
  function fit() {
    if (!size) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / size.width, bounds.height / size.height);
    Object.assign(frame.style, {
      width: `${size.width}px`, height: `${size.height}px`,
      left: `${(bounds.width - size.width * scale) / 2}px`,
      top: `${(bounds.height - size.height * scale) / 2}px`,
      transform: `scale(${scale})`,
    });
    frame.style.setProperty('left', `${(bounds.width - size.width * scale) / 2}px`, 'important');
    frame.style.setProperty('top', `${(bounds.height - size.height * scale) / 2}px`, 'important');
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(stage);
  window.addEventListener?.('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  // Fullscreen the fitted stage, not the publisher's fixed-size iframe.
  document.addEventListener('click', async event => {
    if (!event.target.closest('#fullscreen')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.NightArcadePlayer) {
      await window.NightArcadePlayer.requestFullscreen(stage, message => {
        const status = document.getElementById('status');
        if (status) { status.textContent = message; status.title = message; }
      });
      return;
    }
    try { await stage.requestFullscreen(); }
    catch { document.getElementById('status').textContent = 'Fullscreen unavailable'; }
  }, true);
  fetch(new URL('embed-sizes.json', assetBase)).then(response => {
    if (!response.ok) throw new Error('Missing publisher dimensions');
    return response.json();
  }).then(sizes => {
    size = sizes[source.pathname];
    if (!size) throw new Error('Publisher dimensions unavailable');
    fit();
  }).catch(() => {
    document.getElementById('status').textContent = 'Game sizing unavailable';
  });
})();
