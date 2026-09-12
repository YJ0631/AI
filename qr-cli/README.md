# QR 생성기 — 명령줄 버전

여러 사이트를 한 번에 처리하는 것을 기본으로 만든 파이썬 CLI. 웹 버전은 [`/qr/`](https://yj0631.github.io/AI/qr/)에 있고, 이쪽은 **일괄 생성**과 **인쇄용 벡터 출력**이 필요할 때 쓴다.

```bash
pip install segno              # 기본·벡터·WiFi/vCard — 의존성 없음
pip install "qrcode[pil]"      # 로고 삽입·모듈 스타일을 쓸 때만
```

`segno`가 기본이다. 순수 파이썬이고 SVG·EPS·PDF를 내며 Micro QR도 된다. `qrcode`는 `embeded_image_path=` 한 줄로 로고가 들어가는 것이 유일한 강점이라, 로고나 둥근/원형 모듈이 필요할 때만 불러온다 — 없어도 기본 기능은 돌아간다.

## 쓰는 법

```bash
# 사이트 별칭을 나열하면 그만큼 생성된다
python qrgen.py naver youtube instagram -d out/

# 전부를 한 장의 시트로 묶기 (인쇄해 붙이거나 공유할 때)
python qrgen.py naver youtube instagram kakao -d out/ --sheet out/sheet.png

# 이름·별칭·맨 URL을 섞어 써도 된다
python qrgen.py "회사 홈 | https://ourco.kr" naver https://example.com -d out/

# 목록 파일로 (건수가 많거나 반복해서 쓸 때)
python qrgen.py --batch links.example.txt -d out/

# 인쇄용 벡터로 전부
python qrgen.py naver youtube -d out/ --ext svg --no-caption

# WiFi — 스캔하면 비번 입력 없이 접속된다
python qrgen.py --wifi MyCafe hello1234 -o out/wifi.png

# 등록된 별칭 보기 (18개)
python qrgen.py --list-sites
```

캡션은 **이름이 있는 항목에만** 자동으로 붙는다. 맨 URL에는 붙지 않는다 — `qr-001` 같은 문구가 캡션이 되면 의미가 없기 때문이다.

## 주요 옵션

| 옵션 | 기본값 | 비고 |
|---|---|---|
| `-d, --outdir` | `out` | 여러 건은 항상 이쪽 |
| `-o, --out` | — | 항목이 하나일 때만 |
| `--ext` | `.png` | 여러 건일 때의 형식 (`.png` / `.svg`) |
| `--sheet` | — | 전부를 한 장으로 (PNG일 때만) |
| `--dark` / `--light` | 팔레트값 | 사이트 고유색보다 우선 |
| `--style` | `square` | `rounded` `circle`은 qrcode 필요 |
| `--logo` | — | 가운데 넣을 이미지 |
| `--caption` / `--no-caption` | 이름 있으면 자동 | 캡션 강제/해제 |
| `--error` | `h` | 오류정정 — 낮추지 말 것 |
| `--border` | `4` | 여백 모듈 수 (인쇄물 기준) |
| `--micro` | 꺼짐 | Micro QR (짧은 데이터 전용) |

## 색에 대해

`SITES`에 등록된 색은 **브랜드 색이 아니다.** 색상(hue)은 유지하고 명도만 낮춘 값이다. 브랜드 색은 대개 중간 톤이라 흰 배경과의 대비가 모자라 인식이 흔들리는데, 화면으로는 멀쩡해 보인다.

| 브랜드 색 | 흰 배경 대비 | 등록된 값 |
|---|---|---|
| 네이버 `#03C75A` | 2.2 : 1 — 위험 | `#0B5E3B` |
| 유튜브 `#FF0000` | 4.0 : 1 — 적색 광원에서 뭉갬 | `#8C0B0B` |
| 카카오 `#FEE500` | 노랑은 모듈색으로 불가 | `#4A3B00` |

브랜드 색을 꼭 써야 한다면 배경을 흰색으로 두고 모듈만 진하게 가는 쪽이 안전하다. 색을 빼고 기본값(`#111111`)으로 두는 것이 언제나 가장 확실하다.

## 스캔되지 않는 QR을 만드는 실수

- **로고를 넣고 오류정정을 올리지 않는다.** 기본값 `m`은 15%만 복원한다. 로고가 가리는 순간 깨진다. 로고를 넣으면 `--error h`(30%)를 유지하고, 로고는 전체 폭의 25%를 넘기지 않는다. 이 스크립트의 기본값이 `h`인 이유다.
- **명암을 뒤집는다.** 어두운 배경에 밝은 모듈은 못 읽는 스캐너가 많다.
- **여백을 없앤다.** quiet zone은 디자인 여백이 아니라 규격이다. 인쇄물은 4모듈 이상.

## 고치는 곳

`qrgen.py` 상단 **교체 구역**의 세 딕셔너리만 고친다. 개별 함수에 리터럴을 흩뿌리지 않는다.

- `SITES` — 별칭 → (표시 이름, URL, 스캔 안전색). 사이트를 늘리는 곳
- `PALETTES` — 이름 붙은 (모듈색, 배경색) 쌍
- `FONT_CANDIDATES` — 캡션용 한글 폰트 경로. 먼저 발견되는 것을 쓴다

한글 캡션에는 TTF 경로를 직접 줘야 한다. `ImageFont.load_default()`엔 한글 글리프가 없어 네모로 나온다.
