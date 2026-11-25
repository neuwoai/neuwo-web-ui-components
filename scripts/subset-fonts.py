import re
import sys
from pathlib import Path

try:
    import brotli  # noqa: F401
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("npm run fonts:subset needs the Python packages fonttools and brotli: pip install fonttools brotli")

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "src/foundation/font-sources"
FONTS = ROOT / "src/foundation/fonts"
CSS = ROOT / "src/foundation/fonts.css"

# Google Fonts' "latin" subset, plus U+0160-0161 and U+017D-017E (Š š Ž ž) for Finnish and Estonian.
LATIN = set(subset.parse_unicodes(
    "U+0000-00FF,U+0131,U+0152-0153,U+0160-0161,U+017D-017E,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,"
    "U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
))


def unicode_range(points):
    spans = []
    for point in sorted(points):
        if spans and point == spans[-1][1] + 1:
            spans[-1][1] = point
        else:
            spans.append([point, point])
    return ", ".join(f"U+{start:04X}" if start == end else f"U+{start:04X}-{end:04X}" for start, end in spans)


def cut(source, points, target):
    font = TTFont(source, recalcTimestamp=False)
    options = subset.Options(layout_features=["*"], name_IDs=["*"], name_languages=["*"], notdef_outline=True)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    font.save(target)


def declare(css, file, points):
    face = re.compile(r"(@font-face\s*\{[^}]*url\('fonts/" + re.escape(file) + r"'\)[^}]*unicode-range: )[^;]*;")
    css, found = face.subn(lambda match: match.group(1) + unicode_range(points) + ";", css)
    if found != 1:
        sys.exit(f"fonts.css needs one @font-face for fonts/{file} with a unicode-range line")
    return css


css = CSS.read_text()
for source in sorted(SOURCES.glob("*.woff2")):
    characters = set(TTFont(source).getBestCmap())
    extension = source.name.replace("-variable.woff2", "-ext-variable.woff2")
    for file, points in ((source.name, characters & LATIN), (extension, characters - LATIN)):
        cut(source, points, FONTS / file)
        css = declare(css, file, LATIN if file == source.name else points)
CSS.write_text(css)
