"""Resize the 1.1 captures to a 90% zoom bitmap and compare them to factor 1.0."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

scratch = Path(sys.argv[1])
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
report = json.loads((scratch / "metrics.json").read_text(encoding="utf-8"))

ABSOLUTE = [
    ("heroTitle.font", lambda m: m["heroTitle"]["font"] if m.get("heroTitle") else None),
    ("heroTitle.line", lambda m: m["heroTitle"]["line"] if m.get("heroTitle") else None),
    ("hero.h", lambda m: m["hero"]["h"] if m.get("hero") else None),
    ("section.font", lambda m: m["section"]["font"] if m.get("section") else None),
    ("chip.h", lambda m: m["chip"]["h"] if m.get("chip") else None),
    ("chip.font", lambda m: m["chip"]["font"] if m.get("chip") else None),
    ("search.h", lambda m: m["search"]["h"] if m.get("search") else None),
    ("search.font", lambda m: m.get("searchFont")),
    ("search.radius", lambda m: m["search"]["radius"] if m.get("search") else None),
    ("logo.w", lambda m: m["logo"]["w"] if m.get("logo") else None),
    ("brand.font", lambda m: m["brand"]["font"] if m.get("brand") else None),
    ("stat.font", lambda m: m["stat"]["font"] if m.get("stat") else None),
    ("tile.w", lambda m: m["tile"]["w"] if m.get("tile") else None),
    ("tileLabel.font", lambda m: m["tileLabel"]["font"] if m.get("tileLabel") else None),
    ("tile.radius", lambda m: m.get("tileRadius")),
    ("card.w", lambda m: m["card"]["w"] if m.get("card") else None),
    ("card.h", lambda m: m["card"]["h"] if m.get("card") else None),
    ("cardTitle.font", lambda m: m["cardTitle"]["font"] if m.get("cardTitle") else None),
    ("cardTitle.line", lambda m: m["cardTitle"]["line"] if m.get("cardTitle") else None),
    ("cardTitle.clamp", lambda m: m["cardTitle"]["clamp"] if m.get("cardTitle") else None),
    ("media.h", lambda m: m["media"]["h"] if m.get("media") else None),
    ("heart.w", lambda m: m["heart"]["w"] if m.get("heart") else None),
    ("quote.w", lambda m: m["quote"]["w"] if m.get("quote") else None),
    ("quote.font", lambda m: m["quote"]["font"] if m.get("quote") else None),
    ("valueIcon.w", lambda m: m["valueIcon"]["w"] if m.get("valueIcon") else None),
    ("stepCircle.w", lambda m: m["stepCircle"]["w"] if m.get("stepCircle") else None),
    ("banner.h", lambda m: m["banner"]["h"] if m.get("banner") else None),
    ("footerLogo.w", lambda m: m["footerLogo"]["w"] if m.get("footerLogo") else None),
    ("sectionWrap.w", lambda m: m["sectionWrap"]["w"] if m.get("sectionWrap") else None),
]


def mae(a: Image.Image, b: Image.Image) -> float:
    diff = ImageChops.difference(a, b)
    stat = ImageStat.Stat(diff)
    return sum(stat.mean) / len(stat.mean)


def mask_toggle(image: Image.Image, box, scale: float) -> None:
    if not box:
        return
    pad = 8
    x = int(box["x"] * scale) - pad
    y = int(box["y"] * scale) - pad
    w = int(box["w"] * scale) + pad * 2
    h = int(box["h"] * scale) + pad * 2
    image.paste((255, 255, 255), (max(0, x), max(0, y), min(image.width, x + w), min(image.height, y + h)))


print("MEASURED CSS RATIOS (1.1 at W/0.9) / (1.0 at W) — expect ~1.10, clamp stays 2")
misses = []
for width, pair in report["widths"].items():
    one = pair["scale1"]
    eleven = pair["scale11"]
    print(f"\n== {width} ==")
    for name, pick in ABSOLUTE:
        a = pick(one)
        b = pick(eleven)
        if isinstance(a, str) or isinstance(b, str):
            flag = "OK" if a == b else "DIFF"
            print(f"  {name}: {a} -> {b} {flag}")
            if a != b:
                misses.append(f"{width} {name}: {a} -> {b}")
            continue
        if a in (None, 0) or b in (None, 0):
            print(f"  {name}: {a} -> {b} MISSING")
            misses.append(f"{width} {name}: missing {a} -> {b}")
            continue
        ratio = b / a
        flag = "OK" if 1.07 <= ratio <= 1.135 else "OFF"
        print(f"  {name}: {a} -> {b} ratio {ratio:.3f} {flag}")
        if flag != "OK":
            misses.append(f"{width} {name}: {a} -> {b} ({ratio:.3f})")

    raw_one = Image.open(pair["files"]["one"]).convert("RGB")
    raw_eleven = Image.open(pair["files"]["eleven"]).convert("RGB")
    zoomed = raw_eleven.resize(
        (max(1, round(raw_eleven.width * 0.9)), max(1, round(raw_eleven.height * 0.9))),
        Image.Resampling.LANCZOS,
    )
    one_name = output / f"{width}-factor-1.0-zoom-100.png"
    eleven_name = output / f"{width}-factor-1.1-zoom-90.png"
    raw_one.save(one_name)
    zoomed.save(eleven_name)
    fitted = zoomed.resize(raw_one.size, Image.Resampling.LANCZOS)
    mask_toggle(raw_one, one.get("toggle"), 1)
    mask_toggle(fitted, eleven.get("toggle"), 0.9 * raw_one.width / max(1, zoomed.width))
    # toggle coords above were already in the zoomed bitmap; fitted is stretched to raw_one.
    # Re-mask using the 1.0 image space for both after the resize-to-match.
    fitted = zoomed.resize(raw_one.size, Image.Resampling.LANCZOS)
    left = raw_one.copy()
    right = fitted.copy()
    mask_toggle(left, one.get("toggle"), 1)
    if eleven.get("toggle") and zoomed.width:
        y_scale = raw_one.height / zoomed.height
        x_scale = raw_one.width / zoomed.width
        box = dict(eleven["toggle"])
        box["x"] *= x_scale
        box["y"] *= y_scale
        box["w"] *= x_scale
        box["h"] *= y_scale
        mask_toggle(right, box, 1)
    overlap_h = min(raw_one.height, zoomed.height)
    overlap = mae(raw_one.crop((0, 0, raw_one.width, overlap_h)), zoomed.crop((0, 0, zoomed.width, overlap_h))) if zoomed.width == raw_one.width else None
    aligned = mae(left, right)
    print(f"  images {one_name.name} {raw_one.size} vs {eleven_name.name} {zoomed.size}")
    print(f"  height ratio zoomed/base {zoomed.height / raw_one.height:.4f} (expect ~0.99)")
    print(f"  aligned MAE after removing the 1% zoom remainder: {aligned:.2f}")
    if overlap is not None:
        print(f"  top-aligned MAE before stretch: {overlap:.2f}")
    for key in ("hero", "section", "search", "card", "quote", "stepCircle", "footerLogo"):
        box = one.get(key)
        other = eleven.get(key)
        if not box or not other:
            continue
        top = max(0, int(box["y"]))
        band = max(20, int(box["h"]) + 8)
        left_crop = raw_one.crop((0, top, raw_one.width, min(raw_one.height, top + band)))
        ztop = max(0, int(other["y"] * 0.9))
        zband = max(20, int(other["h"] * 0.9) + 8)
        right_crop = zoomed.crop((0, ztop, zoomed.width, min(zoomed.height, ztop + zband)))
        if left_crop.height < 8 or right_crop.height < 8:
            print(f"  {key} crop clipped")
            continue
        right_crop = right_crop.resize(left_crop.size, Image.Resampling.LANCZOS)
        print(f"  {key} local MAE {mae(left_crop, right_crop):.2f}")

print("\nMISSES")
if not misses:
    print("  none")
else:
    for line in misses:
        print(" ", line)
