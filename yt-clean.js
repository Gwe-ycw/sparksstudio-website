// Clean, chrome-less YouTube embeds with a graceful fallback.
// Each embed is covered by a facade (video thumbnail + play pill, no YouTube
// branding). If autoplay works, the facade fades out once the player is
// running and YouTube's title overlay has faded; if autoplay is blocked,
// the facade stays as an elegant click-to-play poster (click = play + sound).
(function () {
  var AUTO_FADE_AT = 3.3;   // s of playback before YT's overlay is gone
  var CLICK_FADE_AT = 0.4;  // after an explicit click, reveal almost at once

  var css = document.createElement('style');
  css.textContent = '@keyframes ytcPulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}';
  document.head.appendChild(css);

  function pin(el, f) {
    el.style.left = el._ytCorner ? (f.offsetLeft + f.offsetWidth - 52) + 'px' : f.offsetLeft + 'px';
    el.style.top = el._ytCorner ? (f.offsetTop + f.offsetHeight - 52) + 'px' : f.offsetTop + 'px';
    if (!el._ytCorner) { el.style.width = f.offsetWidth + 'px'; el.style.height = f.offsetHeight + 'px'; }
  }

  function post(f, func) {
    f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
  }

  function setMuted(f, m) {
    var s = f._ytc;
    s.muted = m;
    post(f, m ? 'mute' : 'unMute');
    s.btn.innerHTML = m ? '&#128263;' : '&#128266;';
    s.btn.setAttribute('aria-label', m ? 'Activer le son' : 'Couper le son');
  }

  function reveal(f, on) {
    var s = f._ytc;
    s.revealed = on;
    s.cover.style.opacity = on ? '0' : '1';
    s.cover.style.pointerEvents = on ? 'none' : 'auto';
  }

  function enhance(f) {
    if (f.dataset.ytClean) return;
    if (!f.offsetWidth) return; // not laid out yet, retry next tick
    f.dataset.ytClean = '1';
    f.style.pointerEvents = 'none';

    var wrap = f.parentElement;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var id = (f.src.match(/embed\/([A-Za-z0-9_-]+)/) || [])[1];
    var vertical = f.offsetHeight > f.offsetWidth;

    var cover = document.createElement('div');
    cover.style.cssText = 'position:absolute;z-index:4;background:#001524;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity 0.9s ease;border-radius:3px';
    cover.setAttribute('role', 'button');
    cover.setAttribute('aria-label', 'Lire la vidéo');
    // Thumbnail straight from YouTube's image CDN — no branding on these.
    // Vertical videos get the plain dark facade (16:9 thumbs crop too hard).
    if (id && !vertical) {
      var img = document.createElement('img');
      img.alt = '';
      img.src = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
      img.onerror = function () { img.onerror = null; img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; };
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      cover.appendChild(img);
      var tint = document.createElement('div');
      tint.style.cssText = 'position:absolute;inset:0;background:rgba(0,21,36,0.35)';
      cover.appendChild(tint);
    }
    var pill = document.createElement('span');
    pill.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3.2v11.6L15 9z" fill="#F2FF49"/></svg>';
    pill.style.cssText = 'position:relative;z-index:1;width:64px;height:64px;border-radius:999px;border:1px solid rgba(236,233,226,0.4);background:rgba(0,21,36,0.72);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:border-color 0.3s,transform 0.3s';
    cover.appendChild(pill);
    cover.onmouseenter = function () { pill.style.borderColor = '#F2FF49'; pill.style.transform = 'scale(1.06)'; };
    cover.onmouseleave = function () { pill.style.borderColor = 'rgba(236,233,226,0.4)'; pill.style.transform = 'none'; };
    wrap.appendChild(cover);

    var btn = document.createElement('button');
    btn._ytCorner = true;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Activer le son');
    btn.innerHTML = '&#128263;';
    btn.style.cssText = 'position:absolute;z-index:5;width:40px;height:40px;padding:0;border-radius:999px;border:1px solid rgba(236,233,226,0.35);background:rgba(0,21,36,0.72);color:#ece9e2;font-size:16px;line-height:1;cursor:pointer;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:border-color 0.3s';
    btn.onmouseenter = function () { btn.style.borderColor = '#F2FF49'; };
    btn.onmouseleave = function () { btn.style.borderColor = 'rgba(236,233,226,0.35)'; };
    wrap.appendChild(btn);

    f._ytc = { cover: cover, btn: btn, pill: pill, got: false, revealed: false, muted: true, manual: false, state: -1 };

    btn.onclick = function () { setMuted(f, !f._ytc.muted); };

    cover.onclick = function () {
      var s = f._ytc;
      s.manual = true;
      // Explicit gesture: start the video with sound. If the browser still
      // refuses unmuted playback, retry muted so the video plays regardless.
      setMuted(f, false);
      post(f, 'playVideo');
      setTimeout(function () {
        if (s.state !== 1 && s.state !== 3) { setMuted(f, true); post(f, 'playVideo'); }
      }, 1500);
    };

    pin(cover, f); pin(btn, f);

    // If the player API never talks to us at all, drop the facade after 10s
    // rather than hiding the video forever.
    setTimeout(function () { if (!f._ytc.got) reveal(f, true); }, 10000);
  }

  window.addEventListener('message', function (e) {
    var d; try { d = JSON.parse(e.data); } catch (_) { return; }
    if (!d || !d.info) return;
    document.querySelectorAll('iframe[data-yt-clean]').forEach(function (f) {
      if (f.contentWindow !== e.source) return;
      var s = f._ytc;
      s.got = true;
      if (d.info.playerState !== undefined) s.state = d.info.playerState;
      var t = d.info.currentTime || 0;
      var fadeAt = s.manual ? CLICK_FADE_AT : AUTO_FADE_AT;
      if (!s.revealed && s.state === 1 && t > fadeAt) reveal(f, true);
      if (s.revealed && (s.state === 2 || s.state === -1 || s.state === 5)) reveal(f, false);
    });
  });

  setInterval(function () {
    document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(function (f) {
      enhance(f);
      if (f._ytc) {
        pin(f._ytc.cover, f); pin(f._ytc.btn, f); // keep pinned through resizes
        // handshake so the player streams state updates
        if (!f._ytc.got) f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      }
    });
  }, 700);
})();
