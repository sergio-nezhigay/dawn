"""Build every Informatica logo file from one place.

The logo is the site header: the chip icon from sections/header.liquid plus
the word INFORMATIKA in Chakra Petch 700 (assets/chakra-petch-700-latin.woff2).
Letters become outlines, so the files need no font. Letter positions come from
headless Chromium, so kerning and spacing match the live header exactly.

Run from the repo root:  python docs/brand/build.py
Needs: fonttools, brotli, playwright (python) with Chromium.
"""

import base64
import re
import shutil
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
FONT = ROOT / "assets" / "chakra-petch-700-latin.woff2"

WORD = "INFORMATIKA"
BLUE = "#0071DC"  # header background, measured on the live site 2026-10-30
WHITE = "#FFFFFF"


def from_theme(file, pattern):
    match = re.search(pattern, (ROOT / file).read_text("utf-8"), re.S)
    if not match:
        raise SystemExit(f"Not found in {file}: {pattern}")
    return match.groups()


# Accent colour and chip drawing are read from the theme, so they cannot drift.
ACCENT = "#{:02X}{:02X}{:02X}".format(
    *map(int, from_theme("layout/theme.liquid", r"--color-accent:\s*(\d+),\s*(\d+),\s*(\d+)"))
)
CHIP = re.sub(r">\s+<", "><", from_theme("sections/header.liquid", r'class="header-logo__icon".*?>(.*?)</svg>')[0].strip())

# Sizes measured on the live header 2026-10-30 (px): icon, gap, font size, letter-spacing.
DESKTOP = dict(icon=40, gap=10, size=28, spacing=0.7)  # 1440 wide
COMPACT = dict(icon=32, gap=8, size=15, spacing=0.5)  # phones
TONES = (("on-dark", False), ("on-light", True))
THEME_COPIES = {
    "share-1200x628.png": "brand-share.png",
    "icon-32.png": "brand-icon-32.png",
    "icon-180.png": "brand-icon-180.png",
    "logo-on-light.png": "brand-logo.png",
}

font = TTFont(FONT)
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
ascent, descent = font["hhea"].ascent, font["hhea"].descent


def measure(page, layout):
    """Letter x offsets and word width as Chromium lays them out."""
    return page.evaluate(
        """([word, size, spacing]) => {
          const s = document.getElementById('w');
          s.style.fontSize = size + 'px';
          s.style.letterSpacing = spacing + 'px';
          s.textContent = word;
          const left = s.getBoundingClientRect().left;
          const r = document.createRange();
          const xs = [...word].map((_, i) => {
            r.setStart(s.firstChild, i); r.setEnd(s.firstChild, i + 1);
            return r.getBoundingClientRect().left - left;
          });
          return [xs, s.getBoundingClientRect().width];
        }""",
        [WORD, layout["size"], layout["spacing"]],
    )


def word_path(xs, size):
    """One SVG path for the word; y=0 is the top of a line-height:1 box."""
    scale = size / upm
    # line-height 1: baseline sits at half-leading + ascent.
    baseline = (size - (ascent - descent) * scale) / 2 + ascent * scale
    pen = SVGPathPen(glyph_set)
    for ch, x in zip(WORD, xs):
        glyph_set[cmap[ord(ch)]].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
    return pen.getCommands()


def chip(x, y, size, light_bg):
    # On white the yellow line is too faint, so it gets a thin blue edge underneath.
    edge = f'<g stroke="{BLUE}" stroke-width="3">{CHIP}</g>' if light_bg else ""
    return (
        f'<g transform="translate({x} {y}) scale({size / 24})" fill="none" '
        f'stroke-linecap="round" stroke-linejoin="round">'
        f'{edge}<g stroke="{ACCENT}" stroke-width="2">{CHIP}</g></g>'
    )


def svg(width, height, body, bg=None):
    """Returns (svg text, width, height)."""
    rect = f'<rect width="{width}" height="{height}" fill="{bg}"/>' if bg else ""
    text = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">{rect}{body}</svg>\n'
    )
    return text, width, height


def lockup(word, layout, light_bg, with_icon=True):
    """Icon + word side by side, as the header shows it. Icon size 0 = word only."""
    xs, word_w = word
    icon = layout["icon"] if with_icon else 0
    icon_w = icon + layout["gap"] if with_icon else 0
    row = max(icon, layout["size"])
    pad = round(layout["icon"] * 0.25)
    body = chip(pad, pad, icon, light_bg) if with_icon else ""
    body += (
        f'<path transform="translate({pad + icon_w} {pad + (row - layout["size"]) / 2})" '
        f'fill="{BLUE if light_bg else WHITE}" d="{word_path(xs, layout["size"])}"/>'
    )
    return svg(round(pad + icon_w + word_w + pad), row + 2 * pad, body)


def icon_square(size):
    inner = size * 0.7
    off = (size - inner) / 2
    return svg(size, size, chip(off, off, inner, light_bg=False), bg=BLUE)


def share_image(word):
    """1200x628 link preview: logo centred, safe for a square crop."""
    body, w, h = lockup(word, DESKTOP, light_bg=False)
    k = 600 / w  # fits inside the middle 628x628 square
    x, y = (1200 - w * k) / 2, (628 - h * k) / 2
    inner = re.search(r"<svg[^>]*>(.*)</svg>", body, re.S).group(1)
    return svg(1200, 628, f'<g transform="translate({x} {y}) scale({k})">{inner}</g>', bg=BLUE)


def png(browser, item, path, dpr=1):
    text, w, h = item
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=dpr)
    page.set_content(f'<body style="margin:0;background:transparent">{text}</body>')
    page.screenshot(path=str(path), omit_background=True)
    page.close()


def main():
    font_url = "data:font/woff2;base64," + base64.b64encode(FONT.read_bytes()).decode()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(
            f"<style>@font-face{{font-family:CP;src:url({font_url})}}"
            f"#w{{font-family:CP;font-weight:700;line-height:1;white-space:pre}}</style>"
            f'<span id="w"></span>'
        )
        if not page.evaluate("document.fonts.load('700 16px CP').then(f => f.length)"):
            raise SystemExit(f"Font did not load: {FONT}")
        desktop, compact = measure(page, DESKTOP), measure(page, COMPACT)
        page.close()

        files = {}
        for name, word, layout, with_icon in (
            ("logo", desktop, DESKTOP, True),
            ("logo-compact", compact, COMPACT, True),
            ("wordmark", compact, COMPACT, False),
        ):
            for tone, light in TONES:
                files[f"{name}-{tone}"] = lockup(word, layout, light, with_icon)
        files["icon"] = icon_square(512)
        files["share-1200x628"] = share_image(desktop)

        for name, item in files.items():
            (OUT / f"{name}.svg").write_text(item[0], encoding="utf-8")
            if name.startswith(("logo", "wordmark")):
                png(browser, item, OUT / f"{name}.png", dpr=4)  # 4x stays sharp in emails and ads
        for px in (32, 180, 512, 800):
            png(browser, files["icon"], OUT / f"icon-{px}.png", dpr=px / 512)
        png(browser, files["share-1200x628"], OUT / "share-1200x628.png")
        browser.close()

    # The theme serves these copies: link preview, tab icons, Google logo.
    for src, dst in THEME_COPIES.items():
        shutil.copyfile(OUT / src, ROOT / "assets" / dst)
    print("built", len(files), "svg files into", OUT)


if __name__ == "__main__":
    main()
