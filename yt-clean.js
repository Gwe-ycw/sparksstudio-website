// Keeps the self-hosted portfolio videos playing: muted, looping, autoplay.
// Same pattern as the homepage hero video — some browsers drop autoplay
// (backgrounded tab, data saver), so we gently re-start paused videos.
(function () {
  setInterval(function () {
    document.querySelectorAll('video[src*="uploads/videos/"]').forEach(function (v) {
      v.muted = true; v.loop = true; v.setAttribute('playsinline', '');
      if (v.paused || v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }, 800);
})();
