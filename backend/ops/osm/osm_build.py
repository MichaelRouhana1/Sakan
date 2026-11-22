"""Stage 2 (offline): out/raw.pkl + area-map.json + anchors -> out/candidates.json.

    python osm_build.py

- Maps every curated area to a polygon (area-map.json). Smallest polygon wins on overlap.
- Keeps EVERY named street piece inside a mapped polygon (no listing/campus proximity filter).
  Streets are clipped to the polygon, so a street crossing two areas becomes one entry per area.
- Merges pieces per name per area into one MultiLineString (union-find on shared normalized names).
- Anchor density (places with a pin + active campuses within 750 m) is a RANKING signal only.
- Collects place=neighbourhood|suburb candidates, parented by the containing mapped polygon.
"""
import json
import math
import pathlib
import pickle
import re
import time
from collections import Counter, defaultdict

import shapely.wkb
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping
from shapely.ops import linemerge, transform, unary_union
from shapely.strtree import STRtree

from normalize_py import GENERIC, normalize

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"
TO_M = Transformer.from_crs(4326, 32636, always_xy=True).transform
TO_DEG = Transformer.from_crs(32636, 4326, always_xy=True).transform

MIN_PIECE_M = 15          # slivers left over from clipping
MIN_STREET_M = 30         # merged street shorter than this is dropped (reported)
SIMPLIFY_M = 2
ANCHOR_RADIUS_M = 750
HOOD_PROXIMITY_M = 150    # a hood point just outside every polygon is parented to the nearest one within this
BEIRUT_RADIUS_M, TOWN_RADIUS_M = 400, 800
ARABIC = re.compile(r"[\u0600-\u06ff]")
HAND_REVIEW = [
    {"key": "Monot", "en": ["monot"], "ar": ["مونو"]},
    {"key": "Mar Mikhael", "en": ["mar mikhael", "mar mikhayel"], "ar": ["مار مخايل"]},
    {"key": "Gemmayzeh", "en": ["gemmayzeh", "gemayzeh", "jumayza", "jmeyzeh"], "ar": ["جميزه", "الجميزه"]},
    {"key": "Badaro", "en": ["badaro"], "ar": ["بدارو"]},
    {"key": "Sassine", "en": ["sassine", "sasin", "sursock"], "ar": ["ساسين"]},
]


def to_m(g):
    return transform(TO_M, g)


def to_deg(g):
    return transform(TO_DEG, g)


def is_arabic(s):
    return bool(ARABIC.search(s))


def junk_name(s):
    n = normalize(s)
    return not n or n.isdigit() or re.fullmatch(r"(?:street|rue|road|rd|avenue|av)?\s*\d+", n) is not None


def all_names(names):
    out = []
    for k, v in names.items():
        for part in re.split(r"\s*;\s*", v):  # noqa
            part = part.strip()
            if part:
                out.append((k, part))
    return out


def keys_of(names):
    ks, numeric = set(), set()
    for k, v in all_names(names):
        n = normalize(v)
        if n.replace(" ", "").isdigit():
            if k in ("name", "name:en", "name:ar", "name:fr"):
                numeric.add("#" + n.replace(" ", ""))
            continue
        if n and n not in GENERIC and len(n) > 1:
            ks.add(n)
    # Numbers ("Rue 60") are reused across a city, so they only group pieces that have no real name at all.
    return ks or numeric


class UF:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b):
        self.p[self.find(a)] = self.find(b)


def group_by_keys(items):
    """items: list of dicts with 'keys'. Returns list of index lists."""
    uf = UF(len(items))
    seen = {}
    for i, it in enumerate(items):
        for k in it["keys"]:
            if k in seen:
                uf.union(i, seen[k])
            else:
                seen[k] = i
    groups = defaultdict(list)
    for i in range(len(items)):
        groups[uf.find(i)].append(i)
    return list(groups.values())


def pick(counter):
    return counter.most_common(1)[0][0] if counter else None


def display_names(name_tags):
    """name_tags: list of dict(names). Returns (name_en, name_ar, flags)."""
    en, ar, fr, latin, arabic = Counter(), Counter(), Counter(), Counter(), Counter()
    flags = []
    for names in name_tags:
        if names.get("name:en") and not is_arabic(names["name:en"]):
            if junk_name(names["name:en"]):
                flags.append("junk-name:en-ignored")
            else:
                en[names["name:en"].strip()] += 1
        if names.get("name:ar"):
            ar[names["name:ar"].strip()] += 1
        if names.get("name:fr"):
            fr[names["name:fr"].strip()] += 1
        nm = names.get("name", "").strip()
        if nm:
            (arabic if is_arabic(nm) else latin)[nm] += 1
    name_en = pick(en)
    if not name_en and latin:
        name_en = pick(latin)
    if not name_en and fr:
        name_en = pick(fr)
        flags.append("english-name-from-french")
    name_ar = pick(ar) or pick(arabic)
    if not name_en:
        name_en = name_ar
        flags.append("no-latin-name")
    if not name_ar:
        name_ar = name_en
        flags.append("no-arabic-name")
    return name_en, name_ar, sorted(set(flags))


