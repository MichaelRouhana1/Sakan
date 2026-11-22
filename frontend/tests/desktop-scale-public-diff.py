import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

scratch = Path(sys.argv[1])
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
report = json.loads((scratch / "report.json").read_text(encoding="utf-8"))

def mae(a, b):
    diff = ImageChops.difference(a, b)
    stat = ImageStat.Stat(diff)
    return sum(stat.mean) / len(stat.mean)

print("RATIOS expect ~1.10")
for name, pair in report["pages"].items():
    one = pair.get("1")
    eleven = pair.get("1.1")
    if not one or not eleven:
        print(f"{name}: missing capture")
        continue
    print(f"\n== {name} attr {one['metrics']['attr']} -> {eleven['metrics']['attr']} columns {one['metrics'].get('columns')} -> {eleven['metrics'].get('columns')}")
    for key in ("brand", "sample"):
        a = one["metrics"].get(key)
        b = eleven["metrics"].get(key)
        if not a or not b or not a.get("font") or not b.get("font"):
            print(f"  {key}: {a} -> {b}")
            continue
        print(f"  {key} font {a['font']} -> {b['font']} ({b['font']/a['font']:.3f}) h {a['h']} -> {b['h']} ({b['h']/a['h']:.3f})")
    raw_one = Image.open(one["file"]).convert("RGB")
    raw_eleven = Image.open(eleven["file"]).convert("RGB")
    zoomed = raw_eleven.resize((max(1, round(raw_eleven.width * 0.9)), max(1, round(raw_eleven.height * 0.9))), Image.Resampling.LANCZOS)
    raw_one.save(output / f"{name}-factor-1.0-zoom-100.png")
    zoomed.save(output / f"{name}-factor-1.1-zoom-90.png")
    print(f"  images {raw_one.size} vs zoomed {zoomed.size} height ratio {zoomed.height / raw_one.height:.4f}")
    fitted = zoomed.resize(raw_one.size, Image.Resampling.LANCZOS)
    print(f"  aligned MAE {mae(raw_one, fitted):.2f}")
