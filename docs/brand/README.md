# Informatica logo

The official logo is the site header: a yellow chip icon and the word **INFORMATIKA** (Chakra Petch 700). Every file in this folder is made by `build.py`. Don't edit the files by hand: change `build.py` and run it again.

```
python docs/brand/build.py
```

## Which file goes where

| File | Use it for |
|---|---|
| `logo-on-dark.svg` / `.png` | blue or dark backgrounds (same as the desktop header) |
| `logo-on-light.svg` / `.png` | white backgrounds: emails, documents, Google logo (`settings.logo`), Shopify Brand logo |
| `logo-compact-on-dark` / `-on-light` | small spaces; phone proportions (32 px chip, 15 px word) |
| `wordmark-on-dark` / `-on-light` | the word alone, as on phones under 390 px |
| `icon-32.png` | browser-tab icon (`settings.favicon`) |
| `icon-180.png` | phone home-screen icon |
| `icon-512.png` / `icon.svg` | Shopify Brand square logo, social avatars |
| `icon-800.png` | OpenAI Ads and other ad platforms (square 800×800) |
| `share-1200x628.png` | link previews: Admin → Online Store → Preferences → Social sharing image |

PNG logos are exported at 4× size so they stay sharp.

## Colours and font

- Blue `#0071DC`: header background
- Yellow `#FFC220`: chip (`--color-accent`)
- White `#FFFFFF`: the word on blue; on white backgrounds the word is blue, and the chip gets a thin blue edge
- Font: Chakra Petch 700, from `assets/chakra-petch-700-latin.woff2`. In the files, the letters are outlines, so no font is needed.

Sizes in `build.py` were measured on the live header on 2026-10-30. Desktop: 40 px chip, 10 px gap, 28 px word, 0.7 px letter-spacing. Phone: 32 / 8 / 15 / 0.5. If the header changes, update `DESKTOP` / `COMPACT` and rebuild.