def alias_list(name_tags, primary):
    seen, out = set(), []
    skipped_numeric = 0
    for names in name_tags:
        for k, v in all_names(names):
            if v in seen or v in primary:
                continue
            n = normalize(v)
            if not n or n.isdigit() or junk_name(v):
                skipped_numeric += 1
                continue
            seen.add(v)
            lang = {"name:en": "en", "name:ar": "ar", "name:fr": "fr"}.get(k) or ("ar" if is_arabic(v) else "und")
            out.append({"alias": v, "language": lang, "tag": k})
    return out, skipped_numeric


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", normalize_ascii(s)).strip("-")
    return s


def normalize_ascii(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "").lower()
    return "".join(c for c in s if c.isascii())


def main():
    t0 = time.time()
    raw = pickle.load(open(OUT / "raw.pkl", "rb"))
    curated = [a for a in json.load(open(OUT / "curated-areas.json", encoding="utf-8")) if a["kind"] == "area"]
    anchors_doc = json.load(open(OUT / "anchors.json", encoding="utf-8"))
    amap = {k: v for k, v in json.load(open(HERE / "area-map.json", encoding="utf-8")).items() if not k.startswith("_")}
    by_id = {a["id"]: a for a in curated}
    polys = {p["osm"]: p for p in raw["polys"]}
    nodes = {h["osm"]: h for h in raw["hood_nodes"]}

    # ---------- 1. area polygons ----------
    unknown = set(by_id) - set(amap)
    if unknown:
        raise SystemExit(f"curated areas missing from area-map.json: {sorted(unknown)}")
    area_poly, area_meta, area_buf = {}, {}, {}
    for aid, spec in amap.items():
        if aid not in by_id:
            raise SystemExit(f"area-map.json references unknown area {aid}")
        if "osm" in spec:
            parts = []
            for rid in spec["osm"]:
                if rid not in polys:
                    raise SystemExit(f"{aid}: OSM polygon {rid} not in extract")
                parts.append(to_m(shapely.wkb.loads(polys[rid]["wkb"], hex=True).buffer(0)))
            g = unary_union(parts)
            prov = "osm:" + "+".join(spec["osm"])
        else:
            d = spec["derive"]
            if d["center"] == "curated":
                c = Point(by_id[aid]["lng"], by_id[aid]["lat"])
            else:
                n = nodes[d["center"]]
                c = Point(n["lon"], n["lat"])
            g = to_m(c).buffer(d["radius_m"])
            prov = f"derived:{d['center']}:{d['radius_m']}m"
        for rid in spec.get("clip", []):
            g = g.intersection(to_m(shapely.wkb.loads(polys[rid]["wkb"], hex=True).buffer(0)))
        g = g.buffer(0)
        area_poly[aid] = g
        if spec.get("buffer_m"):
            area_buf[aid] = g.buffer(spec["buffer_m"])
        city = by_id[aid]["parent_city_id"]
        area_meta[aid] = {
            "id": aid, "nameEn": by_id[aid]["name_en"], "nameAr": by_id[aid]["name_ar"], "parentCityId": city,
            "radiusM": BEIRUT_RADIUS_M if city == "city:beirut" else TOWN_RADIUS_M,
            "provenance": prov, "kind": "osm-polygon" if "osm" in spec else "derived-circle",
            "areaKm2": round(g.area / 1e6, 3), "note": spec.get("note", ""), "buffer_m": spec.get("buffer_m", 0),
        }
    order = sorted(area_poly, key=lambda a: area_poly[a].area)
    tree_geoms = [area_poly[a] for a in order]
    tree = STRtree(tree_geoms)
    # Second pass only: sector polygons whose borders run along street centrelines are widened by buffer_m,
    # but the widened band only captures pieces that fall outside every raw polygon (no border stubs).
    buf_order = [a for a in order if a in area_buf]
    buf_geoms = [area_buf[a] for a in buf_order]
    buf_tree = STRtree(buf_geoms) if buf_geoms else None

    def containing_area(pt_m, tolerance_m=0):
        """Smallest mapped polygon containing the point. Returns (area_id, distance_m or 0)."""
        hits = [i for i in tree.query(pt_m, predicate="intersects")]
        if hits:
            return order[min(hits)], 0
        if tolerance_m:
            near = [(tree_geoms[i].distance(pt_m), i) for i in tree.query(pt_m.buffer(tolerance_m), predicate="intersects")]
            near = [(d, i) for d, i in near if d <= tolerance_m]
            if near:
                d, i = min(near)
                return order[i], round(d)
        return None, 0

    # ---------- 2. clip every named street piece to its smallest containing area ----------
    pieces = defaultdict(list)   # aid -> list of dict(line_m, names, osm, highway)
    outside = 0
    total_ways = len(raw["streets"])
    for st in raw["streets"]:
        line = to_m(LineString(st["coords"]))
        if line.length < 1:
            continue
        rem = line
        hit_idx = sorted(tree.query(line, predicate="intersects"))
        any_hit = False
        for i in hit_idx:
            if rem.is_empty:
                break
            clipped = rem.intersection(tree_geoms[i])
            if clipped.is_empty:
                continue
            rem = rem.difference(tree_geoms[i])
            any_hit = True
            for part in getattr(clipped, "geoms", [clipped]):
                if part.geom_type == "LineString" and part.length >= MIN_PIECE_M:
                    pieces[order[i]].append({"line": part, "names": st["names"], "osm": st["osm"], "highway": st["highway"]})
        if buf_tree is not None and not rem.is_empty:
            for j in sorted(buf_tree.query(rem, predicate="intersects")):
                if rem.is_empty:
                    break
                clipped = rem.intersection(buf_geoms[j])
                if clipped.is_empty:
                    continue
                rem = rem.difference(buf_geoms[j])
                any_hit = True
                for part in getattr(clipped, "geoms", [clipped]):
                    if part.geom_type == "LineString" and part.length >= MIN_STREET_M:
                        pieces[buf_order[j]].append({"line": part, "names": st["names"], "osm": st["osm"], "highway": st["highway"]})
        if not any_hit:
            outside += 1

    # ---------- 3. merge per name per CITY (one entry even when a street crosses area borders) ----------
    anchors_m = [(a["type"], to_m(Point(a["lng"], a["lat"]))) for a in anchors_doc["anchors"]]
    streets, dropped_short, skipped_numeric_aliases = [], 0, 0
    geoms_m = {}
    used_slugs = Counter()
    by_city = defaultdict(list)
    for aid in order:
        for it in pieces.get(aid, []):
            it["aid"] = aid
            by_city[by_id[aid]["parent_city_id"]].append(it)
    for city_id in sorted(by_city):
        items = by_city[city_id]
        for it in items:
            it["keys"] = keys_of(it["names"])
        # pieces with no usable key keep their own raw name as key
        for it in items:
            if not it["keys"]:
                it["keys"] = {normalize(it["names"]["name"]) or f"way-{it['osm']}"}
        for idxs in group_by_keys(items):
            grp = [items[i] for i in idxs]
            area_len = Counter()
            for g in grp:
                area_len[g["aid"]] += g["line"].length
            aid = area_len.most_common(1)[0][0]
            multi_area = len(area_len) > 1
            merged = linemerge([g["line"] for g in grp])
            lines = list(getattr(merged, "geoms", [merged]))
            geom = MultiLineString(lines).simplify(SIMPLIFY_M, preserve_topology=True)
            if geom.geom_type == "LineString":
                geom = MultiLineString([geom])
            length = sum(l.length for l in geom.geoms)
            if length < MIN_STREET_M:
                dropped_short += 1
                continue
            name_en, name_ar, flags = display_names([g["names"] for g in grp])
            aliases, skipped = alias_list([g["names"] for g in grp], {name_en, name_ar})
            skipped_numeric_aliases += skipped
            hw = Counter(g["highway"] for g in grp).most_common(1)[0][0]
            buf = geom.buffer(ANCHOR_RADIUS_M)
            near = [t for t, p in anchors_m if buf.contains(p)]
            scope_slug = city_id.split(":", 1)[1] if multi_area else by_id[aid]["slug"]
            if "no-latin-name" in flags:
                # Arabic-only: the id comes from the OSM way, never from a transliteration.
                slug = f"{by_id[aid]['slug']}-osm-{min(g['osm'] for g in grp)}"
            else:
                base = slugify(name_en) or "street"
                slug = f"{base}-{scope_slug}"
            used_slugs[slug] += 1
            if used_slugs[slug] > 1:
                slug = f"{slug}-{min(g['osm'] for g in grp)}"
            geom_deg = to_deg(geom)
            c = to_deg(geom.representative_point())
            pn_en, pn_ar = normalize(name_en), normalize(name_ar)
            if pn_en.replace(" ", "").isdigit() and (pn_ar.replace(" ", "").isdigit() or pn_ar == pn_en):
                flags = sorted(set(flags) | {"numbered-only"})
            norm_keys = sorted(keys_of({"a": name_en, "b": name_ar, **{f"x{i}": a["alias"] for i, a in enumerate(aliases)}}))
            geoms_m[f"street:{slug}"] = geom
            streets.append({
                "normKeys": norm_keys,
                "id": f"street:{slug}", "slug": slug, "parentAreaId": aid, "cityId": city_id, "multiArea": multi_area,
                "areaLengthsM": {a: round(l) for a, l in area_len.most_common()},
                "nameEn": name_en, "nameAr": name_ar, "aliases": aliases,
                "primaryNorm": normalize(name_en), "primaryNormAr": normalize(name_ar),
                "osmWayIds": sorted({g["osm"] for g in grp}), "highway": hw, "lengthM": round(length),
                "anchors": {"places": near.count("place"), "campuses": near.count("campus")},
                "anchorScore": near.count("place") + 3 * near.count("campus"),
                "flags": flags, "radiusM": area_meta[aid]["radiusM"],
                "centroid": {"lat": round(c.y, 6), "lng": round(c.x, 6)},
                "geom": {"type": "MultiLineString",
                         "coordinates": [[[round(x, 6), round(y, 6)] for x, y in l.coords] for l in geom_deg.geoms]},
            })

    # ---------- 3b. same-name streets split across adjacent areas of one city (reported, not merged) ----------
    cross, seen_pairs = [], set()
    key_index = defaultdict(list)
    for s in streets:
        for k in s["normKeys"]:
            key_index[k].append(s)
    for k, group in key_index.items():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                if a["parentAreaId"] == b["parentAreaId"]:
                    continue
                if by_id[a["parentAreaId"]]["parent_city_id"] != by_id[b["parentAreaId"]]["parent_city_id"]:
                    continue
                pair = tuple(sorted((a["id"], b["id"])))
                if pair in seen_pairs:
                    continue
                if geoms_m[a["id"]].distance(geoms_m[b["id"]]) <= 30:
                    seen_pairs.add(pair)
                    cross.append({"name": a["nameEn"], "a": a["id"], "b": b["id"], "aLengthM": a["lengthM"], "bLengthM": b["lengthM"],
                                  "city": by_id[a["parentAreaId"]]["parent_city_id"]})

    # ---------- 4. neighbourhood candidates ----------
    hood_items = []
    outside_hoods = 0
    for h in raw["hood_nodes"]:
        aid, dist = containing_area(to_m(Point(h["lon"], h["lat"])), HOOD_PROXIMITY_M)
        if not aid:
            outside_hoods += 1
            continue
        hood_items.append({"osm": h["osm"], "names": h["names"], "place": h["place"], "lat": h["lat"], "lng": h["lon"], "aid": aid, "dist": dist})
    for p in raw["polys"]:
        if p["place"] in ("neighbourhood", "suburb"):
            g = shapely.wkb.loads(p["wkb"], hex=True)
            rp = g.representative_point()
            aid, dist = containing_area(to_m(rp), HOOD_PROXIMITY_M)
            if not aid:
                outside_hoods += 1
                continue
            hood_items.append({"osm": p["osm"], "names": p["names"], "place": p["place"], "lat": rp.y, "lng": rp.x, "aid": aid, "dist": dist})
    hoods = []
    by_area = defaultdict(list)
    for it in hood_items:
        by_area[it["aid"]].append(it)
    for aid, items in by_area.items():
        for it in items:
            ks = set(keys_of(it["names"]))
            for k in list(ks):   # al/el/ال-stripped twin so 'Hamra' and 'El Hamra' group together (grouping only)
                ks.add(re.sub(r"^(?:al|el|ال)\s*", "", k))
            it["keys"] = ks
        for idxs in group_by_keys(items):
            grp = [items[i] for i in idxs]
            name_en, name_ar, flags = display_names([g["names"] for g in grp])
            aliases, _ = alias_list([g["names"] for g in grp], {name_en, name_ar})
            md = max(g["dist"] for g in grp)
            if md:
                flags = sorted(set(flags) | {f"parent-by-proximity-{md}m"})
            lat = sum(g["lat"] for g in grp) / len(grp)
            lng = sum(g["lng"] for g in grp) / len(grp)
            slug = slugify(name_en) or f"hood-{grp[0]['osm']}"
            hoods.append({
                "id": f"hood:{slug}", "slug": slug, "parentAreaId": aid, "nameEn": name_en, "nameAr": name_ar,
                "aliases": aliases, "osmIds": sorted(g["osm"] for g in grp), "places": sorted({g["place"] for g in grp}),
                "primaryNorm": normalize(name_en), "primaryNormAr": normalize(name_ar),
                "lat": round(lat, 6), "lng": round(lng, 6), "flags": flags, "radiusM": area_meta[aid]["radiusM"],
                "origin": "osm-place",
            })
    # hood slug collisions across areas
    cnt = Counter(h["slug"] for h in hoods)
    for h in hoods:
        if cnt[h["slug"]] > 1:
            h["slug"] = f"{h['slug']}-{by_id[h['parentAreaId']]['slug']}"
            h["id"] = f"hood:{h['slug']}"

    # ---------- 5. hand-review block ----------
    hand = []
    for spec in HAND_REVIEW:
        want = set(spec["en"]) | set(spec["ar"])
        found_hoods = [h for h in hoods if {h["primaryNorm"], h["primaryNormAr"]} & want or any(normalize(a["alias"]) in want for a in h["aliases"])]
        raw_nodes = [n for n in raw["hood_nodes"] if keys_of(n["names"]) & want]
        raw_polys = []
        for p in raw["polys"]:
            if keys_of(p["names"]) & want:
                g = shapely.wkb.loads(p["wkb"], hex=True)
                raw_polys.append({"osm": p["osm"], "admin_level": p["admin_level"], "place": p["place"], "names": p["names"],
                                  "areaKm2": round(to_m(g).area / 1e6, 3)})
        st = [s for s in streets if {s["primaryNorm"], s["primaryNormAr"]} & want or any(normalize(a["alias"]) in want for a in s["aliases"])]
        derived = None
        if not raw_nodes and st:
            # No OSM neighbourhood: propose a centroid derived from the matching streets (never auto-approved).
            best = max(st, key=lambda s: s["lengthM"])
            derived = {"fromStreet": best["id"], "parentAreaId": best["parentAreaId"], "lat": best["centroid"]["lat"],
                       "lng": best["centroid"]["lng"], "nameEn": spec["key"]}
        hand.append({"key": spec["key"], "hoodCandidates": [h["id"] for h in found_hoods],
                     "osmNodes": [{"osm": n["osm"], "place": n["place"], "names": n["names"], "lat": n["lat"], "lng": n["lon"]} for n in raw_nodes],
                     "osmPolygons": raw_polys, "streets": [s["id"] for s in st], "derivedProposal": derived})

    stats = {
        "ways_total_named": total_ways, "ways_outside_all_areas": outside,
        "streets_kept": len(streets), "streets_dropped_shorter_than_30m": dropped_short,
        "hood_candidates": len(hoods), "hood_nodes_outside_all_areas": outside_hoods,
        "cross_area_same_name_pairs": len(cross),
        "streets_numbered_only": sum(1 for s in streets if "numbered-only" in s["flags"]),
        "numeric_or_junk_aliases_skipped": skipped_numeric_aliases,
        "min_street_length_m": MIN_STREET_M, "simplify_m": SIMPLIFY_M, "anchor_radius_m": ANCHOR_RADIUS_M,
        "elapsed_s": round(time.time() - t0, 1),
    }
    doc = {
        "meta": {"pbf": raw["pbf"], "pbf_md5": raw["pbf_md5"], "pbf_bytes": raw["pbf_bytes"],
                 "pbf_mtime_utc": time.strftime("%Y-%m-%d", time.gmtime(raw["pbf_mtime"])),
                 "live_eligible_units_at_build": anchors_doc["liveEligibleUnits"], "anchors": len(anchors_doc["anchors"]),
                 "radius_rule": {"beirut_m": BEIRUT_RADIUS_M, "matn_and_towns_m": TOWN_RADIUS_M}},
        "stats": stats, "areas": [area_meta[a] for a in sorted(area_meta)], "streets": streets, "hoods": hoods, "handReview": hand,
        "crossAreaSplits": cross,
    }
    (OUT / "candidates.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    feats = [{"type": "Feature", "properties": {"id": a, **area_meta[a]}, "geometry": mapping(to_deg(area_poly[a]))} for a in sorted(area_poly)]
    (OUT / "area-polygons.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}), encoding="utf-8")
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
