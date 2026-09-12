# 사이트 구조 규약

HTML · CSS · JS만 쓴다. 빌드 도구, 번들러, 프레임워크, 패키지 매니저를 쓰지 않는다.

**왜** — 이 사이트는 GitHub Pages에서 정적 파일로 서빙된다. 파일을 열면 그게 곧 결과물이고, 배포는 `git push`가 전부다. 빌드 단계가 없으면 "로컬에서는 되는데 배포본이 다르다"는 문제의 절반이 사라진다.

---

## 1. 폴더 구조

```
/
├─ index.html          홈. 루트에 있어야 Pages가 기본 문서로 잡는다
├─ home.css            홈 전용 스타일
├─ README.md           저장소 설명
├─ STRUCTURE.md        이 문서
├─ .gitignore
│
├─ <기능>/             기능 하나 = 폴더 하나
│   ├─ index.html      폴더명으로 접근 가능 (/qr/ → /qr/index.html)
│   ├─ style.css
│   └─ app.js
│
└─ <자료>/             정적 문서 모음 (카드뉴스처럼 낱개 HTML)
    └─ *.html
```

**기능 하나에 폴더 하나, 그 안에 `index.html`을 둔다.** 그래야 `/qr/`처럼 확장자 없는 주소로 열리고, 나중에 그 폴더만 통째로 옮기거나 지울 수 있다.

**폴더 안에서는 파일명을 고정한다** — `index.html` / `style.css` / `app.js`. 폴더가 이름을 담당하므로 파일명에까지 기능명을 넣으면 중복이다 (`qr/qr-style.css` ✗).

## 2. 경로

**항상 상대경로를 쓴다.** 루트 기준 절대경로(`/style.css`)는 쓰지 않는다.

```html
<link rel="stylesheet" href="style.css">   <!-- 같은 폴더 -->
<a href="../index.html">홈</a>              <!-- 상위 -->
<a href="qr/">QR 생성기</a>                  <!-- 하위 폴더 -->
```

**이유가 있다.** GitHub Pages는 사이트를 `https://<계정>.github.io/<저장소>/` 하위에 붙인다. `/style.css`는 `https://<계정>.github.io/style.css`를 가리켜 저장소 밖으로 나가 404가 된다. 상대경로면 로컬에서 파일로 열 때와 배포본이 똑같이 동작한다.

이 규칙 덕분에 **폴더를 통째로 옮겨도 내부 링크가 살아 있다.** 실제로 QR 생성기를 루트에서 `qr/`로 옮겼을 때 한 줄도 고치지 않았다.

## 3. HTML

