"""Python port of search_normalize v2, used ONLY to group OSM segments/names inside the offline script.

Postgres stays authoritative: osm_review (Node) recomputes every alias with the real SQL function and
fails if any value differs from the one computed here (parity check).
"""
import re
import unicodedata

from gen_normalize_sql import latin_pairs

_LATIN = latin_pairs()
_AR_SRC = "أإآٱىیكکة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹"
_AR_DST = "ااااييككه01234567890123456789"
_TABLE = str.maketrans({**{k: v for k, v in _LATIN.items()}, **dict(zip(_AR_SRC, _AR_DST))})
_MARKS = re.compile(
    "[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]"
)
GENERIC = {"street", "rue", "road", "rd", "avenue", "av", "شارع", "طريق"}


def normalize(value):
    s = unicodedata.normalize("NFKC", value or "")
    s = _MARKS.sub("", s).lower()
    s = s.replace("æ", "ae").replace("œ", "oe").replace("ß", "ss").translate(_TABLE)
    s = re.sub(r"[\W_]+", " ", s).strip()
    s = re.sub(r"ء+(\s|$)", r"\1", s)
    s = re.sub(r"\s+", " ", s).strip()
    toks = [t for t in s.split(" ") if t]
    kept = [t for t in toks if t not in GENERIC]
    return " ".join(kept) if kept else s


GOLDEN = [
    ("الحمراء", "الحمرا"), ("Bliss Street", "bliss"), ("Rue Bliss", "bliss"), ("شارع بليس", "بليس"),
    ("Bliss St", "bliss st"), ("St. Joseph", "st joseph"), ("street", "street"), ("Rue", "rue"),
    ("Avenue de Paris", "de paris"), ("Achrafié", "achrafie"), ("مدرسة", "مدرسه"), ("أشرفية", "اشرفيه"),
]

if __name__ == "__main__":
    bad = [(a, normalize(a), b) for a, b in GOLDEN if normalize(a) != b]
    print("python normalize golden:", "ok" if not bad else bad)
    raise SystemExit(1 if bad else 0)
