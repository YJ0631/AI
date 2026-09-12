# 반려견 소개 사이트 — 구조

**https://yj0631.github.io/AI/web/**

여러 마리를 한 페이지에서 소개한다. 헤더는 넘겨 보는 사진, 아래는 한 마리씩 카드. 흰 바탕에 검은 글씨로 대비를 확보하고, **색은 사진에만 있게** 했다.

HTML · CSS · JS만 쓴다. 빌드 도구도 프레임워크도 없다.

```
web/
├─ index.html    구조와 내용 (여기만 고치면 된다)
├─ style.css     색·서체·배치
├─ app.js        스와이퍼 · 사진 확대
└─ README.md     이 문서
```

## 페이지 구조

| 영역 | 마크업 | 하는 일 |
|---|---|---|
| 헤더 스와이퍼 | `header.hero > .swiper > ul.slides > li.slide` | 대표 사진 넘겨 보기 |
| 머리말 | `.intro` | 사이트 한 줄 소개 |
| 강아지 목록 | `.dogs > article.dog` | 한 마리당 카드 하나 |
| 갤러리 | `.gallery > figure` | 클릭하면 확대 |
| 확대 창 | `dialog#lightbox` | `<dialog>` 하나로 처리 |

## 강아지 추가·삭제

`article.dog` 블록 하나가 강아지 한 마리다. **통째로 복사해서 내용만 바꾸면 된다.** 개수 제한이 없고, CSS도 손댈 필요가 없다.

```html
<article class="dog">
  <div class="dog-photo">
    <img src="사진 주소" alt="이름 — 견종" loading="lazy">
  </div>
  <div class="dog-body">
    <div class="dog-head">
      <h3>이름</h3>
      <p class="breed">견종 · 성별 · 나이</p>
    </div>
    <p class="say">이 아이를 한 문장으로. 견종 설명 말고 그 아이만의 장면.</p>
    <ul class="tags"><li>성격1</li><li>성격2</li><li>성격3</li></ul>
    <dl class="mini">
      <div><dt>좋아하는 것</dt><dd>…</dd></div>
      <div><dt>싫어하는 것</dt><dd>…</dd></div>
    </dl>
  </div>
</article>
```

마리 수를 바꾸면 `.block-head`의 `<span>6</span>마리`도 같이 고친다.

### 잘 읽히게 쓰는 법

`.say` 한 문장이 이 사이트의 성패를 가른다. 견종 백과에 있는 말은 아무도 안 읽는다. **그 아이만의 구체적인 장면**을 쓴다.

- 밋밋함: "활발하고 사람을 좋아합니다"
- 좋음: "산책 나가면 꼭 무언가를 물고 돌아옵니다. 대개는 꽃이고, 가끔은 남의 양말입니다."

## 스와이퍼

**라이브러리를 쓰지 않았다.** 가로 스크롤 + CSS `scroll-snap`이면 터치 관성·휠·키보드·접근성을 브라우저가 이미 처리한다. 라이브러리를 넣으면 그걸 흉내 낸 코드를 대신 짊어지게 된다.

JS가 맡는 것은 셋뿐이다 — 점 표시, 화살표, 자동 넘김(5초).

슬라이드를 추가하려면 `li.slide`를 복사한다. **점은 슬라이드 수를 세어 자동으로 만들어지므로 따로 건드릴 필요가 없다.**

```html
<li class="slide">
  <img src="사진 주소" alt="설명" loading="lazy">
  <div class="slide-text">
    <p class="kicker">이름 · 견종</p>
    <h2>한 줄 문장</h2>
  </div>
</li>
```

자동 넘김은 **읽는 사람을 방해하지 않도록** 다음 경우 멈춘다: 모션 최소화 설정, 마우스를 올린 동안, 키보드 초점이 들어온 동안, 다른 탭을 보는 동안.

## 사진

지금은 **Unsplash 예시 사진**이다. 주소가 살아 있는지 확인하고 넣었다.

```
https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=800&h=800&q=70
```

- `w` / `h` — 잘라낼 크기. 카드는 800×800, 헤더는 1600 가로
- `q` — 품질 70이면 눈에 띄는 손상 없이 용량이 크게 준다
- `auto=format` — 브라우저가 지원하면 WebP로 받는다

**`source.unsplash.com`(랜덤 이미지)은 은퇴했다.** 503만 돌아오므로 쓰지 않는다. 개별 사진 주소만 동작한다.

### 실제 사진으로 바꾸기

1. `web/photos/` 폴더를 만들고 사진을 넣는다
2. `src`를 `photos/파일명.jpg`로 바꾼다
3. 용량을 줄인다 — 원본은 보통 3~8MB라 페이지가 느려진다

```bash
python -c "
from PIL import Image; import pathlib
for p in pathlib.Path('photos').glob('*.jpg'):
    im = Image.open(p); im.thumbnail((1600, 1600))
    im.convert('RGB').save(p, quality=82, optimize=True); print(p, im.size)
"
```

`alt`도 같이 고친다. 사진이 안 보이는 사람에게는 그게 사진이다.

## 색과 가시성

| 토큰 | 값 | 흰 배경 대비 |
|---|---|---|
| `--fg` 본문 | `#111111` | 18.9 : 1 |
| `--muted` 보조 | `#5A5A5A` | 7.0 : 1 |
| `--accent` 강조 | `#1552CC` | 7.6 : 1 |

전부 WCAG AAA(7:1) 이상이다. 보조 텍스트를 흐리게 만들면 디자인은 깔끔해 보여도 실제로는 읽기 어려워지므로, 회색을 더 밝게 두지 않았다.

사진 위 글자는 배경이 무엇이든 읽혀야 하므로 **충분히 진한 스크림**(`rgba(0,0,0,.58)`)을 깔았다. 옅은 그라디언트는 밝은 사진에서 무너진다.

**다크 모드를 넣지 않은 것은 의도다.** 흰 배경을 전제로 만들었고, 사진 중심 페이지에서 바탕이 바뀌면 사진 인상까지 달라진다. 대신 모든 색을 명시해 두어 어떤 환경에서도 같게 보인다.

## 색을 바꾸려면

`style.css` 맨 위 `:root`만 고친다. 아래 구조 규칙에는 색 리터럴을 새로 넣지 않는다. 강조색을 바꿀 때는 **흰 배경 대비 4.5:1 이상**을 유지한다.

## 올리기

```bash
git add -A
git commit -m "무엇을 왜 바꿨는지"
git push
```

30~40초 뒤 반영된다. 빌드가 끝났는지 확인한다.

```bash
gh api repos/YJ0631/AI/pages/builds/latest --jq '{status, commit}'
```

## 공개 저장소라는 점

올리는 순간 누구나 볼 수 있다. 전화번호·주소·동물등록번호는 넣지 않는다. 산책 코스는 시간대까지 함께 적으면 행동 패턴이 노출된다. 사진에 집 주소나 차량 번호가 찍혔는지도 본다.
