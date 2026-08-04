// Turns YouTube embeds into clean, chrome-less looping videos.
// The iframe ignores the mouse (no hover UI, no click-to-pause); a small
// overlay button is the only control and toggles sound via the IFrame API.
(function () {
  function place(btn, f) {
    btn.style.left = (f.offsetLeft + f.offsetWidth - 52) + 'px';
    btn.style.top = (f.offsetTop + f.offsetHeight - 52) + 'px';
  }

  function enhance(f) {
    if (f.dataset.ytClean) return;
    if (!f.offsetWidth) return; // not laid out yet, retry next tick
    f.dataset.ytClean = '1';
    f.style.pointerEvents = 'none';

    var wrap = f.parentElement;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var btn = document.createElement('button');
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
    place(btn, f);
    f._ytBtn = btn;
  }

  setInterval(function () {
    document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(function (f) {
      enhance(f);
      if (f._ytBtn) place(f._ytBtn, f); // keep the button pinned through resizes
    });
  }, 700);
})();
