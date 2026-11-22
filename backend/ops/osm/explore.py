import pickle, pathlib, json
import shapely.wkb
from shapely.geometry import Point
here = pathlib.Path(__file__).parent
raw = pickle.load(open(here / "out" / "raw.pkl", "rb"))
terms = ["antelias", "انطلياس", "أنطلياس", "broummana", "برمانا", "dbayeh", "dbayyeh", "ضبيه", "ضبية", "jounieh", "جونيه", "جونية", "kaslik", "كسليك", "bhamdoun", "بحمدون", "zahle", "zahlé", "زحلة", "nabatieh", "النبطية", "zouk mos", "ذوق مصبح", "jbeil", "byblos", "حارة صخر", "haret sakher", "sarba", "فيطرون", "adma", "ghazir"]
for p in raw["polys"]:
    s = json.dumps(p["names"], ensure_ascii=False).lower()
    if any(t in s for t in terms):
        g = shapely.wkb.loads(p["wkb"], hex=True)
        print("poly", p["osm"], "L" + str(p["admin_level"]), p["place"], p["names"].get("name"), "|", p["names"].get("name:en"), f"{g.area*111*111*0.83:.2f}km2", f"({g.centroid.y:.3f},{g.centroid.x:.3f})")
for h in raw["hood_nodes"]:
    s = json.dumps(h["names"], ensure_ascii=False).lower()
    if any(t in s for t in terms):
        print("node", h["osm"], h["place"], h["names"].get("name"), "|", h["names"].get("name:en"), h["lat"], h["lon"])
