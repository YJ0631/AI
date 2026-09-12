# -*- coding: utf-8 -*-
"""QR 코드 생성기 — 여러 사이트를 한 번에 처리하는 것을 기본으로 설계했다.

    python qrgen.py naver youtube instagram -d out/
    python qrgen.py naver youtube --sheet out/sheet.png
    python qrgen.py "회사 홈 | https://ourco.kr" "블로그 | https://blog.ourco.kr" -d out/
    python qrgen.py --batch links.txt -d out/
    python qrgen.py --list-sites

의존성: segno (필수) / qrcode[pil], Pillow (로고·스타일·캡션·시트를 쓸 때만)
"""
import argparse
import io
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):          # 윈도우 콘솔 cp949 방지
    sys.stdout.reconfigure(encoding="utf-8")

import segno
from segno import helpers


# ═══════════════════════════════════════════════════════════
# 교체 구역 — 사이트·색·폰트를 늘리거나 고치는 곳은 여기가 전부다.
# ═══════════════════════════════════════════════════════════

# 별칭 → (표시 이름, URL, 스캔 안전색)
#
# 색은 브랜드 색 그대로가 아니다. 브랜드 색은 대개 중간 톤이라 흰 배경
# 대비가 모자라 인식이 불안정하다(네이버 초록 2.2:1, 유튜브 빨강 4:1).
# 그래서 색상(hue)은 유지하고 명도만 낮춘 값을 넣어 둔다.
SITES = {
    "naver":     ("네이버",      "https://www.naver.com",     "#0B5E3B"),
    "blog":      ("네이버 블로그", "https://blog.naver.com",    "#0B5E3B"),
    "daum":      ("다음",        "https://www.daum.net",      "#1A3F7A"),
    "kakao":     ("카카오",      "https://www.kakao.com",     "#4A3B00"),
    "google":    ("구글",        "https://www.google.com",    "#1A4FB4"),
    "gmail":     ("지메일",      "https://mail.google.com",   "#8C1A12"),
    "youtube":   ("유튜브",      "https://www.youtube.com",   "#8C0B0B"),
    "instagram": ("인스타그램",   "https://www.instagram.com", "#7B2A6B"),
    "facebook":  ("페이스북",     "https://www.facebook.com",  "#14365C"),
    "threads":   ("스레드",      "https://www.threads.net",   "#181818"),
    "x":         ("X",          "https://x.com",             "#181818"),
    "tiktok":    ("틱톡",        "https://www.tiktok.com",    "#181818"),
    "linkedin":  ("링크드인",     "https://www.linkedin.com",  "#0A3D5C"),
    "github":    ("깃허브",      "https://github.com",        "#171515"),
    "notion":    ("노션",        "https://www.notion.so",     "#181818"),
    "coupang":   ("쿠팡",        "https://www.coupang.com",   "#8C1D13"),
    "baemin":    ("배달의민족",   "https://www.baemin.com",    "#0B5457"),
    "claude":    ("클로드",      "https://claude.ai",         "#8C3A15"),
}

# 이름 붙은 (모듈색, 배경색) 조합
PALETTES = {
    "mono":    ("#111111", "#FFFFFF"),
    "steak":   ("#241A14", "#EFEAE1"),
    "salt":    ("#10303F", "#E7EEF0"),
    "stirfry": ("#2B1B3D", "#F0E7EC"),
}

# 캡션·시트용 한글 폰트 후보 — 먼저 발견되는 것을 쓴다
FONT_CANDIDATES = [
    "C:/Windows/Fonts/malgunbd.ttf",
    "C:/Windows/Fonts/malgun.ttf",
    "C:/Windows/Fonts/gulim.ttc",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
]

# ═══════════════════════════════════════════════════════════
# 이하 구조 — 사이트를 추가해도 손대지 않는다.
# ═══════════════════════════════════════════════════════════


