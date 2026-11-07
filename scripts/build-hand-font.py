"""Build a self-hosted Yozai subset covering every Chinese character used on the
zh-cn pages, and print what it contains. Re-runnable when copy changes."""

import glob
import os
import re
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_URL = "https://raw.githubusercontent.com/KonghaYao/chinese-free-web-font-storage/branch/packages/yozai/fonts/Yozai-Regular.ttf"
TMP = os.path.join(ROOT, "_fontwork", "yozai.ttf")
OUT_DIR = os.path.join(ROOT, "public", "fonts")
OUT = os.path.join(OUT_DIR, "yozai-subset.woff")

PATTERNS = [
    "src/pages/zh-cn/*.astro",
    "src/lib/i18n.ts",
    "src/components/**/*.astro",
    "src/content/photos/zh-cn/*.md",
]

CJK = re.compile(r"[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2014\u2026\u201c\u201d\u2018\u2019]")

chars = set()
for pat in PATTERNS:
    for path in glob.glob(os.path.join(ROOT, pat), recursive=True):
        with open(path, encoding="utf-8") as fh:
            chars.update(CJK.findall(fh.read()))

text = "".join(sorted(chars))
print(f"characters collected: {len(chars)}")

os.makedirs(OUT_DIR, exist_ok=True)
if not os.path.exists(TMP):
    os.makedirs(os.path.dirname(TMP), exist_ok=True)
    urllib.request.urlretrieve(SRC_URL, TMP)

font = TTFont(TMP, fontNumber=0)
cmap = font.getBestCmap()
missing = [c for c in text if ord(c) not in cmap]
if missing:
    print("MISSING GLYPHS:", "".join(missing))
    raise SystemExit(1)

opts = subset.Options()
opts.flavor = "woff"
opts.drop_tables += ["DSIG"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
sfont = subset.load_font(TMP, opts)
sub = subset.Subsetter(options=opts)
sub.populate(text=text)
sub.subset(sfont)
subset.save_font(sfont, OUT, opts)

print("wrote", OUT, round(os.path.getsize(OUT) / 1024, 1), "KB")
