# 반려견 소개 사이트 — 구조

여러 마리를 한 페이지에서 소개한다. 흰 배경, 장식 최소, 사진과 이름이 먼저 읽히는 것이 목표다.

상위 저장소 규약(`../STRUCTURE.md`)을 그대로 따른다 — HTML · CSS · JS만, 빌드 없음, 상대경로.

---

## 1. 파일

```
web/
├─ index.html      내용이 전부 여기 있다. 강아지를 추가·수정하는 곳
├─ style.css       토큰(색·서체·치수)이 맨 위에 모여 있다
├─ app.js          스와이퍼 초기화 + 사진 확대
├─ STRUCTURE.md    이 문서
├─ README.md       고치는 방법
└─ photos/         로컬 사진으로 바꿀 때 쓰는 자리 (지금은 비어 있음)
```

## 2. 화면 구성

```
┌─ header.site ─────────────── 고정. 로고 + 섹션 이동
│
├─ section.hero ────────────── 스와이퍼 (슬라이드 3장)
│    슬라이드 = 사진(왼쪽) + 이름·소개(오른쪽)
│    자동 넘김 · 좌우 버튼 · 점 인디케이터 · 키보드 방향키
│
├─ section.dogs ────────────── 카드 9장 (3 × 3, 모바일 1열)
│    카드 = 사진 · 이름 · 견종/나이 · 한 줄 소개 · 태그
│
├─ section.about ───────────── 사이트 설명 한 문단
│
└─ footer
```

**왜 원페이지인가** — 강아지마다 페이지를 나누면 아홉 개의 파일을 관리해야 하고, 방문자는 목록과 상세를 오가야 한다. 한 마리당 정보가 대여섯 줄인 상황에서는 한 페이지에 늘어놓는 편이 읽기도 고치기도 빠르다.

## 3. 스와이퍼

[Swiper 11](https://swiperjs.com/) 을 cdnjs에서 불러 쓴다. 직접 만들지 않은 이유는 터치 관성, 키보드 조작, 화면낭독기 대응을 다시 구현할 이유가 없어서다.

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.2.6/swiper-bundle.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.2.6/swiper-bundle.min.js"></script>
```

설정은 `app.js` 한 곳에 있다. 자동 넘김은 **마우스를 올리면 멈춘다** — 읽는 중에 화면이 바뀌는 것만큼 성가신 것이 없다. `prefers-reduced-motion`을 켠 사용자에게는 자동 넘김을 아예 하지 않는다.

스크립트가 막히거나 실패해도 첫 슬라이드는 그대로 보인다. 스와이퍼가 없으면 그냥 사진 한 장과 글이 된다.

## 4. 사진

지금은 [Unsplash](https://unsplash.com/)의 사진을 주소로 직접 불러온다. 실물 사진이 준비되기 전까지 배치와 크기를 확인하기 위한 것이다.

```
https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=800&q=70
```

`w`로 크기를, `fit=crop`으로 잘라낼 방식을 정한다. 카드는 4:5, 슬라이드는 3:4로 잘린다.

**내 사진으로 바꿀 때** — `photos/`에 넣고 `index.html`의 `src`를 `photos/보리.jpg` 식으로 바꾼다. 그 외에 고칠 것은 없다.

모든 `img`에 `width`·`height`를 적어 둔다. 없으면 사진이 뜨는 순간 아래 내용이 밀려 내려간다.

## 5. 색과 대비

흰 배경 고정이다. `color-scheme: light`를 명시해 시스템이 다크 모드여도 페이지가 뒤집히지 않게 한다. 사진이 주인공인 페이지에서 배경색이 바뀌면 같은 사진이 다른 톤으로 보인다.

| 용도 | 값 | 흰 배경 대비 |
|---|---|---|
| 본문 | `#14181C` | 15.8 : 1 |
| 보조 설명 | `#5C6770` | 5.6 : 1 |
| 강조·링크 | `#1A56DB` | 6.2 : 1 |
| 경계선 | `#E6E9EC` | — |

보조 설명까지 4.5:1을 넘겼다. 흰 배경 위 옅은 회색 글씨는 디자인 시안에서는 멀쩡하고 실제 화면에서는 읽히지 않는다.

## 6. 반응형

| 폭 | 카드 | 슬라이드 |
|---|---|---|
| ~ 640px | 1열 | 사진 위, 글 아래 |
| 641 ~ 1024px | 2열 | 2단 |
| 1025px ~ | 3열 | 2단 |

`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` 하나로 처리한다. 중단점을 카드 개수마다 따로 잡지 않는다.

## 7. 강아지 추가하기

`index.html`의 `<!-- 강아지 카드 -->` 구역에서 `<article class="dog">` 하나를 복사해 붙이고 내용을 바꾼다. CSS도 JS도 건드리지 않는다.

```html
<article class="dog">
  <div class="dog-photo">
    <img src="…" alt="보리" width="600" height="750" loading="lazy">
  </div>
  <div class="dog-body">
    <h3>보리</h3>
    <p class="dog-meta">골든 리트리버 · 4살 · 28kg</p>
    <p class="dog-desc">…</p>
    <ul class="tags"><li>온순함</li><li>물놀이</li></ul>
  </div>
</article>
```