def die(msg):
    sys.exit("오류: " + msg)


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        die("색 형식이 잘못됐습니다: " + h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def find_font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def safe_name(s):
    s = "".join(c if c.isalnum() or c in " -_()·" else "_" for c in s).strip()
    return s or "qr"


def slug_from_url(url):
    """URL에서 파일명으로 쓸 만한 조각을 뽑는다."""
    m = re.search(r"https?://(?:www\.)?([^/?#]+)", url)
    return safe_name(m.group(1).replace(".", "-")) if m else ""


# ── 입력 해석 ─────────────────────────────────────────────
class Item(object):
    """생성할 한 건. 이름·데이터·색을 들고 있다."""

    def __init__(self, name, data, dark=None):
        self.name = name        # 캡션·파일명. 없으면 None
        self.data = data
        self.dark = dark        # 사이트 고유색. 없으면 None

    def filename(self, idx, ext):
        base = self.name or slug_from_url(self.data) or ("qr-%03d" % idx)
        return safe_name(base) + ext


def parse_item(raw, idx):
    """'별칭' / '이름 | 데이터' / 'URL·문자열' 세 형태를 모두 받는다."""
    if "|" in raw:
        name, _, data = raw.partition("|")
        return Item(name.strip() or None, data.strip())

    key = raw.strip().lower()
    if key in SITES:
        display, url, dark = SITES[key]
        return Item(display, url, dark)

    return Item(None, raw.strip())


def read_batch(path):
    if not os.path.exists(path):
        die("목록 파일이 없습니다: " + path)
    items = []
    with io.open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if line and not line.startswith("#"):
                items.append(parse_item(line, n))
    if not items:
        die("목록 파일이 비어 있습니다: " + path)
    return items


# ── 렌더링 ────────────────────────────────────────────────
def build_qr(args, data):
    if args.wifi:
        ssid, password = args.wifi
        return helpers.make_wifi(ssid=ssid, password=password,
                                 security=args.wifi_security, hidden=False)
    if args.vcard:
        name, email, url = (list(args.vcard) + ["", ""])[:3]
        return helpers.make_vcard(name=name, displayname=name,
                                  email=email or None, url=url or None)
    if args.geo:
        return helpers.make_geo(float(args.geo[0]), float(args.geo[1]))
    if args.micro:
        return segno.make_micro(data)
    return segno.make(data, error=args.error)


def qr_to_pil(qr, dark, light, scale, border):
    from PIL import Image
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=scale, border=border, dark=dark, light=light)
    return Image.open(buf).convert("RGB")


def render_styled(data, dark, light, scale, border, error, logo, style):
    """로고·모듈 스타일이 필요할 때만 qrcode 라이브러리를 쓴다."""
    try:
        import qrcode
        from qrcode.image.styledpil import StyledPilImage
        from qrcode.image.styles.colormasks import SolidFillColorMask
        from qrcode.image.styles.moduledrawers.pil import (
            SquareModuleDrawer, RoundedModuleDrawer, CircleModuleDrawer)
    except ImportError:
        die('로고·스타일에는 qrcode가 필요합니다:  pip install "qrcode[pil]"')

    levels = {"l": qrcode.constants.ERROR_CORRECT_L,
              "m": qrcode.constants.ERROR_CORRECT_M,
              "q": qrcode.constants.ERROR_CORRECT_Q,
              "h": qrcode.constants.ERROR_CORRECT_H}
    drawers = {"square": SquareModuleDrawer, "rounded": RoundedModuleDrawer,
               "circle": CircleModuleDrawer}

    qr = qrcode.QRCode(error_correction=levels[error], box_size=scale + 2, border=border)
    qr.add_data(data)
    qr.make(fit=True)

    kw = {"image_factory": StyledPilImage,
          "module_drawer": drawers[style](),
          "color_mask": SolidFillColorMask(back_color=hex_to_rgb(light),
                                           front_color=hex_to_rgb(dark))}
    if logo:
        if not os.path.exists(logo):
            die("로고 파일이 없습니다: " + logo)
        kw["embeded_image_path"] = logo
    return qr.make_image(**kw).convert("RGB")


