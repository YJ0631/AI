/* 반려견 소개 페이지 — 하는 일은 두 가지뿐이다.
 *
 *  1. 아직 없는 사진 자리를 표시한다
 *  2. 갤러리 사진을 클릭하면 크게 보여준다
 *
 * 사진을 photos/ 에 넣으면 1번은 저절로 사라진다. HTML을 고칠 필요가 없다.
 */
(function () {
  'use strict';

  /* ── 1. 없는 사진 표시 ──────────────────────────────────────
     img 로드가 실패하면 부모 .photo에 data-missing을 붙인다.
     CSS가 그걸 보고 어떤 파일을 넣어야 하는지 안내를 띄운다.
     실패를 조용히 넘기면 빈 칸만 남아서, 보는 사람은 페이지가
     깨진 건지 원래 그런 건지 알 수 없다.                        */
  document.querySelectorAll('.photo img').forEach(function (img) {
    var box = img.closest('.photo');
    function markMissing() { if (box) box.dataset.missing = '1'; }
    function clearMissing() { if (box) delete box.dataset.missing; }

    img.addEventListener('error', markMissing);
    img.addEventListener('load', clearMissing);

    // 이미 로드가 끝난(또는 실패한) 상태면 이벤트가 오지 않는다.
    if (img.complete) { (img.naturalWidth ? clearMissing : markMissing)(); }
  });

  /* ── 2. 사진 확대 보기 ─────────────────────────────────────
     <dialog>을 쓰면 포커스 가둠과 Esc 닫기를 브라우저가 해준다.
     직접 만들면 접근성에서 놓치는 것이 많다.                    */
  var dlg = document.getElementById('lightbox');
  var big = document.getElementById('lightboxImg');
  var close = document.getElementById('lightboxClose');

  if (dlg && big && typeof dlg.showModal === 'function') {
    document.querySelectorAll('.gallery .photo img').forEach(function (img) {
      img.addEventListener('click', function () {
        if (img.closest('.photo').dataset.missing) return;   // 없는 사진은 무시
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || '';
        dlg.showModal();
      });
    });

    if (close) close.addEventListener('click', function () { dlg.close(); });

    // 사진 바깥(백드롭)을 누르면 닫는다
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });

    // 닫을 때 src를 비워 메모리를 쥐고 있지 않게 한다
    dlg.addEventListener('close', function () { big.removeAttribute('src'); });
  }
})();
