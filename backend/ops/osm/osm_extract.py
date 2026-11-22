"""Stage 1 (offline): Geofabrik Lebanon extract -> out/raw.pkl.

    python osm_extract.py [--pbf PATH] [--download]

Reads the PBF once and keeps only what the later stages need:
  - named highways, residential and above (+ pedestrian, living_street); no service/track/footway/path/steps,
    no motorway or *_link
  - place=neighbourhood|suburb nodes and polygons
  - boundary=administrative / place polygons (names only) used to map curated areas

No network access is needed after the PBF is cached. Nothing here touches the database.
"""
import argparse
import hashlib
import pathlib
import pickle
import sys
import urllib.request

import osmium
import shapely.wkb

HERE = pathlib.Path(__file__).parent
CACHE = HERE / ".cache"
OUT = HERE / "out"
PBF_URL = "https://download.geofabrik.de/asia/lebanon-latest.osm.pbf"

HIGHWAYS = {
    "residential", "unclassified", "living_street", "tertiary", "secondary", "primary", "trunk", "pedestrian",
}
NAME_KEYS = ["name", "name:en", "name:ar", "name:fr", "alt_name", "old_name"]
HOOD_PLACES = {"neighbourhood", "suburb"}
CONTEXT_PLACES = {"city", "town", "village", "hamlet", "quarter", "suburb", "neighbourhood", "borough", "municipality"}


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(pbf):
    CACHE.mkdir(exist_ok=True)
    print(f"downloading {PBF_URL}")
    urllib.request.urlretrieve(PBF_URL, pbf)
    md5_url = PBF_URL + ".md5"
    expected = urllib.request.urlopen(md5_url).read().decode().split()[0]
    actual = md5_of(pbf)
    if expected != actual:
        raise SystemExit(f"md5 mismatch: expected {expected} got {actual}")
    pathlib.Path(str(pbf) + ".md5").write_text(f"{expected}  {pbf.name}\n")


def names_of(tags):
    return {k: tags[k] for k in NAME_KEYS if k in tags and tags[k].strip()}


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.wkb = osmium.geom.WKBFactory()
        self.streets = []
        self.hood_nodes = []
        self.polys = []

    def node(self, n):
        p = n.tags.get("place")
        if p in HOOD_PLACES and "name" in n.tags and n.location.valid():
            self.hood_nodes.append({"osm": f"n{n.id}", "place": p, "names": names_of(n.tags), "lon": n.location.lon, "lat": n.location.lat})

    def way(self, w):
        hw = w.tags.get("highway")
        if hw not in HIGHWAYS or "name" not in w.tags:
            return
        coords = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
        if len(coords) < 2:
            return
        self.streets.append({"osm": w.id, "highway": hw, "names": names_of(w.tags), "coords": coords})

    def area(self, a):
        t = a.tags
        if "name" not in t:
            return
        adm = t.get("boundary") == "administrative" and t.get("admin_level") in {"4", "5", "6", "7", "8", "9", "10", "11"}
        pl = t.get("place")
        if not (adm or pl in CONTEXT_PLACES):
            return
        try:
            geom = shapely.wkb.loads(self.wkb.create_multipolygon(a), hex=True)
        except Exception as exc:  # broken multipolygons are skipped, never fatal
            print(f"skip area {a.orig_id()}: {exc}", file=sys.stderr)
            return
        self.polys.append({
            "osm": f"{'w' if a.from_way() else 'r'}{a.orig_id()}",
            "admin_level": t.get("admin_level"), "place": pl, "names": names_of(t), "wkb": geom.wkb_hex,
        })


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", default=str(CACHE / "lebanon-latest.osm.pbf"))
    ap.add_argument("--download", action="store_true")
    args = ap.parse_args()
    pbf = pathlib.Path(args.pbf)
    if args.download or not pbf.exists():
        download(pbf)
    md5 = md5_of(pbf)
    print(f"pbf {pbf} md5={md5}")
    h = Handler()
    h.apply_file(str(pbf), locations=True, idx="flex_mem")
    OUT.mkdir(exist_ok=True)
    payload = {
        "pbf": pbf.name, "pbf_md5": md5, "pbf_bytes": pbf.stat().st_size,
        "pbf_mtime": pbf.stat().st_mtime, "streets": h.streets, "hood_nodes": h.hood_nodes, "polys": h.polys,
    }
    with open(OUT / "raw.pkl", "wb") as f:
        pickle.dump(payload, f)
    print(f"streets(ways)={len(h.streets)} hood_nodes={len(h.hood_nodes)} polys={len(h.polys)}")


if __name__ == "__main__":
    main()
