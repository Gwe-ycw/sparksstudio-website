// Turns YouTube embeds into clean, chrome-less looping videos.
// - The iframe ignores the mouse (no hover UI, no click-to-pause).
// - A dark cover hides the player until it is actually playing AND
//   YouTube's title/logo overlay has faded (~3.5s), so no YouTube
//   branding is ever visible in any state (loading, paused, blocked).
// - A small overlay button is the only control and toggles sound.
(function () {
  var FADE_AT = 3.4; // seconds of playback after which YT's overlay is gone

  var css = document.createElement('style');
  css.textContent = '@keyframes ytcPulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}';
  document.head.appendChild(css);

  function pin(el, f) {
    el.style.left = el._ytCorner ? (f.offsetLeft + f.offsetWidth - 52) + 'px' : f.offsetLeft + 'px';
    el.style.top = el._ytCorner ? (f.offsetTop + f.offsetHeight - 52) + 'px' : f.offsetTop + 'px';
    if (!el._ytCorner) { el.style.width = f.offsetWidth + 'px'; el.style.height = f.offsetHeight + 'px'; }
  }

  function enhance(f) {
    if (f.dataset.ytClean) return;
    if (!f.offsetWidth) return; // not laid out yet, retry next tick
    f.dataset.ytClean = '1';
    f.style.pointerEvents = 'none';

    var wrap = f.parentElement;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var cover = document.createElement('div');
    cover.style.cssText = 'position:absolute;z-index:4;background:#001524;display:flex;align-items:center;justify-content:center;transition:opacity 1s ease;pointer-events:none;border-radius:3px';
    cover.innerHTML = '<span style="width:10px;height:10px;border-radius:999px;background:#F2FF49;animation:ytcPulse 1.6s ease-in-out infinite"></span>';
    wrap.appendChild(cover);

    var btn = document.createElement('button');
    btn._ytCorner = true;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Activer le son');
    btn.innerHTML = '&#128263;';
    btn.style.cssText = 'position:absolute;z-index:5;width:40px;height:40px;padding:0;border-radius:999px;border:1px solid rgba(236,233,226,0.35);background:rgba(0,21,36,0.72);color:#ece9e2;font-size:16px;line-height:1;cursor:pointer;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:border-color 0.3s';
    btn.onmouseenter = function () { btn.style.borderColor = '#F2FF49'; };
    btn.onmouseleave = function () { btn.style.borderColor = 'rgba(236,233,226,0.35)'; };

    var muted = true;
    btn.onclick = function () {
      muted = !muted;
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*');
      btn.innerHTML = muted ? '&#128263;' : '&#128266;';
      btn.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
    };
    wrap.appendChild(btn);

    f._ytc = { cover: cover, btn: btn, got: false, revealed: false };
    pin(cover, f); pin(btn, f);

    // If the player API never talks to us (blocked, very old cache), drop
    // the cover after 10s rather than hiding the video forever.
    setTimeout(function () { if (!f._ytc.got) show(f, true); }, 10000);
  }

  function show(f, visible) {
    f._ytc.revealed = visible;
    f._ytc.cover.style.opacity = visible ? '0' : '1';
  }

  window.addEventListener('message', function (e) {
    var d; try { d = JSON.parse(e.data); } catch (_) { return; }
    if (!d || !d.info) return;
    document.querySelectorAll('iframe[data-yt-clean]').forEach(function (f) {
      if (f.contentWindow !== e.source) return;
      f._ytc.got = true;
      var st = d.info.playerState, t = d.info.currentTime || 0;
      if (!f._ytc.revealed && st === 1 && t > FADE_AT) show(f, true);   // playing, overlay gone
      if (f._ytc.revealed && (st === 2 || st === -1 || st === 5)) show(f, false); // paused → hide YT UI again
    });
  });

  setInterval(function () {
    document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(function (f) {
      enhance(f);
      if (f._ytc) {
        pin(f._ytc.cover, f); pin(f._ytc.btn, f); // keep pinned through resizes
        // handshake so the player starts streaming state updates
        if (!f._ytc.got) f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      }
    });
  }, 700);
})();
