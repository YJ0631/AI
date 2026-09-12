/* QR 생성기 — 브라우저에서만 동작한다. 입력은 어디로도 전송되지 않는다.
 *
 * 이 파일의 값어치는 QR을 그리는 코드가 아니라 색 판단에 있다.
 * QR은 스캐너가 모듈과 배경을 밝기 차이로 구분해서 읽는다. 브랜드 색은
 * 대개 중간 톤이라 흰 배경과의 대비가 모자란데, 눈으로는 멀쩡해 보인다.
 * 그래서 대비를 실시간으로 계산해 보여주고, 모자라면 대안을 제시한다.
 */
(function () {
  'use strict';

  // 별칭 -> [표시 이름, URL, 스캔 안전색]
  // 색은 브랜드 색이 아니라 색상(hue)은 유지하고 명도만 낮춘 값이다.
  var SITES = [
    ['네이버',       'https://www.naver.com',     '#0B5E3B'],
    ['네이버 블로그', 'https://blog.naver.com',    '#0B5E3B'],
    ['다음',         'https://www.daum.net',      '#1A3F7A'],
    ['카카오',       'https://www.kakao.com',     '#4A3B00'],
    ['구글',         'https://www.google.com',    '#1A4FB4'],
    ['지메일',       'https://mail.google.com',   '#8C1A12'],
    ['유튜브',       'https://www.youtube.com',   '#8C0B0B'],
    ['인스타그램',   'https://www.instagram.com', '#7B2A6B'],
    ['페이스북',     'https://www.facebook.com',  '#14365C'],
    ['스레드',       'https://www.threads.net',   '#181818'],
    ['X',           'https://x.com',             '#181818'],
    ['틱톡',         'https://www.tiktok.com',    '#181818'],
    ['링크드인',     'https://www.linkedin.com',  '#0A3D5C'],
    ['깃허브',       'https://github.com',        '#171515'],
    ['노션',         'https://www.notion.so',     '#181818'],
    ['쿠팡',         'https://www.coupang.com',   '#8C1D13'],
    ['배달의민족',   'https://www.baemin.com',    '#0B5457'],
    ['클로드',       'https://claude.ai',         '#8C3A15']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    data: $('data'), presets: $('presets'),
    dark: $('dark'), darkHex: $('darkHex'),
    light: $('light'), lightHex: $('lightHex'),
    contrast: $('contrast'), ratio: $('ratio'), msg: $('contrastMsg'), fix: $('fixBtn'),
    ecc: $('ecc'), margin: $('margin'), size: $('size'), sizeOut: $('sizeOut'),
    canvas: $('canvas'), err: $('err'),
    version: $('mVersion'), modules: $('mModules'), length: $('mLength'),
    dlPng: $('dlPng'), dlSvg: $('dlSvg')
  };

  /* ── 색 계산 ─────────────────────────────────────────────── */

  function toRgb(hex) {
    var h = String(hex).replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function toHex(rgb) {
    return '#' + rgb.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  // WCAG 상대 휘도. 채널마다 감마를 풀고 사람 눈의 민감도로 가중한다.
  function luminance(rgb) {
    var c = rgb.map(function (v) {
      var s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrastRatio(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(hsl) {
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (!s) { var v = l * 255; return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    var hue = function (t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
  }

  // 색상은 그대로 두고 명도만 낮춰서 목표 대비를 만족하는 색을 찾는다.
  // 색을 통째로 바꿔 버리면 브랜드가 사라져서 사용자가 안 받아들인다.
  function darkenUntil(fgHex, bgHex, target) {
    var bg = toRgb(bgHex), hsl = rgbToHsl(toRgb(fgHex));
    if (!bg) return null;
    for (var l = hsl[2]; l >= 0; l -= 0.01) {
      var cand = hslToRgb([hsl[0], hsl[1], l]);
      if (contrastRatio(cand, bg) >= target) return toHex(cand);
    }
    return '#111111';
  }

  /* ── 상태 ────────────────────────────────────────────────── */

  var state = { dark: '#111111', light: '#FFFFFF' };
  var lastSvg = '';

  function setColor(which, hex) {
    var rgb = toRgb(hex);
    if (!rgb) return;
    var norm = toHex(rgb);
    state[which] = norm;
    els[which].value = norm;
    els[which + 'Hex'].value = norm;
  }

  /* ── 대비 검사 ───────────────────────────────────────────── */

  function updateContrast() {
    var d = toRgb(state.dark), l = toRgb(state.light);
    if (!d || !l) return;

    var r = contrastRatio(d, l);
    els.ratio.textContent = r.toFixed(1) + ' : 1';

    var inverted = luminance(d) > luminance(l);
    var level, msg, offerFix = false;

    if (inverted) {
      level = 'bad';
      msg = '명암이 뒤집혔습니다. 모듈이 배경보다 밝으면 못 읽는 스캐너가 많습니다. 두 색을 맞바꾸세요.';
      offerFix = true;
    } else if (r < 3) {
      level = 'bad';
      msg = '너무 낮습니다. 인쇄물이나 어두운 환경에서 거의 읽히지 않습니다.';
      offerFix = true;
    } else if (r < 4.5) {
      level = 'warn';
      msg = '경계선입니다. 폰 카메라로는 읽히겠지만 저가 리더나 어두운 곳에서는 불안정합니다.';
      offerFix = true;
    } else if (r < 7) {
      level = 'ok';
      msg = '충분합니다.';
    } else {
      level = 'ok';
      msg = '넉넉합니다.';
    }

    els.contrast.dataset.level = level;
    els.msg.textContent = msg;
    els.fix.hidden = !offerFix;
    els.fix.textContent = inverted ? '두 색 맞바꾸기' : '안전한 색으로 바꾸기';
  }

  els.fix.addEventListener('click', function () {
    var d = toRgb(state.dark), l = toRgb(state.light);
    if (!d || !l) return;
    if (luminance(d) > luminance(l)) {          // 뒤집힘 -> 교환
      var a = state.dark;
      setColor('dark', state.light);
      setColor('light', a);
    } else {
      var fixed = darkenUntil(state.dark, state.light, 4.5);
      if (fixed) setColor('dark', fixed);
    }
    render();
  });

  /* ── 렌더링 ──────────────────────────────────────────────── */

  function options() {
    return {
      errorCorrectionLevel: els.ecc.value,
      margin: Math.max(0, Math.min(12, parseInt(els.margin.value, 10) || 0)),
      width: parseInt(els.size.value, 10),
      color: { dark: state.dark, light: state.light }
    };
  }

  function showError(m) {
    els.err.hidden = !m;
    els.err.textContent = m || '';
  }

  function render() {
    updateContrast();
    els.sizeOut.textContent = els.size.value + 'px';

    var text = els.data.value;
    if (!text) {
      showError('');
      els.canvas.getContext('2d').clearRect(0, 0, els.canvas.width, els.canvas.height);
      els.version.textContent = els.modules.textContent = els.length.textContent = '—';
      return;
    }

    var opts = options();

    // create()로 먼저 만들어 보면 용량 초과 같은 오류를 그리기 전에 잡을 수 있고,
    // 버전·모듈 수를 표시해 qrgen.py 결과와 대조할 수 있다.
    var info;
    try {
      info = QRCode.create(text, { errorCorrectionLevel: opts.errorCorrectionLevel });
    } catch (e) {
      showError('이 내용은 QR에 담을 수 없습니다: ' + e.message);
      return;
    }
    showError('');
    els.version.textContent = info.version;
    els.modules.textContent = info.modules.size + ' × ' + info.modules.size;
    els.length.textContent = text.length + '자';

    QRCode.toCanvas(els.canvas, text, opts, function (err) {
      if (err) showError('생성 실패: ' + err.message);
    });

    QRCode.toString(text, Object.assign({ type: 'svg' }, opts), function (err, svg) {
      lastSvg = err ? '' : svg;
    });
  }

  /* ── 내려받기 ────────────────────────────────────────────── */

  function download(href, name) {
    var a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function fileStem() {
    var t = els.data.value.trim();
    var m = t.match(/https?:\/\/(?:www\.)?([^/?#]+)/);
    var base = m ? m[1].replace(/\./g, '-') : t.slice(0, 20);
    return (base.replace(/[^\w가-힣-]/g, '_') || 'qr');
  }

  els.dlPng.addEventListener('click', function () {
    if (!els.data.value) return;
    download(els.canvas.toDataURL('image/png'), fileStem() + '.png');
  });

  els.dlSvg.addEventListener('click', function () {
    if (!lastSvg) return;
    var url = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml' }));
    download(url, fileStem() + '.svg');
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ── 프리셋 ──────────────────────────────────────────────── */

  SITES.forEach(function (s) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.innerHTML = '<span class="dot" style="background:' + s[2] + '"></span>';
    btn.appendChild(document.createTextNode(s[0]));
    btn.addEventListener('click', function () {
      els.data.value = s[1];
      setColor('dark', s[2]);
      setColor('light', '#FFFFFF');
      render();
    });
    els.presets.appendChild(btn);
  });

  /* ── 이벤트 배선 ─────────────────────────────────────────── */

  els.data.addEventListener('input', render);
  els.ecc.addEventListener('change', render);
  ['input', 'change'].forEach(function (ev) {
    els.margin.addEventListener(ev, render);
    els.size.addEventListener(ev, render);
  });

  [['dark', 'darkHex'], ['light', 'lightHex']].forEach(function (pair) {
    els[pair[0]].addEventListener('input', function () { setColor(pair[0], this.value); render(); });
    els[pair[1]].addEventListener('change', function () { setColor(pair[0], this.value); render(); });
  });

  // 라이브러리가 못 올라온 경우를 조용히 넘기지 않는다 —
  // 빈 화면만 보이면 사용자는 자기가 뭘 잘못한 줄 안다.
  if (typeof QRCode === 'undefined') {
    showError('QR 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인하고 새로고침해 주세요.');
    return;
  }

  setColor('dark', state.dark);
  setColor('light', state.light);
  render();
})();