- 문서마다 `<!doctype html>`, `<html lang="ko">`, `charset`, `viewport`를 갖춘다
- `<title>`은 그 페이지의 이름이다. 설명을 덧붙이지 않는다
- `<meta name="description">`을 넣는다 — 검색 결과와 링크 미리보기에 쓰인다
- 의미 있는 태그를 쓴다: `header` `main` `section` `article` `footer` `nav`
- 스크립트는 `</body>` 직전. 라이브러리를 먼저, 그다음 자기 코드

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js"></script>
<script src="app.js"></script>
```

## 4. CSS

### 토큰을 맨 위에 모은다

색·서체를 개별 규칙에 흩뿌리지 않는다. `:root`에 토큰으로 선언하고 그것만 참조한다. 고칠 곳이 한 군데가 된다.

```css
:root {
  --bg: #F4F6F5;  --surface: #FFFFFF;  --fg: #14181C;
  --muted: #5C6770;  --line: #DCE1E0;  --accent: #10594A;
  --font: "IBM Plex Sans KR", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

### 다크 모드는 토큰만 다시 칠한다

```css
@media (prefers-color-scheme: dark) {
  :root { --bg: #0E1214; --surface: #171D20; --fg: #E6EBE9; /* … */ }
}
```

**컴포넌트 규칙 안에서 색을 직접 바꾸지 않는다.** 미디어 쿼리 안에만 정의된 색은 라이트 모드에서 적용되지 않아, 한쪽 테마의 글자색이 다른 쪽 배경 위에 얹히는 사고가 난다. 모든 색은 바깥 `:root`에 먼저 선언한다.

### 간격은 레이아웃이 만든다

형제 요소 사이 간격은 `margin`이 아니라 flex/grid의 `gap`으로 준다. margin 상쇄와 중복을 피할 수 있다.

### 반응형

- 좌우 여백은 한 곳(`.wrap`)에서만 준다. 세로 여백은 `padding-block`을 쓴다 — `padding` 단축 속성은 좌우를 0으로 덮어쓴다
- 폭 400px에서 가로 스크롤이 없어야 한다
- 이미지와 `aspect-ratio` 박스에 `max-width: 100%`
- 표·코드·다이어그램만 예외로 각자 `overflow-x: auto` 컨테이너에 넣는다

### 알아둘 함정 둘 — 실제로 겪은 것

**컨테이너 쿼리 단위(`cqw`)는 자기 자신에게 적용되지 않는다.** 요소에 `container-type`을 줘도, **그 요소 자신의** `padding`·`gap`에 쓴 `cqw`는 상위 컨테이너(없으면 뷰포트)를 기준으로 계산된다. 카드뉴스가 이 때문에 창이 넓을수록 여백이 부풀고 글자가 작아졌다. 자기 크기 기준이 필요하면 퍼센트(`padding: 8.5%`)를 쓴다.

**그리드 자동 배치를 믿지 않는다.** `grid-template-columns: 34px 1fr`인 항목에 자식이 셋(`::before`, `h3`, `p`) 있으면, 세 번째가 다음 줄의 **첫 열**로 밀려 34px 안에서 글자가 세로로 쪼개진다. 열을 명시한다:

```css
.item h3, .item p { grid-column: 2; }
```

## 5. JS

- 전역을 더럽히지 않는다. 파일 전체를 즉시실행 함수로 감싼다
- DOM 참조는 맨 위에서 한 번만 모은다
- **실패를 조용히 넘기지 않는다.** 라이브러리가 안 올라오면 빈 화면만 보이고, 사용자는 자기가 뭘 잘못한 줄 안다

```js
if (typeof QRCode === 'undefined') {
  showError('라이브러리를 불러오지 못했습니다. 네트워크를 확인하고 새로고침해 주세요.');
  return;
}
```

- 계산 로직과 DOM 조작을 섞지 않는다. 순수 함수로 떼어두면 값이 이상할 때 어디를 볼지 분명해진다

## 6. 외부 라이브러리

**되도록 쓰지 않는다.** 꼭 필요하면 CDN에서 **버전을 고정해** 불러온다.

```html
<!-- 좋음: 버전 고정 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js"></script>

<!-- 나쁨: latest — 어느 날 조용히 깨진다 -->
<script src="https://cdn.example.com/qrcode/latest/qrcode.min.js"></script>
```

폰트는 Google Fonts를 `<link>`로 불러오되, `font-family`에 **실제 대체 스택**을 함께 적는다. 한글 글리프가 없는 폰트에 한글을 지정하면 조용히 시스템 폰트로 폴백한다.

## 7. 배포

**이 폴더가 곧 사이트다.** 별도의 배포 명령이나 업로드 절차가 없다 — 저장소를 고쳐서 밀어 넣는 것이 배포다.

```
로컬:    D:\SBS\web
저장소:  https://github.com/YJ0631/AI   (main 브랜치, 루트)
사이트:  https://yj0631.github.io/AI/
```

`main`에 푸시하면 GitHub Pages가 알아서 다시 빌드한다. 실측 30~40초.

### 페이지를 추가하는 절차

1. 기능 폴더를 만들고 `index.html` · `style.css` · `app.js`를 둔다
2. 링크는 전부 상대경로로
3. 루트 `index.html`에서 새 페이지로 링크를 건다
4. 로컬에서 브라우저로 열어 확인한다
5. 8절의 확인을 거친다
6. 커밋하고 민다

```bash
git add -A
git commit -m "무엇을 왜 바꿨는지"
git push
```

`main`이 `origin/main`을 추적하도록 설정해 두었으므로 `git push`만으로 충분하다.

7. 빌드가 끝났는지 보고, **배포 주소로 다시 확인한다**

```bash
gh api repos/YJ0631/AI/pages/builds/latest --jq '{status, commit}'
```

`status`가 `built`이고 `commit`이 방금 민 커밋과 같으면 반영된 것이다. 빌드 중에는 이전 내용이 그대로 보이므로, 브라우저만 새로고침하며 기다리면 왜 안 바뀌는지 헷갈린다.

### 되돌리기

푸시한 내용을 물리고 싶으면 되돌리는 커밋을 새로 만든다. 히스토리를 고쳐 쓰지 않는다.

```bash
git revert <커밋>
git push
```

## 8. 내보내기 전 확인

로컬에서 되는 것과 배포본에서 되는 것은 다른 문제다. 둘 다 본다.

- [ ] 콘솔 오류 0건
- [ ] 내부 링크가 전부 열린다 (404 없음)
- [ ] CSS·JS가 실제로 적용됐다 (경로 오타는 조용히 실패한다)
- [ ] 외부 라이브러리가 로드된다
- [ ] 폭 400px에서 가로 스크롤이 없다
- [ ] 라이트·다크 양쪽에서 글자가 읽힌다
- [ ] 첫 화면에 내용이 보인다 (스크롤해야 나타나는 구조로 만들지 않는다)
- [ ] 배포 주소에서 위 항목을 다시 확인했다

## 9. 하지 않는 것

| | 대신 |
|---|---|
| 빌드 도구·번들러 (npm, vite, webpack) | 파일을 그대로 둔다 |
| 프레임워크 (React, Vue) | HTML과 몇 줄의 JS |
| CSS 전처리기 (Sass) | CSS 변수와 중첩 |
| 루트 절대경로 (`/style.css`) | 상대경로 |
| 버전 없는 CDN (`latest`) | 버전 고정 |
| 인라인 `style=` 남발 | 클래스 (토큰 주입은 예외) |
| `!important` | 선택자 특이도 정리 |

`!important`의 유일한 예외는 `@media (prefers-reduced-motion: reduce)` 안에서 애니메이션을 끄는 경우다. 사용자의 접근성 설정은 어떤 선택자보다 우선해야 한다.