def add_caption(img, text, dark, light):
    from PIL import Image, ImageDraw, ImageFont
    font_path = find_font()
    if not font_path:
        return img

    size = max(16, img.width // 16)
    font = ImageFont.truetype(font_path, size)
    gap = int(size * 0.5)

    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    x0, y0, x1, y1 = probe.textbbox((0, 0), text, font=font)
    tw, th = x1 - x0, y1 - y0

    W = max(img.width, tw + gap * 4)
    H = img.height + gap + th + gap
    out = Image.new("RGB", (W, H), light)
    out.paste(img, ((W - img.width) // 2, 0))
    ImageDraw.Draw(out).text(((W - tw) // 2 - x0, img.height + gap - y0),
                             text, font=font, fill=dark)
    return out


def make_sheet(pairs, path, light, dark, cols):
    """여러 QR을 한 장으로 묶는다. 인쇄해서 벽에 붙이거나 공유할 때 쓴다."""
    from PIL import Image, ImageDraw, ImageFont
    if not pairs:
        return
    TILE, PAD, LBL = 360, 26, 46
    rows = (len(pairs) + cols - 1) // cols
    W = cols * TILE + (cols + 1) * PAD
    H = rows * (TILE + LBL) + (rows + 1) * PAD

    sheet = Image.new("RGB", (W, H), light)
    d = ImageDraw.Draw(sheet)
    font_path = find_font()
    font = ImageFont.truetype(font_path, 24) if font_path else None

    for i, (label, im) in enumerate(pairs):
        x = PAD + (i % cols) * (TILE + PAD)
        y = PAD + (i // cols) * (TILE + LBL + PAD)
        sheet.paste(im.resize((TILE, TILE), Image.LANCZOS), (x, y))
        if font and label:
            d.text((x, y + TILE + 12), label, font=font, fill=dark)

    parent = os.path.dirname(path)
    if parent and not os.path.isdir(parent):
        os.makedirs(parent)
    sheet.save(path, quality=95)
    print("  시트  %-38s %7d bytes  (%d칸)" % (path, os.path.getsize(path), len(pairs)))


# ── 한 건 처리 ────────────────────────────────────────────
def generate(args, item, out_path, want_image=False):
    dark = args.dark or item.dark or args.pal_dark
    light = args.light or args.pal_light
    ext = os.path.splitext(out_path)[1].lower()
    caption = None if args.no_caption else (args.caption or item.name)

    img = None
    if ext == ".svg":
        if args.logo or args.style != "square" or caption:
            die("SVG에는 로고·스타일·캡션을 넣을 수 없습니다. --ext png 로 내세요.")
        build_qr(args, item.data).save(out_path, scale=args.scale,
                                       border=args.border, dark=dark, light=light)
    elif ext in (".png", ".jpg", ".jpeg"):
        if args.logo or args.style != "square":
            img = render_styled(item.data, dark, light, args.scale,
                                args.border, args.error, args.logo, args.style)
        else:
            img = qr_to_pil(build_qr(args, item.data), dark, light,
                            args.scale, args.border)
        plain = img
        if caption:
            img = add_caption(img, caption, dark, light)
        img.save(out_path, quality=95)
        if want_image:
            img = plain            # 시트에는 캡션 없는 원본을 쓴다
    else:
        die("지원하지 않는 확장자입니다: " + (ext or "(없음)") + "  — .png 또는 .svg")

    print("  %-42s %7d bytes" % (out_path, os.path.getsize(out_path)))
    return img


def main():
    p = argparse.ArgumentParser(
        description="QR 코드 생성기 — 여러 사이트를 한 번에",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)

    p.add_argument("items", nargs="*", metavar="항목",
                   help="사이트 별칭(naver youtube …), URL, 또는 '이름 | 데이터'. 여러 개 나열 가능")
    p.add_argument("-o", "--out", help="출력 파일 (항목이 하나일 때만)")
    p.add_argument("-d", "--outdir", default="out", help="저장 폴더 (기본: out)")
    p.add_argument("--ext", default=".png", choices=[".png", ".svg", "png", "svg"],
                   help="여러 건일 때의 출력 형식 (기본: .png)")
    p.add_argument("--list-sites", action="store_true", help="등록된 사이트 별칭을 보여준다")

    g = p.add_argument_group("다른 입력 종류")
    g.add_argument("--batch", metavar="파일", help="목록 파일 (한 줄에 한 건)")
    g.add_argument("--wifi", nargs=2, metavar=("SSID", "PASSWORD"))
    g.add_argument("--wifi-security", default="WPA", choices=["WPA", "WEP", "nopass"])
    g.add_argument("--vcard", nargs="+", metavar="값", help="이름 [이메일] [URL]")
    g.add_argument("--geo", nargs=2, metavar=("위도", "경도"))

    s = p.add_argument_group("모양")
    s.add_argument("--palette", choices=sorted(PALETTES), default="mono")
    s.add_argument("--dark", help="모듈 색 (사이트 고유색보다 우선)")
    s.add_argument("--light", help="배경 색")
    s.add_argument("--style", default="square", choices=["square", "rounded", "circle"])
    s.add_argument("--logo", help="가운데 넣을 이미지")
    s.add_argument("--caption", help="모든 항목에 같은 문구를 넣는다")
    s.add_argument("--no-caption", action="store_true",
                   help="이름이 있어도 캡션을 넣지 않는다")
    s.add_argument("--sheet", metavar="파일", help="전부를 한 장의 시트로 묶어 저장")
    s.add_argument("--sheet-cols", type=int, default=3, help="시트 열 수 (기본 3)")

    t = p.add_argument_group("품질")
    t.add_argument("--scale", type=int, default=8)
    t.add_argument("--border", type=int, default=4, help="여백 모듈 수 (인쇄물은 4 이상)")
    t.add_argument("--error", default="h", choices=["l", "m", "q", "h"],
                   help="오류정정 (기본 h — 낮추지 말 것)")
    t.add_argument("--micro", action="store_true", help="Micro QR (짧은 데이터 전용)")

    args = p.parse_args()

    if args.list_sites:
        print("등록된 사이트 별칭 %d개 — 그대로 인자로 넘기면 된다\n" % len(SITES))
        for k in sorted(SITES):
            display, url, dark = SITES[k]
            print("  %-10s %-12s %-30s %s" % (k, display, url, dark))
        print("\n  없는 사이트는 '이름 | URL' 형태로 직접 넘기거나 SITES에 추가한다.")
        return

    args.pal_dark, args.pal_light = PALETTES[args.palette]
    if args.dark:
        hex_to_rgb(args.dark)
    if args.light:
        hex_to_rgb(args.light)

    ext = args.ext if args.ext.startswith(".") else "." + args.ext

    # 항목 모으기
    items = []
    if args.batch:
        items += read_batch(args.batch)
    items += [parse_item(raw, i + 1) for i, raw in enumerate(args.items)]

    if args.wifi or args.vcard or args.geo:
        label = "WiFi" if args.wifi else ("연락처" if args.vcard else "위치")
        items.append(Item(label, ""))
    if not items:
        p.error("생성할 항목이 없습니다. 별칭·URL을 나열하거나 --batch/--wifi/--vcard/--geo를 쓰세요. "
                "등록된 별칭은 --list-sites 로 확인합니다.")

    # 단건이고 -o가 있으면 그대로, 아니면 폴더에 이름 규칙으로 저장
    if args.out and len(items) > 1:
        die("-o 는 항목이 하나일 때만 씁니다. 여러 건은 -d 로 폴더를 지정하세요.")

    want_sheet = bool(args.sheet)
    pairs = []

    if args.out:
        parent = os.path.dirname(args.out)
        if parent and not os.path.isdir(parent):
            os.makedirs(parent)
        print("생성 1건")
        img = generate(args, items[0], args.out, want_image=want_sheet)
        if want_sheet and img:
            pairs.append((items[0].name, img))
    else:
        if not os.path.isdir(args.outdir):
            os.makedirs(args.outdir)
        print("생성 %d건 → %s" % (len(items), args.outdir))
        used = set()
        for i, item in enumerate(items, 1):
            fn = item.filename(i, ext)
            while fn in used:                       # 이름이 겹치면 번호를 붙인다
                stem, e = os.path.splitext(fn)
                fn = "%s-%d%s" % (stem, i, e)
            used.add(fn)
            img = generate(args, item, os.path.join(args.outdir, fn),
                           want_image=want_sheet)
            if want_sheet and img:
                pairs.append((item.name, img))

    if want_sheet:
        if not pairs:
            die("시트는 PNG 출력일 때만 만들 수 있습니다. --ext png 로 내세요.")
        make_sheet(pairs, args.sheet, args.light or args.pal_light,
                   args.dark or args.pal_dark, args.sheet_cols)


if __name__ == "__main__":
    main()
