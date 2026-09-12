/* 하는 일은 두 가지다 — 헤더 스와이퍼, 갤러리 확대 보기.
 *
 * 스와이퍼에 라이브러리를 쓰지 않았다. 가로 스크롤 + CSS scroll-snap이면
 * 터치 관성, 휠, 키보드, 접근성을 브라우저가 이미 처리한다. 라이브러리를
 * 넣으면 그걸 전부 흉내 낸 코드를 대신 짊어지게 된다.
 * JS가 맡는 것은 점 표시, 화살표, 자동 넘김뿐이다.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 스와이퍼 ────────────────────────────────────────────── */
  var swiper = document.getElementById('swiper');
  var track = document.getElementById('slides');
  var dotsBox = document.getElementById('dots');

  if (swiper && track && dotsBox) {
    var slides = Array.prototype.slice.call(track.children);
    var current = 0;
    var timer = null;

    // 점 만들기 — 슬라이드 수가 바뀌어도 HTML을 고칠 필요가 없다
    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', (i + 1) + '번째 사진');
      b.addEventListener('click', function () { go(i); restart(); });
      dotsBox.appendChild(b);
      return b;
    });

    function paint(i) {
      current = i;
      dots.forEach(function (d, n) {
        d.setAttribute('aria-selected', n === i ? 'true' : 'false');
      });
    }

    function go(i) {
      var n = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[n].offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
      paint(n);
    }

    // 스크롤로 직접 넘겼을 때도 점이 따라오게 한다.
    // 스크롤 이벤트는 많이 오므로 마지막 한 번만 처리한다.
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== current) paint(Math.min(Math.max(i, 0), slides.length - 1));
      }, 90);
    });

    swiper.querySelector('.prev').addEventListener('click', function () { go(current - 1); restart(); });
    swiper.querySelector('.next').addEventListener('click', function () { go(current + 1); restart(); });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); restart(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); restart(); }
    });

    /* 자동 넘김. 멈추는 조건을 갖추지 않으면 읽는 사람을 방해한다:
       모션 최소화 설정, 마우스를 올린 동안, 키보드 초점이 들어온 동안,
       다른 탭을 보는 동안에는 돌리지 않는다. */
    function start() {
      if (reduced || slides.length < 2) return;
      timer = setInterval(function () { go(current + 1); }, 5000);
    }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) {
      swiper.addEventListener(ev, stop, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(function (ev) {
      swiper.addEventListener(ev, start);
    });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    paint(0);
    start();
  }

  /* ── 갤러리 확대 ─────────────────────────────────────────
     <dialog>을 쓰면 Esc 닫기와 포커스 가둠을 브라우저가 해준다. */
  var dlg = document.getElementById('lightbox');
  var big = document.getElementById('lightboxImg');
  var close = document.getElementById('lightboxClose');

  if (dlg && big && typeof dlg.showModal === 'function') {
    document.querySelectorAll('.gallery img').forEach(function (img) {
      img.addEventListener('click', function () {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || '';
        dlg.showModal();
      });
    });
    if (close) close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { big.removeAttribute('src'); });
  }
})();
