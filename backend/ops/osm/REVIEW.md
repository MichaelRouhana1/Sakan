# OSM streets and neighbourhoods: review

Generated from `decisions.json` + the OSM extract. The seed (`backend/src/db/seeds/osm/streets.seed.json`) contains only what is ticked here.

**To change a decision:** tick or untick a box below, then run `node backend/ops/osm/osm_review.mjs --sync-ticks` (copies ticks into `decisions.json` and regenerates the seed), then `npm run db:search:osm-apply`.

Data: Geofabrik `lebanon-latest.osm.pbf` (md5 `141868449a859420e76b9bad4f13dbd8`, file date 2026-11-22). Contains data © OpenStreetMap contributors (ODbL).

## 1. Numbers

| | |
|---|---|
| Named highway ways read (residential and above, plus pedestrian/living_street, no service) | 8716 |
| Ways entirely outside every mapped curated-area polygon | 6315 |
| Streets after merging same-name pieces per city | 1000 |
| Numbered-only streets ("Rue 83") | 309 (excluded) |
| **Streets in the seed** | **689** |
| of which span more than one area (shown with the city only) | 34 |
| Merged streets dropped for being shorter than 30 m | 14 |
| Neighbourhood candidates | 56: 49 proposable, 7 dupes |
| **Neighbourhoods in the seed (ticked)** | **18** (hood:aicha-bakkar, hood:ain-el-tineh, hood:tallet-khayat, hood:moussaitbeh, hood:ayn-el-mrayseh, hood:qantari, hood:manara, hood:qoreitem, hood:raoucheh, hood:snoubra, hood:furn-el-hayek, hood:mar-mitr, hood:monot, hood:syoufi, hood:karm-el-zeitoun, hood:adliyeh, hood:tell-chiha, hood:zahrieh) |
| Alias additions to existing entries in the seed (ticked) | 3 |
| Existing catalog aliases compared against (areas, cities, campuses; en/ar/fr) | 1375 |
| Seed file size | 438 KB |

Scope: every named street inside a curated area's mapped polygon. Same-name pieces within one city are one entry with one MultiLineString geometry, parented to the area holding most of the length; different cities stay separate. Anchor density (places + campuses within 750 m) only ranks.

## 2. Radius per area (stored on the area, inherited by its streets and hoods)

Beirut areas **400 m**; Matn and all towns **800 m**.

| Area | City | Radius | Polygon | Provenance | km² | Streets parented here | Note |
|---|---|---|---|---|---|---|---|
| Achrafieh (`area:achrafieh`) | Beirut | 400 m | osm-polygon | `osm:r3074290` | 3.239 | 178 | Cadastral quartier Achrafieh (admin_level 7) |
| Aley (`area:aley`) | Aley | 800 m | osm-polygon | `osm:r10605904` | 8.92 | 4 |  |
| Antelias (`area:antelias`) | Antelias | 800 m | osm-polygon | `osm:r7322344` | 2.759 | 8 |  |
| Baalbek (`area:baalbek`) | Baalbek | 800 m | osm-polygon | `osm:r3095790` | 32.379 | 2 |  |
| Badaro (`area:badaro`) | Beirut | 400 m | derived-circle | `derived:n291429004:500m` | 0.691 | 36 | No OSM polygon; 500 m circle around the OSM Badaro node, inside Beirut governorate |
| Bhamdoun (`area:bhamdoun`) | Bhamdoun | 800 m | derived-circle | `derived:curated:1200m` | 4.517 | 1 | No OSM polygon for Bhamdoun itself; 1.2 km circle around the curated centroid |
| Broummana (`area:broummana`) | Broummana | 800 m | osm-polygon | `osm:r12691596` | 4.038 | 2 |  |
| Byblos (`area:byblos`) | Byblos | 800 m | osm-polygon | `osm:r9204616` | 4.2 | 3 |  |
| Dbayeh (`area:dbayeh`) | Dbayeh | 800 m | osm-polygon | `osm:r7276833` | 2.537 | 6 |  |
| Dekwaneh (`area:dekwaneh`) | Dekwaneh | 800 m | osm-polygon | `osm:r7371104` | 1.811 | 15 |  |
| Fanar (`area:fanar`) | Fanar | 800 m | osm-polygon | `osm:r9106590` | 2.638 | 19 |  |
| Furn El Chebbak (`area:furn-el-chebbak`) | Furn El Chebbak | 800 m | osm-polygon | `osm:r11561178` | 0.863 | 6 |  |
| Gemmayzeh (`area:gemmayzeh`) | Beirut | 400 m | osm-polygon | `osm:r7073578` | 0.157 | 21 | OSM sector named Jumayza (Gemmayzeh) |
| Hamra (`area:hamra`) | Beirut | 400 m | osm-polygon | `osm:r7120346` | 0.546 | 40 | OSM sector 'El Hamra' (admin_level 8) |
| Jnah (`area:jnah`) | Beirut | 400 m | derived-circle | `derived:curated:700m` | 0.212 | 6 | No OSM polygon or node; 700 m circle around the curated centroid, inside Beirut governorate |
| Jounieh (`area:jounieh`) | Jounieh | 800 m | derived-circle | `derived:curated:2500m` | 19.603 | 13 | No OSM polygon found for Jounieh; 2.5 km circle around the curated centroid, now moved to the coastal town centre (OSM Jounieh Municipality w-way at 33.9848,35.6340; AUL Jounieh campus is 350 m away). Kaslik/Sarba carves out first |
| Kaslik (`area:kaslik`) | Jounieh | 800 m | osm-polygon | `osm:r8548470` | 1.962 | 3 | OSM municipality Sarba, which contains the curated Kaslik centroid |
| Mar Mikhael (`area:mar-mikhael`) | Beirut | 400 m | osm-polygon | `osm:r7080256` | 0.522 | 22 | OSM sector 'Mar Mikhael' (admin_level 8) |
| Nabatieh (`area:nabatieh`) | Nabatieh | 800 m | osm-polygon | `osm:r14911748+r17810844` | 15.436 | 15 | Nabatieh Et Tahta + El Fawqa |
| Ras Beirut (`area:ras-beirut`) | Beirut | 400 m | osm-polygon | `osm:r3074298` | 2.498 | 66 | Cadastral quartier Ras Beirut (admin_level 7); Hamra and Verdun carve out first |
| Saida (`area:saida`) | Saida | 800 m | osm-polygon | `osm:r16414025` | 8.24 | 40 |  |
| Tariq El Jdide (`area:tariq-el-jdide`) | Beirut | 400 m | osm-polygon | `osm:r7122723` | 0.371 | 30 | OSM sector Tariq El Jdideh |
| Tripoli (`area:tripoli`) | Tripoli | 800 m | osm-polygon | `osm:r4869639` | 21.292 | 48 |  |
| Tyre (`area:tyre`) | Tyre | 800 m | osm-polygon | `osm:r12196423` | 6.205 | 10 |  |
| Verdun (`area:verdun`) | Beirut | 400 m | derived-circle | `derived:n2393710317:600m` | 1.121 | 67 | No OSM polygon; 600 m circle around the OSM Verdun node, inside Beirut governorate |
| Zahle (`area:zahle`) | Zahle | 800 m | derived-circle | `derived:curated:2000m` | 12.546 | 23 | No OSM polygon found for Zahle; 2 km circle around the curated centroid |
| Zouk Mosbeh (`area:zouk-mosbeh`) | Zouk Mosbeh | 800 m | osm-polygon | `osm:r7696383` | 5.085 | 5 |  |

Maps of the derived circles: `artifacts/osm-streets/maps/`.

## 3. Hand review: Monot, Mar Mikhael, Gemmayzeh, Badaro, Sassine

### Monot

- OSM place node `n4807360293` (neighbourhood) {"name":"مونو","name:en":"Monot","name:ar":"مونو","name:fr":"Monot"} at 33.88896, 35.50784
- Street `street:monot-achrafieh`: Monot / شارع مونو · Achrafieh, Beirut, 172 m
- **Proposed neighbourhood**, parent Achrafieh, Beirut, radius 400 m.
- [x] `hood:monot` Monot / مونو

### Mar Mikhael

- OSM place node `n4935828785` (neighbourhood) {"name":"مار مخايل","name:en":"Mar Mikhael","name:ar":"مار مخايل","name:fr":"Mar Mikhael","alt_name":"Mar Mkhayel"} at 33.89686, 35.52516
- OSM polygon `r7080256` (admin_level 8) {"name":"مار مخايل","name:en":"Mar Mikhael","name:ar":"مار مخايل","name:fr":"Mar Mikhael"}, 0.522 km²
- Street `street:mar-mikhael-mar-mikhael`: Mar Mikhael / شارع مار مخائيل · Mar Mikhael, Beirut, 150 m
- **Already in the catalog, nothing added.** `area:mar-mikhael` via en "Mar Mikhael"; `area:mar-mikhael` via und "mar-mikhael"; `area:mar-mikhael` via ar "مار مخايل"

### Gemmayzeh

- OSM place node `n291406964` (neighbourhood) {"name":"جميزة","name:en":"Gemmayzeh","name:ar":"جميزة","name:fr":"Gemmayzé"} at 33.89695, 35.50969
- OSM polygon `r7073578` (admin_level 8) {"name":"جميزة","name:en":"Jumayza","name:ar":"جميزة","name:fr":"Gemmayzé"}, 0.157 km²
- Street `street:jemmayzeh-gemmayzeh`: Jemmayzeh / شارع الجميزة · Gemmayzeh, Beirut, 95 m
- **Already in the catalog, nothing added.** `area:gemmayzeh` via en "Gemmayzeh"; `area:gemmayzeh` via und "gemmayzeh"; `area:gemmayzeh` via en "Gemmayze"

### Badaro

- OSM place node `n291429004` (neighbourhood) {"name":"بدارو","name:en":"Badaro","name:ar":"بدارو","name:fr":"Badaro"} at 33.87580, 35.51605
- Street `street:badaro-street-badaro`: Badaro Street / شارع بدارو · Badaro, Beirut, 679 m
- **Already in the catalog, nothing added.** `area:badaro` via en "Badaro"; `area:badaro` via und "badaro"; `area:badaro` via ar "بدارو"

### Sassine

- No OSM `place=neighbourhood|suburb` exists for this name.
- Street `street:rue-sassine-achrafieh`: Rue Sassine / شارع ساسين · Achrafieh, Beirut, 859 m; extra alias "Sassine"
- **Proposed neighbourhood (derived from the street, not an OSM place)**, parent Achrafieh, Beirut, radius 400 m.
- [ ] `hood:sassine` Sassine / ساسين

## 4. Proposed neighbourhoods (49): 18 ticked

| Approve | id | English / Arabic | Parent area | Nearest existing area | Flags |
|---|---|---|---|---|---|
| - [x] `hood:aicha-bakkar` | Aicha Bakkar / عائشة بكار | Verdun, Beirut | Verdun (0.7 km) | parent-by-proximity-48m; near "Aicha Bakkar" (Aicha Bakkar, 1); near "Rue Aicha Bakkar" (Rue Aicha Bakkar, 1) |
| - [x] `hood:ain-el-tineh` | Ain El Tineh / عين التينة | Verdun, Beirut | Verdun (0.3 km) | near "Ain El Tineh" (Ain El Tineh, 1) |
| - [x] `hood:tallet-khayat` | Tallet Khayat / تلة الخيّاط | Verdun, Beirut | Verdun (0.5 km) | near "Tallet Khayat" (Tallet Khayat, 1) |
| - [ ] `hood:dar-al-fatwa` | Dar Al Fatwa / دار الفتوى | Verdun, Beirut | Verdun (0.5 km) |  |
| - [x] `hood:moussaitbeh` | Moussaitbeh / المصيطبة | Verdun, Beirut | Verdun (0.6 km) | parent-by-proximity-16m; near "Moussaitbeh" (Moussaitbeh, 1) |
| - [ ] `hood:palais-de-justice` | Palais de Justice / العدلية | Badaro, Beirut | Badaro (0.3 km) | near "Palais de Justice" (Adliyeh, 1); near "Place du Palais de Justice" (Place du Palais de Justice, 0.75) |
| - [ ] `hood:park` | Park / البارك | Badaro, Beirut | Badaro (0.5 km) |  |
| - [ ] `hood:nabatieh-et-tahta` | Nabatieh et Tahta / نبطية التحتى | Nabatieh | Nabatieh (0.1 km) |  |
| - [ ] `hood:american-university` | American University / الجامعة الأمريكية | Hamra, Beirut | Hamra (0.4 km) | parent-by-proximity-116m; near "American University Street" (American University Street, 1) |
| - [x] `hood:ayn-el-mrayseh` | Ayn El Mrayseh / عين المريسة | Ras Beirut, Beirut | Hamra (0.8 km) | parent-by-proximity-97m; near "Ayn El Mrayseh" (Ayn El Mrayseh, 1) |
| - [x] `hood:qantari` | Qantari / القنطاري | Ras Beirut, Beirut | Hamra (1.0 km) | parent-by-proximity-76m; near "Qantari" (Qantari, 1) |
| - [x] `hood:manara` | Manara / المنارة | Ras Beirut, Beirut | Ras Beirut (0.7 km) | near "Manara" (Manara, 1); near "Manara" (Manara, 1) |
| - [x] `hood:qoreitem` | Qoreitem / قريطم | Ras Beirut, Beirut | Hamra (0.8 km) | near "Qoreitem" (Qoreitem, 1) |
| - [x] `hood:raoucheh` | Raoucheh / الروشة | Ras Beirut, Beirut | Verdun (0.9 km) | near "Raoucheh" (Raoucheh, 1) |
| - [x] `hood:snoubra` | Snoubra / الصنوبرة | Ras Beirut, Beirut | Hamra (0.6 km) | near "Snoubra" (Snoubra, 1) |
| - [ ] `hood:janbulat` | Janbulat / جنبلاط | Ras Beirut, Beirut | Hamra (0.7 km) |  |
| - [ ] `hood:tel-druze` | Tel Druze / تلة الدروز | Ras Beirut, Beirut | Hamra (0.7 km) | parent-by-proximity-60m |
| - [ ] `hood:yesouiyeh` | Yesouiyeh / اليسوعية | Achrafieh, Beirut | Gemmayzeh (0.9 km) | parent-by-proximity-139m |
| - [x] `hood:furn-el-hayek` | Furn El Hayek / فرن الحايك | Achrafieh, Beirut | Achrafieh (0.5 km) | near "Furn El Hayek" (Furn El Hayek, 1); near "Furn El-Hayek" (Furn El-Hayek, 1) |
| - [ ] `hood:nasrah` | Nasrah / الناصرة | Achrafieh, Beirut | Badaro (0.7 km) |  |
| - [x] `hood:mar-mitr` | Mar Mitr / مار متر | Achrafieh, Beirut | Achrafieh (0.3 km) | near "Mar Mitr" (Mar Mitr, 1); near "Mar Mitr Street" (Mar Mitr Street, 1) |
| - [x] `hood:monot` | Monot / مونو | Achrafieh, Beirut | Gemmayzeh (1.0 km) | parent-by-proximity-99m; near "Monot" (Monot, 1) |
| - [x] `hood:syoufi` | Syoufi / السيوفي | Achrafieh, Beirut | Achrafieh (0.8 km) | near "Syoufi" (Syoufi, 1); near "شارع السيوفي" (Sioufi, 1) |
| - [x] `hood:karm-el-zeitoun` | Karm El Zeitoun / كرم الزيتون | Achrafieh, Beirut | Mar Mikhael (0.7 km) | near "Karm El Zeitoun" (Karm El Zeitoun, 1) |
| - [ ] `hood:hood-n4807377638` | بيضون / بيضون | Achrafieh, Beirut | Achrafieh (0.7 km) | no-latin-name |
| - [x] `hood:adliyeh` | Adliyeh / العدلية | Achrafieh, Beirut | Badaro (0.4 km) | near "Adliyeh" (Adliyeh, 1) |
| - [ ] `hood:al-bass` | Al Bass / البص | Tyre | Tyre (1.8 km) |  |
| - [ ] `hood:rassiyeh` | Rassiyeh / الرصية | Zahle | Zahle (1.1 km) |  |
| - [x] `hood:tell-chiha` | Tell Chiha / تل شيحا | Zahle | Zahle (0.7 km) | near "Tell Chiha" (Tell Chiha, 1) |
| - [ ] `hood:berbara` | Berbara / بربارة | Zahle | Zahle (1.2 km) |  |
| - [ ] `hood:saydet-en-najat` | Saydet En Najat / Saydet En Najat | Zahle | Zahle (0.7 km) | no-arabic-name |
| - [ ] `hood:qobbeh` | Qobbeh / القبة | Tripoli | Tripoli (1.1 km) |  |
| - [ ] `hood:jabal-muhsin` | Jabal Muhsin / جبل محسن | Tripoli | Tripoli (1.4 km) |  |
| - [ ] `hood:bab-al-tabbaneh` | Bab Al Tabbaneh / باب التبانة | Tripoli | Tripoli (1.1 km) |  |
| - [ ] `hood:abou-samra` | Abou Samra / Abou Samra | Tripoli | Tripoli (1.5 km) | no-arabic-name |
| - [ ] `hood:bab-al-ramel` | Bab Al Ramel / باب الرمل | Tripoli | Tripoli (1.3 km) |  |
| - [x] `hood:zahrieh` | Zahrieh / الزهرية | Tripoli | Tripoli (0.3 km) | near "Zahrieh" (Zahrieh, 1) |
| - [ ] `hood:tall-al-zaatar` | Tall Al Zaatar / تل الزعتر | Dekwaneh | Dekwaneh (0.9 km) |  |
| - [ ] `hood:el-sharawneh` | El Sharawneh / El Sharawneh | Baalbek | Baalbek (1.0 km) | no-arabic-name |
| - [ ] `hood:bustan-al-quds` | Bustan Al Quds / بستان القدس | Saida | Saida (2.2 km) |  |
| - [ ] `hood:taamir` | Taamir / Taamir | Saida | Saida (1.8 km) | no-arabic-name |
| - [ ] `hood:baraksat` | Baraksat / Baraksat | Saida | Saida (2.2 km) | no-arabic-name; parent-by-proximity-97m |
| - [ ] `hood:tawari` | Tawari / Tawari | Saida | Saida (2.0 km) | no-arabic-name |
| - [ ] `hood:hay-el-barad` | Hay El Barad / حي البراد | Saida | Saida (0.9 km) |  |
| - [ ] `hood:bestein-el-kbir` | Bestein El Kbir / بستان الكبير | Saida | Saida (1.5 km) |  |
| - [ ] `hood:sit-naffiseh` | Sit Naffiseh / ست نفيسة | Saida | Saida (0.4 km) |  |
| - [ ] `hood:dala-a` | Dala'a / دلاعة | Saida | Saida (0.8 km) | near "شارع دلاعة" (شارع دلاعة, 1) |
| - [ ] `hood:maksar-al-abed` | Maksar Al Abed / مكسر العبد | Saida | Saida (2.2 km) |  |
| - [ ] `hood:sassine` | Sassine / ساسين | Achrafieh, Beirut | Achrafieh (0.5 km) | derived-from-street-not-an-osm-place |

## 5. Dupe matches (7): already in the catalog, skipped

| OSM name (en / ar) | OSM ids | Existing entry | Matched via |
|---|---|---|---|
| Verdun / فيردان | n2393710317 | `area:verdun` | en "Verdun", und "verdun" |
| Gemmayzeh / جميزة | n291406964 | `area:gemmayzeh` | en "Gemmayzeh", und "gemmayzeh", en "Gemmayze" |
| Badaro / بدارو | n291429004 | `area:badaro` | en "Badaro", und "badaro", ar "بدارو" |
| El Hamra / الحمرا | n564366026 | `area:hamra` | en "El Hamra", ar "الحمرا", ar "الحمراء", en "Hamra", und "hamra" |
| Ras Beirut / رأس بيروت | n8900961371 | `area:ras-beirut` | en "Ras Beirut", und "ras-beirut", ar "رأس بيروت", ar "راس بيروت", en "Ras Beyrouth" |
| Achrafieh / الاشرفية | n4741764658, n4807433987 | `area:achrafieh` | en "Achrafieh", und "achrafieh", ar "الأشرفية", ar "الاشرفية" |
| Mar Mikhael / مار مخايل | n4935828785 | `area:mar-mikhael` | en "Mar Mikhael", und "mar-mikhael", ar "مار مخايل" |

## 6. Optional alias additions to existing entries (3), additive only

If ticked, inserted as `source='osm'` aliases on that entry; the entry itself is never edited.

- [x] `alias+:area:verdun:فيردان` add "فيردان" to `area:verdun` (from OSM n2393710317)
- [x] `alias+:area:gemmayzeh:جميزة` add "جميزة" to `area:gemmayzeh` (from OSM n291406964)
- [x] `alias+:area:mar-mikhael:Mar Mkhayel` add "Mar Mkhayel" to `area:mar-mikhael` (from OSM n4935828785)

## 7. Street names equal to an existing area/city/campus name (14), kept as streets

Ranking puts the area/campus first; tests pin "Hamra" vs "Hamra Street".

| Street | Shown as | Equals existing | Via |
|---|---|---|---|
| Jemmayzeh / شارع الجميزة | Jemmayzeh · Gemmayzeh, Beirut | `area:gemmayzeh` Gemmayzeh | الجميزة |
| Mar Mikhael / شارع مار مخائيل | Mar Mikhael · Mar Mikhael, Beirut | `area:mar-mikhael` Mar Mikhael | Mar Mikhael |
| Hamra Street / شارع الحمرا | Hamra Street · Hamra, Beirut | `area:hamra` Hamra | Hamra |
| Rue de Baalbek / شارع بعلبك | Rue de Baalbek · Hamra, Beirut | `city:baalbek` Baalbek | بعلبك |
| Badaro Street / شارع بدارو | Badaro Street · Badaro, Beirut | `area:badaro` Badaro | Badaro |
| Antélias / شارع انطلياس | Antélias · Badaro, Beirut | `city:antelias` Antelias | Antelias |
| Rue Furn El-Chebbak / شارع فرن الشباك | Rue Furn El-Chebbak · Badaro, Beirut | `city:furn-el-chebbak` Furn El Chebbak | Furn El Chebbak |
| Université Saint Joseph / شارع كلية مار يوسف | Université Saint Joseph · Achrafieh, Beirut | `campus:6d356924-9a6d-4a28-8834-fcaf869f5b3b` Campus des Sciences Médicales | Universite Saint Joseph |
| Achrafieh Street / شارع الأشرفية | Achrafieh Street · Achrafieh, Beirut | `area:achrafieh` Achrafieh | Achrafieh |
| Dekouané Street / شارع دكوانة | Dekouané Street · Achrafieh, Beirut | `city:dekwaneh` Dekwaneh | Dekouané |
| Broumana Main Road / طريق برمانا الرئيسية | Broumana Main Road · Broummana | `city:broummana` Broummana | برمانا |
| Fanar Main Road / طريق الفنار | Fanar Main Road · Fanar | `city:fanar` Fanar | الفنار |
| Rue Furn El-Chebbak / شارع فرن الشباك | Rue Furn El-Chebbak · Furn El Chebbak | `city:furn-el-chebbak` Furn El Chebbak | Furn El Chebbak |
| Tripoli Boulevard / شارع طرابلس | Tripoli Boulevard · Tripoli | `city:tripoli` Tripoli | طرابلس |

Same-city duplicate check after normalize: none.

## 7b. Ticked neighbourhoods that share a normalized name with a street in the same city (4)

Dropped streets (decisions.dropStreets): `street:monot-achrafieh`, `street:manara-ras-beirut`. Anything below still shows both rows; add the street id to `dropStreets` to keep one.

- `hood:aicha-bakkar` Aicha Bakkar (Verdun, Beirut) and `street:rue-aicha-bakkar-verdun` Rue Aicha Bakkar (Verdun, Beirut)
- `hood:furn-el-hayek` Furn El Hayek (Achrafieh, Beirut) and `street:furn-el-hayek-achrafieh` Furn El-Hayek (Achrafieh, Beirut)
- `hood:mar-mitr` Mar Mitr (Achrafieh, Beirut) and `street:mar-mitr-street-achrafieh` Mar Mitr Street (Achrafieh, Beirut)
- `hood:syoufi` Syoufi (Achrafieh, Beirut) and `street:sioufi-achrafieh` Sioufi (Achrafieh, Beirut)

## 8. Streets merged across areas (34), shown with the city only

| Street | Shown as | Parent (most length) | Length per area |
|---|---|---|---|
| `street:lebanon-street-beirut` | Lebanon Street · Beirut | Achrafieh | Achrafieh 449 m, Gemmayzeh 30 m |
| `street:pierre-sadeq-beirut` | Pierre Sadeq · Beirut | Achrafieh | Achrafieh 105 m, Gemmayzeh 42 m |
| `street:adnan-el-hakim-street-beirut` | Adnan El-Hakim Street · Beirut | Jnah | Jnah 85 m, Tariq El Jdide 58 m |
| `street:rue-farid-trad-beirut` | Rue Farid Trad · Beirut | Jnah | Jnah 1030 m, Verdun 207 m |
| `street:armenia-street-beirut` | Armenia Street · Beirut | Mar Mikhael | Mar Mikhael 561 m, Achrafieh 27 m |
| `street:clemenceau-street-beirut` | Clémenceau Street · Beirut | Hamra | Hamra 401 m, Ras Beirut 354 m |
| `street:rue-82-beirut-31489014` | Rue 82 · Beirut | Achrafieh | Achrafieh 227 m, Hamra 83 m |
| `street:bliss-street-beirut` | Bliss Street · Beirut | Hamra | Hamra 635 m, Ras Beirut 454 m |
| `street:emile-edde-street-beirut` | Emile Eddé Street · Beirut | Hamra | Hamra 869 m, Ras Beirut 301 m |
| `street:rue-de-rome-beirut` | Rue de Rome · Beirut | Hamra | Hamra 309 m, Ras Beirut 72 m |
| `street:john-kennedy-beirut` | John Kennedy · Beirut | Ras Beirut | Ras Beirut 251 m, Hamra 42 m |
| `street:sami-el-solh-avenue-beirut` | Sami El Solh Avenue · Beirut | Badaro | Badaro 1815 m, Achrafieh 80 m |
| `street:rue-charles-corm-beirut` | Rue Charles Corm · Beirut | Achrafieh | Achrafieh 144 m, Badaro 77 m |
| `street:corniche-pierre-gemayel-beirut` | Corniche Pierre Gemayel · Beirut | Achrafieh | Achrafieh 4447 m, Badaro 958 m |
| `street:rue-karm-rahal-beirut` | Rue Karm Rahal · Beirut | Badaro | Badaro 220 m, Achrafieh 73 m |
| `street:rue-hotel-dieu-beirut` | Rue Hôtel Dieu · Beirut | Badaro | Badaro 206 m, Achrafieh 77 m |
| `street:mere-marguerite-marie-beirut` | Mere Marguerite Marie · Beirut | Achrafieh | Achrafieh 128 m, Badaro 113 m |
| `street:rue-elias-medawar-beirut` | Rue Élias Medawar · Beirut | Badaro | Badaro 215 m, Achrafieh 28 m |
| `street:damascus-road-beirut` | Damascus Road · Beirut | Achrafieh | Achrafieh 1190 m, Badaro 915 m |
| `street:rue-des-perses-beirut` | Rue des Perses · Beirut | Badaro | Badaro 65 m, Achrafieh 35 m |
| `street:australia-street-beirut` | Australia street · Beirut | Ras Beirut | Ras Beirut 522 m, Verdun 144 m |
| `street:alfred-nobel-beirut` | Alfred Nobel · Beirut | Ras Beirut | Ras Beirut 334 m, Verdun 72 m |
| `street:rue-louis-massignon-beirut` | Rue Louis Massignon · Beirut | Verdun | Verdun 135 m, Ras Beirut 83 m |
| `street:abdel-razzak-hamade-beirut` | Abdel-Razzak Hamadé · Beirut | Ras Beirut | Ras Beirut 153 m, Verdun 16 m |
| `street:georges-zouein-beirut` | Georges Zouein · Beirut | Verdun | Verdun 381 m, Ras Beirut 128 m |
| `street:rue-itani-beirut` | Rue Itani · Beirut | Verdun | Verdun 247 m, Ras Beirut 90 m |
| `street:abdallah-machnouk-beirut` | Abdallah Machnouk · Beirut | Verdun | Verdun 1179 m, Ras Beirut 239 m |
| `street:cleopatre-beirut` | Cléopatre · Beirut | Verdun | Verdun 162 m, Ras Beirut 140 m |
| `street:general-de-gaulle-avenue-beirut` | Général de Gaulle Avenue · Beirut | Ras Beirut | Ras Beirut 3218 m, Verdun 1000 m |
| `street:dunant-beirut` | Dunant · Beirut | Ras Beirut | Ras Beirut 430 m, Verdun 232 m |
| `street:rue-69-beirut` | Rue 69 · Beirut | Achrafieh | Achrafieh 197 m, Verdun 122 m |
| `street:rue-khalid-ibn-al-walid-beirut` | Rue Khalid ibn al-Walid · Beirut | Ras Beirut | Ras Beirut 622 m, Verdun 376 m |
| `street:khaled-ibn-el-walid-beirut` | Khaled Ibn-El Walid · Beirut | Ras Beirut | Ras Beirut 346 m, Verdun 131 m |
| `street:sea-road-jounieh` | Sea Road · Jounieh | Jounieh | Jounieh 4473 m, Kaslik 3222 m |

## 9. Data quality (streets in the seed)

| Flag | Streets | Meaning |
|---|---|---|
| english-name-from-french | 66 | No usable name:en; the French name is the English display name. No translation. |
| no-arabic-name | 104 | Arabic display falls back to the English text. No transliteration. |
| no-latin-name | 25 | English display falls back to the Arabic text |
| junk-name:en-ignored | 9 | A name:en like "Street 60" was ignored as display name |

- [ ] Include numbered-only streets (309)

## 10. Streets by area (689)

Grouped by parent area, sorted by anchor score then length.

<details><summary><b>Achrafieh</b>: 178 streets, radius 400 m</summary>

- `street:rue-82-beirut-31489014` Rue 82 / شارع82 · Beirut, 309 m, anchors 3+8, english-name-from-french
- `street:mar-dimitrious-street-achrafieh` Mar Dimitrious Street / شارع ألفريد نقاش · Achrafieh, Beirut, 2772 m, anchors 0+8
- `street:damascus-road-beirut` Damascus Road / طريق الشام · Beirut, 2104 m, anchors 0+8
- `street:rue-adiba-ishac-achrafieh` Rue Adiba Ishac / Rue Adiba Ishac · Achrafieh, Beirut, 887 m, anchors 0+8, no-arabic-name
- `street:elias-sarkis-avenue-achrafieh` Elias Sarkis Avenue / جادة إلياس سركيس · Achrafieh, Beirut, 2538 m, anchors 0+7
- `street:rue-habib-pacha-el-saad-achrafieh` Rue Habib Pacha El-Saad / شارع حبيب باشا السعد · Achrafieh, Beirut, 1107 m, anchors 0+7
- `street:corniche-pierre-gemayel-beirut` Corniche Pierre Gemayel / كرنيش بيار الجميل · Beirut, 5404 m, anchors 0+6
- `street:georges-tabet-road-achrafieh` Georges Tabet Road / شارع جورج تابت · Achrafieh, Beirut, 396 m, anchors 0+6
- `street:georges-naccache-achrafieh` Georges Naccache / شارع جورج نقاش · Achrafieh, Beirut, 339 m, anchors 0+6
- `street:rue-toufic-rizk-achrafieh` Rue Toufic Rizk / شارع توفيق رزق · Achrafieh, Beirut, 234 m, anchors 0+6, english-name-from-french
- `street:rue-galien-achrafieh` Rue Galien / Rue Galien · Achrafieh, Beirut, 187 m, anchors 0+6, no-arabic-name
- `street:rue-sassine-achrafieh` Rue Sassine / شارع ساسين · Achrafieh, Beirut, 859 m, anchors 0+5, english-name-from-french, junk-name:en-ignored
- `street:achrafieh-street-achrafieh` Achrafieh Street / شارع الأشرفية · Achrafieh, Beirut, 736 m, anchors 0+5
- `street:youssef-saouda-achrafieh` Youssef Saouda / شارع يوسف السودا · Achrafieh, Beirut, 632 m, anchors 0+5
- `street:georges-haimari-achrafieh` Georges Haïmari / شارع جورج حيمري · Achrafieh, Beirut, 492 m, anchors 0+5
- `street:rue-seif-eddine-el-khatib-achrafieh` Rue Seif Eddine El-Khatib / شارع سيف الدين الخطيب · Achrafieh, Beirut, 413 m, anchors 0+5
- `street:deir-el-nasra-road-achrafieh` Deir El Nasra Road / شارع دير الناصرة · Achrafieh, Beirut, 350 m, anchors 0+5
- `street:rue-louis-abi-charaf-achrafieh` Rue Louis Abi Charaf / شارع لويس أبو شرف · Achrafieh, Beirut, 288 m, anchors 0+5, english-name-from-french
- `street:baroudi-road-achrafieh` Baroudi Road / شارع البارودي · Achrafieh, Beirut, 267 m, anchors 0+5
- `street:albert-khayath-achrafieh` Albert Khayath / شارع ألبير خياط · Achrafieh, Beirut, 246 m, anchors 0+5
- `street:mere-marguerite-marie-beirut` Mere Marguerite Marie / Mere Marguerite Marie · Beirut, 241 m, anchors 0+5, no-arabic-name
- `street:rue-zahhar-achrafieh` Rue Zahhar / شارع الزهار · Achrafieh, Beirut, 224 m, anchors 0+5, english-name-from-french
- `street:rue-nabaat-el-moutrane-achrafieh` Rue Nabaat El-Moutrane / شارع نبعة المطران · Achrafieh, Beirut, 223 m, anchors 0+5
- `street:rue-charles-corm-beirut` Rue Charles Corm / Rue Charles Corm · Beirut, 221 m, anchors 0+5, no-arabic-name
- `street:rue-khairallah-khairallah-achrafieh` Rue Khairallah Khairallah / شارع خيرالله خيرالله · Achrafieh, Beirut, 221 m, anchors 0+5
- `street:rue-du-lycee-achrafieh` Rue du Lycée / Rue du Lycée · Achrafieh, Beirut, 219 m, anchors 0+5, no-arabic-name
- `street:beni-assaf-street-achrafieh` Beni Assaf Street / شارع بني عساف · Achrafieh, Beirut, 201 m, anchors 0+5
- `street:rue-jean-dominique-ayoub-achrafieh` Rue Jean-Dominique Ayoub / شارع جان دومينيك أيوب · Achrafieh, Beirut, 200 m, anchors 0+5
- `street:rue-srougi-achrafieh` Rue Srougi / شارع السروجي · Achrafieh, Beirut, 190 m, anchors 0+5
- `street:rue-mar-youhanna-achrafieh` Rue Mar Youhanna / شارع مار يوحنا · Achrafieh, Beirut, 178 m, anchors 0+5
- `street:rue-mohamed-beydoun-achrafieh` Rue Mohamed Beydoun / شارع محمد بيضون · Achrafieh, Beirut, 157 m, anchors 0+5
- `street:pierre-sadeq-beirut` Pierre Sadeq / Pierre Sadeq · Beirut, 146 m, anchors 0+5, no-arabic-name
- `street:rue-chemaytelli-achrafieh` Rue Chemaytelli / شارع شميطلي · Achrafieh, Beirut, 137 m, anchors 0+5, english-name-from-french
- `street:rue-maurice-gemayel-achrafieh` Rue Maurice Gemayel / Rue Maurice Gemayel · Achrafieh, Beirut, 137 m, anchors 0+5, no-arabic-name
- `street:rue-el-mrouje-achrafieh` Rue El-Mrouje / Rue El-Mrouje · Achrafieh, Beirut, 123 m, anchors 0+5, no-arabic-name
- `street:camille-edde-achrafieh` Camille Edde / شارع كميل إده · Achrafieh, Beirut, 121 m, anchors 0+5
- `street:rue-youssef-hoyek-achrafieh` Rue Youssef Hoyek / Rue Youssef Hoyek · Achrafieh, Beirut, 99 m, anchors 0+5, no-arabic-name
- `street:rue-bardawil-achrafieh` Rue Bardawil / شارع بردويل · Achrafieh, Beirut, 96 m, anchors 0+5
- `street:cesar-gemayel-achrafieh` César Gemayel / شارع قيصر الجميل · Achrafieh, Beirut, 91 m, anchors 0+5
- `street:rue-abdel-maoula-chaar-achrafieh` Rue Abdel-Maoula Chaar / شارع عبد المولى الشعار · Achrafieh, Beirut, 40 m, anchors 0+5
- `street:hassan-kronfol-achrafieh` Hassan Kronfol / شارع حسن قرنفل · Achrafieh, Beirut, 35 m, anchors 0+5
- `street:rue-said-khadige-achrafieh` Rue Saïd Khadige / شارع سعيد خديج · Achrafieh, Beirut, 35 m, anchors 0+5
- `street:rue-abdel-karim-el-khalil-achrafieh` Rue Abdel-Karim El-Khalil / شارع عبد الكريم الخليل · Achrafieh, Beirut, 33 m, anchors 0+5
- `street:furn-el-hayek-achrafieh` Furn El-Hayek / شارع فرن الحايك · Achrafieh, Beirut, 721 m, anchors 0+4
- `street:elias-al-hrawi-highway-achrafieh` Elias Al Hrawi Highway / جادة الياس الهراوي · Achrafieh, Beirut, 571 m, anchors 0+4
- `street:evangelical-brothers-church-street-achrafieh` Evangelical Brothers Church Street / شارع كنيسة الإخوة الإنجيليين · Achrafieh, Beirut, 393 m, anchors 0+4
- `street:place-du-palais-de-justice-achrafieh` Place du Palais de Justice / ساحة قصر العدل · Achrafieh, Beirut, 242 m, anchors 0+4, english-name-from-french
- `street:rue-jean-de-cruet-achrafieh` Rue Jean de Cruet / Rue Jean de Cruet · Achrafieh, Beirut, 193 m, anchors 0+4, no-arabic-name
- `street:rue-auguste-pacha-adib-achrafieh` Rue Auguste Pacha Adib / شارع أوغست باشا أديب · Achrafieh, Beirut, 192 m, anchors 0+4
- `street:rue-ishac-ben-honein-achrafieh` Rue Ishac Ben Honein / شارع إسحاق بن حنين · Achrafieh, Beirut, 158 m, anchors 0+4
- `street:rue-georges-philippides-achrafieh` Rue Georges Philippides / Rue Georges Philippides · Achrafieh, Beirut, 108 m, anchors 0+4, no-arabic-name
- `street:general-toufic-salem-achrafieh` Général Toufic Salem / شارع العميد توفيق سالم · Achrafieh, Beirut, 31 m, anchors 0+4
- `street:rue-69-beirut` Rue 69 / شارع69 · Beirut, 319 m, anchors 1+3, english-name-from-french
- `street:joseph-chader-achrafieh` Joseph Chader / جوزيف شادر · Achrafieh, Beirut, 1736 m, anchors 0+3
- `street:mar-mitr-street-achrafieh` Mar Mitr Street / شارع مار متر · Achrafieh, Beirut, 1246 m, anchors 0+3
- `street:general-fouad-chehab-avenue-achrafieh` General Fouad Chéhab Avenue / جادة الرئيس اللواء فؤاد شهاب · Achrafieh, Beirut, 1068 m, anchors 0+3
- `street:abdel-wahab-el-inglizi-achrafieh` Abdel Wahab El Inglizi / شارع عبد الوهاب الانكليزي · Achrafieh, Beirut, 891 m, anchors 0+3
- `street:cheikh-ghabi-achrafieh` Cheikh Ghabi / شارع الشيخ الغابي · Achrafieh, Beirut, 707 m, anchors 0+3
- `street:saydeh-street-achrafieh` Saydeh Street / شارع السيدة · Achrafieh, Beirut, 570 m, anchors 0+3
- `street:saint-charbel-achrafieh` Saint Charbel / شارع القديس شربل · Achrafieh, Beirut, 568 m, anchors 0+3
- `street:rue-selim-de-bustros-achrafieh` Rue Selim de Bustros / شارع سليم دو بسترس · Achrafieh, Beirut, 568 m, anchors 0+3
- `street:libya-street-achrafieh` Libya Street / شارع ليبيا · Achrafieh, Beirut, 392 m, anchors 0+3
- `street:adib-nahas-achrafieh` Adib Nahas / شارع أديب نحاس · Achrafieh, Beirut, 359 m, anchors 0+3
- `street:selim-rustom-baz-achrafieh` Selim Rustom Baz / شارع سليم رستم باز · Achrafieh, Beirut, 355 m, anchors 0+3
- `street:ararat-achrafieh` Ararat / شارع أرارات · Achrafieh, Beirut, 353 m, anchors 0+3
- `street:lord-messarra-achrafieh` Lord Messarra / شارع المطران مسرّة · Achrafieh, Beirut, 343 m, anchors 0+3
- `street:lord-ghophrael-achrafieh` Lord Ghophrael / Lord Ghophrael · Achrafieh, Beirut, 330 m, anchors 0+3, no-arabic-name
- `street:mariam-geahchan-achrafieh` Mariam Geahchan / شارع مريم جحشان · Achrafieh, Beirut, 321 m, anchors 0+3
- `street:al-salam-school-achrafieh` Al Salam School / شارع مدرسة السلام · Achrafieh, Beirut, 302 m, anchors 0+3
- `street:rue-karmel-zettoun-achrafieh` Rue Karmel-Zettoun / Rue Karmel-Zettoun · Achrafieh, Beirut, 280 m, anchors 0+3, no-arabic-name
- `street:rue-zahrat-el-ihsan-achrafieh` Rue Zahrat el-Ihsan / شارع زهرة الإحسان · Achrafieh, Beirut, 264 m, anchors 0+3
- `street:wadih-doumani-achrafieh` Wadih Doumani / شارع وديع الدوماني · Achrafieh, Beirut, 209 m, anchors 0+3
- `street:mgr-atalla-achrafieh` Mgr. Atalla / شارع المطران عطاء الله · Achrafieh, Beirut, 208 m, anchors 0+3
- `street:aabrine-road-achrafieh` Aabrine Road / شارع عبرين · Achrafieh, Beirut, 205 m, anchors 0+3
- `street:patriach-douaihy-achrafieh` Patriach Douaihy / البطريك الدويي · Achrafieh, Beirut, 194 m, anchors 0+3
- `street:patriarche-alexandros-tahan-achrafieh` Patriarche Alexandros Tahan / شارع باتريسيا أليكسندروس طحان · Achrafieh, Beirut, 178 m, anchors 0+3
- `street:el-iskandar-achrafieh` El Iskandar / شارع الإسكندر · Achrafieh, Beirut, 169 m, anchors 0+3
- `street:ghazali-achrafieh` Ghazali / شارع الغزالي · Achrafieh, Beirut, 168 m, anchors 0+3
- `street:amine-nassereddine-achrafieh` Amine Nassereddine / شارع أمين ناصر الدين · Achrafieh, Beirut, 165 m, anchors 0+3
- `street:rue-gergios-el-tueni-achrafieh` Rue Gergios El-Tuéni / شارع جريس التوني · Achrafieh, Beirut, 160 m, anchors 0+3
- `street:impasse-36-achrafieh` Impasse 36 / زنقة 36 · Achrafieh, Beirut, 158 m, anchors 0+3
- `street:albert-naccache-achrafieh` Albert Naccache / شارع ألبير نقاش · Achrafieh, Beirut, 154 m, anchors 0+3
- `street:tabbal-achrafieh` Tabbal / شارع طبال · Achrafieh, Beirut, 150 m, anchors 0+3
- `street:furn-khachan-achrafieh` Furn Khachan / شارع فرن خشان · Achrafieh, Beirut, 148 m, anchors 0+3
- `street:kabalan-makarem-achrafieh` Kabalan Makarem / شارع قبلان مكارم · Achrafieh, Beirut, 144 m, anchors 0+3
- `street:elias-faraj-bassil-achrafieh` Elias Faraj Bassil / شارع الياس فرج باسيل · Achrafieh, Beirut, 144 m, anchors 0+3
- `street:felix-fares-achrafieh` Félix Fares / شارع فيليكس فارس · Achrafieh, Beirut, 139 m, anchors 0+3
- `street:bethlehem-achrafieh` Bethlehem / شارع بيت لحم · Achrafieh, Beirut, 132 m, anchors 0+3
- `street:youssef-karam-achrafieh` Youssef Karam / شارع يوسف كرم · Achrafieh, Beirut, 130 m, anchors 0+3
- `street:rue-gabriel-khabbaz-achrafieh` Rue Gabriel Khabbaz / شارع غبريال خباز · Achrafieh, Beirut, 129 m, anchors 0+3
- `street:antoine-choueiri-achrafieh` Antoine Choueiri / Antoine Choueiri · Achrafieh, Beirut, 127 m, anchors 0+3, no-arabic-name
- `street:rue-71-achrafieh-31487859` Rue 71 / شارع71 · Achrafieh, Beirut, 124 m, anchors 0+3, english-name-from-french, junk-name:en-ignored
- `street:omar-ibn-el-aass-achrafieh` Omar Ibn-El-Aass / شارع عمر إبن العاص · Achrafieh, Beirut, 121 m, anchors 0+3
- `street:rue-chahrouri-achrafieh` Rue Chahrouri / Rue Chahrouri · Achrafieh, Beirut, 110 m, anchors 0+3, no-arabic-name
- `street:moumne-achrafieh` Moumné / شارع مومنة · Achrafieh, Beirut, 94 m, anchors 0+3
- `street:impasse-89-achrafieh` Impasse 89 / زنقة 89 · Achrafieh, Beirut, 87 m, anchors 0+3
- `street:impasse-28-achrafieh` Impasse 28 / زنقة 28 · Achrafieh, Beirut, 83 m, anchors 0+3
- `street:antoine-khodr-achrafieh` Antoine Khodr / شارع أنطوان خضر · Achrafieh, Beirut, 79 m, anchors 0+3
- `street:rue-youssef-sursock-achrafieh` Rue Youssef Sursock / شارع يوسف سرسق · Achrafieh, Beirut, 30 m, anchors 0+3, english-name-from-french
- `street:zehil-achrafieh` Zehil / شارع زحيل · Achrafieh, Beirut, 30 m, anchors 0+3
- `street:nassif-rayes-achrafieh` Nassif Rayes / شارع ناصيف الريّس · Achrafieh, Beirut, 30 m, anchors 0+3
- `street:sioufi-achrafieh` Sioufi / شارع السيوفي · Achrafieh, Beirut, 525 m, anchors 0+2
- `street:lebanon-street-beirut` Lebanon Street / شارع لبنان · Beirut, 479 m, anchors 0+2
- `street:saints-pierre-and-paul-street-achrafieh` Saints Pierre and Paul Street / شارع القديسين بطرس وبولس · Achrafieh, Beirut, 458 m, anchors 0+2
- `street:akhwane-el-safa-street-achrafieh` Akhwane El Safa Street / شارع اخوان الصفا · Achrafieh, Beirut, 395 m, anchors 0+2
- `street:rue-catholicos-zareh-achrafieh` Rue Catholicos Zareh / Rue Catholicos Zareh · Achrafieh, Beirut, 363 m, anchors 0+2, no-arabic-name
- `street:rue-ghabi-achrafieh` Rue Ghabi / شارع غابي · Achrafieh, Beirut, 316 m, anchors 0+2, english-name-from-french
- `street:ghazalieh-road-achrafieh` Ghazalieh Road / شارع الغزالية · Achrafieh, Beirut, 290 m, anchors 0+2
- `street:rue-abdel-hadi-achrafieh` Rue Abdel-Hadi / شارع سليم عبد العدي · Achrafieh, Beirut, 275 m, anchors 0+2, english-name-from-french
- `street:doumani-achrafieh` Doumani / شارع الدوماني · Achrafieh, Beirut, 271 m, anchors 0+2
- `street:rue-haji-nicolas-mrad-achrafieh` Rue Haji Nicolas Mrad / شارع الحاج نقولا مراد · Achrafieh, Beirut, 241 m, anchors 0+2, english-name-from-french
- `street:ferneini-achrafieh` Ferneini / شارع الفرنيني · Achrafieh, Beirut, 184 m, anchors 0+2
- `street:rue-choucri-assali-achrafieh` Rue Choucri Assali / شارع شكري العسلي · Achrafieh, Beirut, 180 m, anchors 0+2
- `street:rue-nakhle-tueni-achrafieh` Rue Nakhlé Tuéni / شارع نخلة التويني · Achrafieh, Beirut, 171 m, anchors 0+2
- `street:rue-yared-achrafieh` Rue Yared / شارع يارد · Achrafieh, Beirut, 122 m, anchors 0+2, english-name-from-french
- `street:aramouni-achrafieh` Aramouni / شارع العرموني · Achrafieh, Beirut, 113 m, anchors 0+2
- `street:rue-raymond-khalifeh-achrafieh` Rue Raymond Khalifeh / شارع ريمون خليفه · Achrafieh, Beirut, 104 m, anchors 0+2
- `street:rue-stavro-jabra-achrafieh` Rue Stavro Jabra / Rue Stavro Jabra · Achrafieh, Beirut, 92 m, anchors 0+2, no-arabic-name
- `street:rue-republique-dominicaine-achrafieh` Rue Republique Dominicaine / شارع جمهورية الدومينيكان · Achrafieh, Beirut, 86 m, anchors 0+2, english-name-from-french
- `street:rue-chbaro-achrafieh` Rue Chbaro / شارع شبارو · Achrafieh, Beirut, 77 m, anchors 0+2
- `street:achrafieh-osm-31776970` زنقة 503 / زنقة 503 · Achrafieh, Beirut, 42 m, anchors 0+2, no-latin-name
- `street:mouhieddine-yafi-achrafieh` Mouhieddine Yafi / شارع محي الدين اليافي · Achrafieh, Beirut, 32 m, anchors 0+2
- `street:naoum-labaki-achrafieh` Naoum Labaki / شارع نعوم لبكي · Achrafieh, Beirut, 32 m, anchors 0+2
- `street:iskandar-farah-achrafieh` Iskandar Farah / شارع إسكندر الفرح · Achrafieh, Beirut, 31 m, anchors 0+2
- `street:montee-accaoui-achrafieh` Montée Accaoui / شارع طلعة العكاوي · Achrafieh, Beirut, 31 m, anchors 0+2
- `street:rue-saint-nicolas-achrafieh` Rue Saint Nicolas / شارع مار نقولا · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:impasse-448-achrafieh` Impasse 448 / قرع 448 · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:impasse-92-achrafieh` Impasse 92 / Impasse 92 · Achrafieh, Beirut, 30 m, anchors 0+2, no-arabic-name
- `street:youssef-sader-achrafieh` Youssef Sader / شارع يوسف صادر · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:chucri-schoucair-achrafieh` Chucri Schoucair / شارع شكري شقير · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:iskandar-hobeiche-achrafieh` Iskandar Hobeiche / شارع إسكندر حبيش · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:observatoire-achrafieh` Observatoire / شارع المرصد · Achrafieh, Beirut, 30 m, anchors 0+2
- `street:amin-gemayel-street-achrafieh` Amin Gemayel Street / شارع أمين الجميل · Achrafieh, Beirut, 781 m, anchors 0+1
- `street:rue-chehade-achrafieh` Rue Chehadé / شارع شحاده · Achrafieh, Beirut, 410 m, anchors 0+1
- `street:rue-emile-lahoud-achrafieh` Rue Émile Lahoud / شارع إميل لحود · Achrafieh, Beirut, 393 m, anchors 0+1, english-name-from-french
- `street:rue-elias-saab-achrafieh` Rue Élias Saab / شارع إلياس صعب · Achrafieh, Beirut, 393 m, anchors 0+1
- `street:rue-wadih-naim-achrafieh` Rue Wadih Naïm / شارع وديع نعيم · Achrafieh, Beirut, 369 m, anchors 0+1, english-name-from-french
- `street:rue-chebli-achrafieh` Rue Chebli / شارع شبلي · Achrafieh, Beirut, 338 m, anchors 0+1
- `street:antranik-achrafieh` Antranik / شارع أنترانيك · Achrafieh, Beirut, 325 m, anchors 0+1
- `street:rue-khalil-kseib-achrafieh` Rue Khalil Kseib / شارع خليل كسيب · Achrafieh, Beirut, 291 m, anchors 0+1, english-name-from-french
- `street:rue-elias-baaklini-achrafieh` Rue Élias Baaklini / شارع الياس البعقليني · Achrafieh, Beirut, 280 m, anchors 0+1
- `street:ghandour-el-saad-achrafieh` Ghandour El-Saad / شارع غندور السعد · Achrafieh, Beirut, 269 m, anchors 0+1
- `street:assad-rustom-achrafieh` Assad Rustom / شارع أسد رستم · Achrafieh, Beirut, 258 m, anchors 0+1
- `street:raji-abou-haidar-achrafieh` Raji Abou Haidar / شارع راجي ابو حيدر · Achrafieh, Beirut, 258 m, anchors 0+1
- `street:rue-issa-maalouf-achrafieh` Rue Issa Maalouf / شارع 87 · Achrafieh, Beirut, 241 m, anchors 0+1, english-name-from-french
- `street:bassila-achrafieh` Bassila / شارع بسيلا · Achrafieh, Beirut, 232 m, anchors 0+1
- `street:rue-gergi-zeidane-achrafieh` Rue Gergi Zeidane / شارع جرجي زيدان · Achrafieh, Beirut, 224 m, anchors 0+1
- `street:rue-jean-jalakh-achrafieh` Rue Jean Jalakh / شارع جان جلخ · Achrafieh, Beirut, 224 m, anchors 0+1, english-name-from-french
- `street:athens-street-achrafieh` Athens street / شارع أثينا · Achrafieh, Beirut, 200 m, anchors 0+1
- `street:rue-amine-mouchreq-achrafieh` Rue Amine Mouchreq / شارع أمين مشرق · Achrafieh, Beirut, 197 m, anchors 0+1, english-name-from-french
- `street:said-akl-poet-achrafieh` Said Akl (Poet) / Said Akl (Poet) · Achrafieh, Beirut, 181 m, anchors 0+1, no-arabic-name
- `street:rue-gergi-baz-achrafieh` Rue Gergi Baz / شارع جرجي باز · Achrafieh, Beirut, 172 m, anchors 0+1, english-name-from-french
- `street:rue-michel-feghali-achrafieh` Rue Michel Feghali / Rue Michel Feghali · Achrafieh, Beirut, 170 m, anchors 0+1, no-arabic-name
- `street:rue-braidi-achrafieh` Rue Braidi / شارع البريدي · Achrafieh, Beirut, 167 m, anchors 0+1, english-name-from-french
- `street:bon-pasteur-achrafieh` Bon Pasteur / شارع الراعي الصالح · Achrafieh, Beirut, 161 m, anchors 0+1
- `street:rue-zahrani-achrafieh` Rue Zahrani / شارع الزهراني · Achrafieh, Beirut, 157 m, anchors 0+1, english-name-from-french
- `street:rue-antoine-salhani-achrafieh` Rue Antoine Salhani / شارع أنطون صالحاني · Achrafieh, Beirut, 152 m, anchors 0+1, english-name-from-french
- `street:rue-saints-curs-achrafieh` Rue Saints Cœurs / شارع القلبين الاقدسين · Achrafieh, Beirut, 147 m, anchors 0+1
- `street:rue-ibrahim-el-mounzer-achrafieh` Rue Ibrahim El-Mounzer / شارع إبراهيم المنذر · Achrafieh, Beirut, 143 m, anchors 0+1
- `street:metn-street-achrafieh` Metn Street / شارع المتن · Achrafieh, Beirut, 116 m, anchors 0+1
- `street:rue-aintoura-achrafieh` Rue Aintoura / شارع عينطورة · Achrafieh, Beirut, 109 m, anchors 0+1
- `street:dekouane-street-achrafieh` Dekouané Street / شارع دكوانة · Achrafieh, Beirut, 106 m, anchors 0+1
- `street:nicolas-fayad-achrafieh` Nicolas Fayad / شارع نقولا فياض · Achrafieh, Beirut, 79 m, anchors 0+1
- `street:rue-sabbagha-achrafieh` Rue Sabbagha / شارع صباغة · Achrafieh, Beirut, 72 m, anchors 0+1, english-name-from-french
- `street:chaccour-trad-achrafieh` Chaccour Trad / شارع شكور طراد · Achrafieh, Beirut, 71 m, anchors 0+1
- `street:rue-mikhael-eid-boustany-achrafieh` Rue Mikhael Eid Boustany / شارع ميخائيل عيد البستاني · Achrafieh, Beirut, 62 m, anchors 0+1
- `street:menassa-achrafieh` Menassa / شارع منسّى · Achrafieh, Beirut, 50 m, anchors 0+1
- `street:bechara-cassir-achrafieh` Béchara Cassir / شارع بشارة قصير · Achrafieh, Beirut, 31 m, anchors 0+1
- `street:qobaiyat-achrafieh` Qobaiyat / شارع القبيات · Achrafieh, Beirut, 31 m, anchors 0+1
- `street:universite-saint-joseph-achrafieh` Université Saint Joseph / شارع كلية مار يوسف · Achrafieh, Beirut, 30 m, anchors 0+1
- `street:huvelin-achrafieh` Huvelin / شارع هوفلين · Achrafieh, Beirut, 30 m, anchors 0+1
- `street:rue-emilie-sursock-achrafieh` Rue Emilie Sursock / Rue Emilie Sursock · Achrafieh, Beirut, 30 m, anchors 0+1, no-arabic-name
- `street:roucheid-el-dahdah-achrafieh` Roucheid El-Dahdah / شارع رشيد الدحداح · Achrafieh, Beirut, 30 m, anchors 0+1
- `street:rue-khalil-badaoui-achrafieh` Rue Khalil Badaoui / شارع خليل البدوي · Achrafieh, Beirut, 574 m, anchors 0+0
- `street:rue-saint-vartan-achrafieh` Rue Saint Vartan / شارع القديس وارطان · Achrafieh, Beirut, 290 m, anchors 0+0
- `street:rue-du-kesrouane-achrafieh` Rue du Kesrouane / شارع كسروان · Achrafieh, Beirut, 138 m, anchors 0+0
- `street:cattane-achrafieh` Cattane / شارع قطان · Achrafieh, Beirut, 92 m, anchors 0+0
- `street:rue-beni-qahtane-achrafieh` Rue Béni Qahtane / شارع بني قحطان · Achrafieh, Beirut, 39 m, anchors 0+0

</details>

<details><summary><b>Aley</b>: 4 streets, radius 800 m</summary>

- `street:piscine-street-aley` Piscine Street / Piscine Street · Aley, 1506 m, anchors 0+1, no-arabic-name
- `street:main-street-aley` Main Street / Main Street · Aley, 283 m, anchors 0+1, no-arabic-name
- `street:aley-osm-313101316` شويت - عاليه / شويت - عاليه · Aley, 397 m, anchors 0+0, no-latin-name
- `street:al-malaab-street-aley` Al Malaab Street / Al Malaab Street · Aley, 103 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Antelias</b>: 8 streets, radius 800 m</summary>

- `street:sea-road-antelias` Sea Road / طريق البحر · Antelias, 2176 m, anchors 0+2
- `street:rahbani-brothers-street-antelias` Rahbani Brothers Street / شارع الأخوين رحباني · Antelias, 1266 m, anchors 0+1
- `street:route-maritime-rue-100-antelias` Route Maritime - Rue 100 / شارع 100 · Antelias, 171 m, anchors 0+1, english-name-from-french, junk-name:en-ignored
- `street:rue-d-m-antelias` Rue D.M. / Rue D.M. · Antelias, 128 m, anchors 0+1, no-arabic-name
- `street:rue-pere-yaacoub-antelias` Rue Père Yaacoub / Rue Père Yaacoub · Antelias, 102 m, anchors 0+1, no-arabic-name
- `street:antelias-bickfaya-road-antelias` Antelias Bickfaya Road / طريق انطلياس بكفيّا · Antelias, 73 m, anchors 0+1
- `street:garine-2-private-road-antelias` Garine 2 Private Road / طريق خاص غاريني 2 · Antelias, 223 m, anchors 0+0
- `street:207a-street-antelias` 207A Street / شارع 207 أ · Antelias, 197 m, anchors 0+0

</details>

<details><summary><b>Baalbek</b>: 2 streets, radius 800 m</summary>

- `street:baalbek-osm-26576097` طريق نحلة - بعلبك / طريق نحلة - بعلبك · Baalbek, 2347 m, anchors 0+0, no-latin-name
- `street:baalbek-osm-301459575` طريق مقنة - يونين / طريق مقنة - يونين · Baalbek, 252 m, anchors 0+0, no-latin-name

</details>

<details><summary><b>Badaro</b>: 36 streets, radius 400 m</summary>

- `street:museum-street-badaro` Museum Street / شارع المتحف · Badaro, Beirut, 768 m, anchors 0+7
- `street:ibrahim-medawar-badaro` Ibrahim Medawar / شارع إبراهيم مدور · Badaro, Beirut, 223 m, anchors 0+7
- `street:taleb-hobeiche-badaro` Taleb Hobeiche / شارع طالب حبيش · Badaro, Beirut, 218 m, anchors 0+7
- `street:rue-toufic-youssef-awad-badaro` Rue Toufic Youssef Awad / Rue Toufic Youssef Awad · Badaro, Beirut, 203 m, anchors 0+7, no-arabic-name
- `street:kiwan-badaro` Kiwan / شارع كيوان · Badaro, Beirut, 191 m, anchors 0+7
- `street:emir-korkomaz-badaro` Emir Korkomaz / شارع الأمير قرقماز · Badaro, Beirut, 89 m, anchors 0+7
- `street:sami-el-solh-avenue-beirut` Sami El Solh Avenue / جادة سامي الصلح · Beirut, 1895 m, anchors 0+6
- `street:badaro-street-badaro` Badaro Street / شارع بدارو · Badaro, Beirut, 679 m, anchors 0+6
- `street:abdallah-el-yafi-avenue-badaro` Abdallah El-Yafi Avenue / جادة عبدالله اليافي · Badaro, Beirut, 517 m, anchors 0+6
- `street:rue-hotel-dieu-beirut` Rue Hôtel Dieu / Rue Hôtel Dieu · Beirut, 283 m, anchors 0+6, no-arabic-name
- `street:benoit-barakat-badaro` Benoît Barakat / شارع بنوا بركات · Badaro, Beirut, 212 m, anchors 0+6
- `street:henry-chehab-badaro` Henry Chehab / شارع هنري شهاب · Badaro, Beirut, 204 m, anchors 0+6
- `street:rue-melhem-khalaf-badaro` Rue Melhem Khalaf / Rue Melhem Khalaf · Badaro, Beirut, 153 m, anchors 0+6, no-arabic-name
- `street:rue-mgr-youssef-hobeiche-badaro` Rue Mgr. Youssef Hobeiche / Rue Mgr. Youssef Hobeiche · Badaro, Beirut, 111 m, anchors 0+6, no-arabic-name
- `street:rue-des-perses-beirut` Rue des Perses / Rue des Perses · Beirut, 100 m, anchors 0+6, no-arabic-name
- `street:alam-badaro` Alam / شارع العلم · Badaro, Beirut, 563 m, anchors 0+5
- `street:rue-karm-rahal-beirut` Rue Karm Rahal / شارع كرم ىحال · Beirut, 293 m, anchors 0+5
- `street:rue-elias-medawar-beirut` Rue Élias Medawar / شارع إلياس المدور · Beirut, 242 m, anchors 0+5, english-name-from-french
- `street:nassib-metni-badaro` Nassib Metni / شارع نسيب متني · Badaro, Beirut, 215 m, anchors 0+5
- `street:military-hospital-badaro` Military Hospital / شارع المستشفى العسكري · Badaro, Beirut, 175 m, anchors 0+5
- `street:ramez-sarkis-badaro` Ramez Sarkis / شارع رامز سركيس · Badaro, Beirut, 168 m, anchors 0+5
- `street:georges-catroux-badaro` Georges Catroux / شارع جورج كاترو · Badaro, Beirut, 165 m, anchors 0+5
- `street:youssef-el-khazen-badaro` Youssef El-Khazen / Youssef El-Khazen · Badaro, Beirut, 156 m, anchors 0+5, no-arabic-name
- `street:beni-kanaan-badaro` Beni Kanaan / شارع بني كنعان · Badaro, Beirut, 135 m, anchors 0+5
- `street:abi-lamaa-badaro` Abi Lamaa / شارع أبي اللمع · Badaro, Beirut, 119 m, anchors 0+5
- `street:antelias-badaro` Antélias / شارع انطلياس · Badaro, Beirut, 117 m, anchors 0+5
- `street:zgharta-badaro` Zgharta / شارع زغرتا · Badaro, Beirut, 99 m, anchors 0+5
- `street:rue-el-messarra-badaro` Rue El-Messarra / Rue El-Messarra · Badaro, Beirut, 99 m, anchors 0+5, no-arabic-name
- `street:fata-badaro` Fata / شارع الفتى · Badaro, Beirut, 82 m, anchors 0+5
- `street:ammiq-badaro` Ammiq / شارع عميق · Badaro, Beirut, 81 m, anchors 0+5
- `street:ikhlass-badaro` Ikhlass / شارع الإخلاص · Badaro, Beirut, 51 m, anchors 0+5
- `street:kfoury-badaro` Kfoury / شارع كفوري · Badaro, Beirut, 157 m, anchors 0+4
- `street:rue-negib-azouri-badaro` Rue Negib Azouri / Rue Negib Azouri · Badaro, Beirut, 215 m, anchors 0+3, no-arabic-name
- `street:amine-el-rihani-badaro` Amine El-Rihani / شارع أمين الريحاني · Badaro, Beirut, 205 m, anchors 0+3
- `street:rue-furn-el-chebbak-badaro` Rue Furn El-Chebbak / شارع فرن الشباك · Badaro, Beirut, 140 m, anchors 0+3, english-name-from-french
- `street:traboulsy-badaro` Traboulsy / شارع الطرابلسي · Badaro, Beirut, 81 m, anchors 0+3

</details>

<details><summary><b>Bhamdoun</b>: 1 streets, radius 800 m</summary>

- `street:shari-bakhistay-bhamdoun` Shari' Bakhistay / Shari' Bakhistay · Bhamdoun, 1131 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Broummana</b>: 2 streets, radius 800 m</summary>

- `street:broumana-main-road-broummana` Broumana Main Road / طريق برمانا الرئيسية · Broummana, 5769 m, anchors 0+0
- `street:bikfaya-baabdat-broummana` Bikfaya - Baabdat / طريق بكفيا - بعبدات · Broummana, 1320 m, anchors 0+0

</details>

<details><summary><b>Byblos</b>: 3 streets, radius 800 m</summary>

- `street:sea-road-byblos` Sea Road / طريق البحر · Byblos, 2512 m, anchors 0+0
- `street:rue-pepe-byblos` Rue Pépé / Rue Pépé · Byblos, 858 m, anchors 0+0, no-arabic-name
- `street:route-maritime-rue-100-byblos` Route Maritime - Rue 100 / شارع 100 · Byblos, 389 m, anchors 0+0, english-name-from-french, junk-name:en-ignored

</details>

<details><summary><b>Dbayeh</b>: 6 streets, radius 800 m</summary>

- `street:sea-road-dbayeh` Sea Road / طريق البحر · Dbayeh, 5879 m, anchors 0+1
- `street:old-dbayeh-road-dbayeh` Old Dbayeh Road / طريق ضبية القديم · Dbayeh, 2227 m, anchors 0+1
- `street:marina-waterfront-city-road-dbayeh` Marina Waterfront City Road / طريق مارينا ووترفرونت سيتي · Dbayeh, 1410 m, anchors 0+0
- `street:waterfront-city-highway-dbayeh` Waterfront City Highway / طريق الواجهة البحرية للمدينة · Dbayeh, 919 m, anchors 0+0
- `street:aoukar-bellevue-road-dbayeh` Aoukar - Bellevue Road / طريق عوكر - بللفو · Dbayeh, 252 m, anchors 0+0
- `street:impasse-22-dbayeh` Impasse 22 / زنقة 22 · Dbayeh, 191 m, anchors 0+0

</details>

<details><summary><b>Dekwaneh</b>: 15 streets, radius 800 m</summary>

- `street:al-bash-maroun-khoury-street-dekwaneh` Al Bash Maroun Khoury Street / شارع الباش مارون خوري · Dekwaneh, 1892 m, anchors 2+5
- `street:slav-street-200-dekwaneh` Slav Street 200 / 200 شارع السلاف · Dekwaneh, 585 m, anchors 2+4
- `street:avenue-president-amine-gemayel-dekwaneh` Avenue President Amine Gemayel / Avenue President Amine Gemayel · Dekwaneh, 900 m, anchors 0+4, no-arabic-name
- `street:boulevard-antoine-nicolas-chakhtoura-dekwaneh` Boulevard Antoine Nicolas Chakhtoura / Boulevard Antoine Nicolas Chakhtoura · Dekwaneh, 881 m, anchors 2+3, no-arabic-name
- `street:route-1-dekwaneh` Route 1 / طريق 1 · Dekwaneh, 562 m, anchors 2+3, english-name-from-french, junk-name:en-ignored
- `street:avenue-antoine-chakhtoura-dekwaneh` Avenue Antoine Chakhtoura / Avenue Antoine Chakhtoura · Dekwaneh, 124 m, anchors 2+3, no-arabic-name
- `street:mirna-chalouhi-highway-dekwaneh` Mirna Chalouhi Highway / طريق ميرنا الشالوحي · Dekwaneh, 52 m, anchors 0+3
- `street:route-5-dekwaneh` Route 5 / طريق 5 · Dekwaneh, 659 m, anchors 2+2, english-name-from-french, junk-name:en-ignored
- `street:boulevard-kamil-chamoun-dekwaneh` Boulevard Kamil Chamoun / بولفار كميل شمعون · Dekwaneh, 476 m, anchors 2+2
- `street:route-116-dekwaneh` Route 116 / شارع 116 · Dekwaneh, 84 m, anchors 2+2, english-name-from-french
- `street:place-centrale-dekwaneh` Place Centrale / Place Centrale · Dekwaneh, 70 m, anchors 2+2, no-arabic-name
- `street:route-9-dekwaneh` Route 9 / طريق 9 · Dekwaneh, 1619 m, anchors 2+1, english-name-from-french, junk-name:en-ignored
- `street:route-8-dekwaneh` Route 8 / طريق 8 · Dekwaneh, 879 m, anchors 2+1, english-name-from-french, junk-name:en-ignored
- `street:route-7-dekwaneh` Route 7 / 7 طريق · Dekwaneh, 610 m, anchors 2+1, english-name-from-french, junk-name:en-ignored
- `street:roundabout-mkalles-dekwaneh` Roundabout Mkalles / دوار المكلس · Dekwaneh, 107 m, anchors 0+0

</details>

<details><summary><b>Fanar</b>: 19 streets, radius 800 m</summary>

- `street:fanar-main-road-fanar` Fanar Main Road / طريق الفنار · Fanar, 4428 m, anchors 0+1
- `street:baaqrif-street-fanar` Baaqrif Street / Baaqrif Street · Fanar, 192 m, anchors 0+1, no-arabic-name
- `street:street-11-g-fanar` Street 11-G / شارع 46 · Fanar, 187 m, anchors 0+1
- `street:ain-saadeh-main-road-fanar` Ain Saadeh Main Road / طريق عين سعادة الرئيسي · Fanar, 118 m, anchors 0+1
- `street:bonjus-street-fanar` Bonjus Street / شارع بون جوس · Fanar, 1149 m, anchors 0+0
- `street:street-11-a-1-fanar` Street 11-A-1 / شارع 11 أ 1 · Fanar, 703 m, anchors 0+0
- `street:saydeh-street-fanar` Saydeh Street / شارع السيدة · Fanar, 597 m, anchors 0+0
- `street:el-maamel-street-fanar` El Maamel Street / شارع المعامل · Fanar, 554 m, anchors 0+0
- `street:street-5-a-fanar` Street 5- A / شارع 5 أ · Fanar, 510 m, anchors 0+0
- `street:father-afif-assayran-street-fanar` Father Afif Assayran Street / Father Afif Assayran Street · Fanar, 455 m, anchors 0+0, no-arabic-name
- `street:villa-jaber-street-fanar` Villa Jaber Street / Villa Jaber Street · Fanar, 230 m, anchors 0+0, no-arabic-name
- `street:street-11-a-5-fanar` Street 11-A-5 / شارع 11 أ 5 · Fanar, 178 m, anchors 0+0
- `street:chalet-suisse-street-fanar` Chalet Suisse Street / Chalet Suisse Street · Fanar, 173 m, anchors 0+0, no-arabic-name
- `street:7th-street-fanar` 7th Street / شارع 7 · Fanar, 160 m, anchors 0+0
- `street:street-10-a-fanar` Street 10-A / شارع 10 أ · Fanar, 151 m, anchors 0+0
- `street:street-11-a-6-fanar` Street 11-A-6 / شارع 11 أ 6 · Fanar, 96 m, anchors 0+0
- `street:street-4-b-fanar` Street 4-B / شارع 4 ب · Fanar, 89 m, anchors 0+0
- `street:street-9-a-fanar` Street 9-A / شارع 9 أ · Fanar, 87 m, anchors 0+0
- `street:street-8-a-fanar` Street 8-A / شارع 8 أ · Fanar, 58 m, anchors 0+0

</details>

<details><summary><b>Furn El Chebbak</b>: 6 streets, radius 800 m</summary>

- `street:damascus-road-furn-el-chebbak` Damascus Road / طريق الشام · Furn El Chebbak, 745 m, anchors 0+5
- `street:rue-furn-el-chebbak-furn-el-chebbak` Rue Furn El-Chebbak / شارع فرن الشباك · Furn El Chebbak, 477 m, anchors 0+3, english-name-from-french
- `street:elias-al-hrawi-highway-furn-el-chebbak` Elias Al Hrawi Highway / جادة إلياس الهراوي · Furn El Chebbak, 1509 m, anchors 0+2
- `street:rue-rechdan-furn-el-chebbak` Rue Rechdan / شارع رشدان · Furn El Chebbak, 180 m, anchors 0+2
- `street:jisr-el-bacha-furn-el-chebbak` Jisr El Bacha / جسر الباشا · Furn El Chebbak, 78 m, anchors 0+1
- `street:impasse-37-furn-el-chebbak` Impasse 37 / Impasse 37 · Furn El Chebbak, 50 m, anchors 0+1, no-arabic-name

</details>

<details><summary><b>Gemmayzeh</b>: 21 streets, radius 400 m</summary>

- `street:george-haddad-street-gemmayzeh` George Haddad Street / شارع جورج حداد · Gemmayzeh, Beirut, 1167 m, anchors 0+1
- `street:nahr-ibrahim-gemmayzeh` Nahr Ibrahim / شارع نهر إبراهيم · Gemmayzeh, Beirut, 367 m, anchors 0+1
- `street:gouraud-street-gemmayzeh` Gouraud Street / شارع غورو · Gemmayzeh, Beirut, 332 m, anchors 0+1
- `street:bachir-gemayyel-gemmayzeh` Bachir Gemayyel / شارع بيبلوس · Gemmayzeh, Beirut, 302 m, anchors 0+1
- `street:bechara-el-khoury-road-gemmayzeh` Bechara El Khoury Road / شارع بشارة الخوري · Gemmayzeh, Beirut, 299 m, anchors 0+1
- `street:rue-khatchic-babikian-gemmayzeh` Rue Khatchic Babikian / شارع خاتشيك بابيكيان · Gemmayzeh, Beirut, 281 m, anchors 0+1
- `street:emir-bechir-gemmayzeh` Emir Béchir / شارع الأمير بشير · Gemmayzeh, Beirut, 210 m, anchors 0+1
- `street:rue-youssef-el-hani-gemmayzeh` Rue Youssef El-Hani / شارع يوسف الهاني · Gemmayzeh, Beirut, 208 m, anchors 0+1
- `street:gerard-khatchadorian-gemmayzeh` Gerard Khatchadorian / نجيب حبيقة · Gemmayzeh, Beirut, 142 m, anchors 0+1
- `street:rue-de-la-sainte-famille-gemmayzeh` Rue de la Sainte Famille / Rue de la Sainte Famille · Gemmayzeh, Beirut, 126 m, anchors 0+1, no-arabic-name
- `street:jemmayzeh-gemmayzeh` Jemmayzeh / شارع الجميزة · Gemmayzeh, Beirut, 95 m, anchors 0+1
- `street:said-aql-gemmayzeh` Said Aql / شارع سعيد عقل · Gemmayzeh, Beirut, 33 m, anchors 0+1
- `street:rue-boutros-dagher-gemmayzeh` Rue Boutros Dagher / Rue Boutros Dagher · Gemmayzeh, Beirut, 30 m, anchors 0+1, no-arabic-name
- `street:freres-gemmayzeh` Frères / شارع الفرير · Gemmayzeh, Beirut, 30 m, anchors 0+1
- `street:el-arz-gemmayzeh` El Arz / شارع باستور · Gemmayzeh, Beirut, 371 m, anchors 0+0
- `street:charles-helou-avenue-gemmayzeh` Charles Hélou Avenue / جادة شارل الحلو · Gemmayzeh, Beirut, 293 m, anchors 0+0
- `street:des-liberateurs-gemmayzeh` Des Libérateurs / Des Libérateurs · Gemmayzeh, Beirut, 96 m, anchors 0+0, no-arabic-name
- `street:chedid-hobeich-gemmayzeh` Chedid Hobeich / شارع شديد حبيش · Gemmayzeh, Beirut, 79 m, anchors 0+0
- `street:chanty-gemmayzeh` Chanty / شارع الشنطي · Gemmayzeh, Beirut, 73 m, anchors 0+0
- `street:rue-jebran-tueni-gemmayzeh` Rue Jebran Tuéni / شارع 33 · Gemmayzeh, Beirut, 31 m, anchors 0+0, english-name-from-french
- `street:douanes-gemmayzeh` Douanes / شارع الجمارك · Gemmayzeh, Beirut, 31 m, anchors 0+0

</details>

<details><summary><b>Hamra</b>: 40 streets, radius 400 m</summary>

- `street:emile-edde-street-beirut` Emile Eddé Street / شارع إميل أده · Beirut, 1170 m, anchors 3+5
- `street:hamra-street-hamra` Hamra Street / شارع الحمرا · Hamra, Beirut, 957 m, anchors 3+4
- `street:rue-de-baalbek-hamra` Rue de Baalbek / شارع بعلبك · Hamra, Beirut, 687 m, anchors 3+4
- `street:sourati-hamra` Sourati / شارع صوراتي · Hamra, Beirut, 620 m, anchors 3+4
- `street:rebeiz-hamra` Rebeiz / شارع ربيز · Hamra, Beirut, 374 m, anchors 3+4
- `street:sitt-nassab-hamra` Sitt Nassab / شارع الست نسب · Hamra, Beirut, 266 m, anchors 3+4
- `street:cairo-hamra` Cairo / شارع القاهرة · Hamra, Beirut, 458 m, anchors 2+4
- `street:rue-de-rome-beirut` Rue de Rome / شارع روما · Beirut, 381 m, anchors 2+4
- `street:rue-roosevelt-hamra` Rue Roosevelt / شارع روزفلت · Hamra, Beirut, 126 m, anchors 2+4
- `street:bliss-street-beirut` Bliss Street / شارع بليس · Beirut, 1089 m, anchors 3+3
- `street:jeanne-d-arc-street-hamra` Jeanne d'Arc Street / شارع جان دارك · Hamra, Beirut, 622 m, anchors 3+3
- `street:omar-ben-abdel-aziz-hamra` Omar Ben Abdel Aziz / شارع عمر بن عبد العزيز · Hamra, Beirut, 579 m, anchors 3+3
- `street:sidani-street-hamra` Sidani Street / شارع الصيداني · Hamra, Beirut, 374 m, anchors 3+3
- `street:cheikh-elias-gaspard-hamra` Cheikh Elias Gaspard / شارع الشيخ الياس كسبار · Hamra, Beirut, 354 m, anchors 3+3
- `street:makhoul-street-hamra` Makhoul Street / شارع المكحول · Hamra, Beirut, 261 m, anchors 3+3
- `street:makdissi-hamra` Makdissi / شارع المقدسي · Hamra, Beirut, 247 m, anchors 3+3
- `street:dr-samir-najjar-hamra` Dr. Samir Najjar / شارع 76 · Hamra, Beirut, 186 m, anchors 3+3
- `street:rue-jabre-doumit-hamra` Rue Jabre Doumit / شارع جبر ضومط · Hamra, Beirut, 180 m, anchors 3+3
- `street:rue-jabbour-hamra` Rue Jabbour / شارع جبور · Hamra, Beirut, 152 m, anchors 3+3
- `street:rue-khalidy-hamra` Rue Khalidy / شارع الخالدي · Hamra, Beirut, 144 m, anchors 3+3
- `street:ibrahim-abed-el-aal-street-hamra` Ibrahim Abed El Aal Street / Ibrahim Abed El Aal Street · Hamra, Beirut, 137 m, anchors 3+3, no-arabic-name
- `street:rue-abdallah-el-tanoukhi-hamra` Rue Abdallah El Tanoukhi / شارع عبد الله التنوخي · Hamra, Beirut, 122 m, anchors 3+3
- `street:rue-basra-hamra` Rue Basra / شارع البصرة · Hamra, Beirut, 108 m, anchors 3+3
- `street:professor-moustapha-chahin-hamra` Professor Moustapha Chahin / شارع 76 · Hamra, Beirut, 80 m, anchors 3+3
- `street:clemenceau-street-beirut` Clémenceau Street / شارع كليمنصو · Beirut, 755 m, anchors 2+3
- `street:rue-mohammed-abdel-baki-hamra` Rue Mohammed Abdel Baki / شارع محمد عبد الباقي · Hamra, Beirut, 456 m, anchors 2+3
- `street:maamari-street-hamra` Maamari Street / شارع المعماري · Hamra, Beirut, 451 m, anchors 2+3
- `street:rue-rabindranath-tagore-hamra` Rue Rabindranath Tagore / شارع رابندرانات طاغور · Hamra, Beirut, 159 m, anchors 2+3, english-name-from-french
- `street:rue-badr-hamra` Rue Badr / شارع بدر · Hamra, Beirut, 73 m, anchors 2+3
- `street:rue-selim-el-awar-hamra` Rue Selim El-Awar / شارع سليم الأعور · Hamra, Beirut, 32 m, anchors 2+3
- `street:mahatma-gandhi-hamra` Mahatma Gandhi / شارع المهتما غاندي · Hamra, Beirut, 534 m, anchors 3+2
- `street:sadat-hamra` Sadat / شارع السادات · Hamra, Beirut, 461 m, anchors 3+2
- `street:rue-antoun-gemayel-hamra` Rue Antoun Gemayel / شارع أنطون الجميل · Hamra, Beirut, 453 m, anchors 3+2, english-name-from-french
- `street:nehmeh-jafet-hamra` Nehmeh Jafet / شارع نعمة يافت · Hamra, Beirut, 443 m, anchors 3+2
- `street:rue-yamout-hamra` Rue Yamout / شارع يموت · Hamra, Beirut, 210 m, anchors 3+2
- `street:rue-faouzi-maalouf-hamra` Rue Faouzi Maalouf / شارع فوزي المعلوف · Hamra, Beirut, 140 m, anchors 3+2
- `street:rue-bekhaazi-hamra` Rue Bekhaazi / شارع بخعازي · Hamra, Beirut, 116 m, anchors 3+2
- `street:rue-barouk-hamra` Rue Barouk / شارع الباروك · Hamra, Beirut, 80 m, anchors 3+2
- `street:rue-araman-hamra` Rue Araman / شارع عرمان · Hamra, Beirut, 37 m, anchors 3+2
- `street:american-university-street-hamra` American University Street / شارع الجامعة الأميركية · Hamra, Beirut, 31 m, anchors 3+2

</details>

<details><summary><b>Jnah</b>: 6 streets, radius 400 m</summary>

- `street:adnan-el-hakim-street-beirut` Adnan El-Hakim Street / شارع عدنان الحكيم · Beirut, 143 m, anchors 0+1
- `street:rue-farid-trad-beirut` Rue Farid Trad / شارع فريد طراد · Beirut, 1237 m, anchors 1+0, english-name-from-french
- `street:rue-ahmed-el-solh-jnah` Rue Ahmed El-Solh / شارع أحمد الصلح · Jnah, Beirut, 405 m, anchors 0+0, english-name-from-french
- `street:kheireddine-el-ahdab-jnah` Kheireddine El-Ahdab / شارع خير الدين الأحدب · Jnah, Beirut, 213 m, anchors 0+0
- `street:rue-nimat-beydoun-kronfol-jnah` Rue Nimat Beydoun Kronfol / شارع نعمت بيضون قرنفل · Jnah, Beirut, 157 m, anchors 0+0, english-name-from-french
- `street:fouad-ammoun-jnah` Fouad Ammoun / شارع فؤاد عمون · Jnah, Beirut, 119 m, anchors 0+0

</details>

<details><summary><b>Jounieh</b>: 13 streets, radius 800 m</summary>

- `street:sea-road-jounieh` Sea Road / طريق البحر · Jounieh, 7692 m, anchors 0+3
- `street:jounieh-osm-304092513` شارع خوري وبارود / شارع خوري وبارود · Jounieh, 374 m, anchors 0+1, no-latin-name
- `street:jounieh-osm-26405382` شارع فينيقيا / شارع فينيقيا · Jounieh, 223 m, anchors 0+1, no-latin-name
- `street:route-jounieh-chnanir-jounieh` Route Jounieh - Chnanir / طريق جونية الجديدة · Jounieh, 211 m, anchors 0+1
- `street:rue-khoury-et-baroud-jounieh` Rue Khoury et Baroud / Rue Khoury et Baroud · Jounieh, 88 m, anchors 0+1, no-arabic-name
- `street:street-a2-jounieh` Street A2 / شارع أ 2 · Jounieh, 72 m, anchors 0+1
- `street:rue-fouad-chehab-jounieh` Rue Fouad Chehab / شارع فؤاد شهاب · Jounieh, 68 m, anchors 0+1, english-name-from-french
- `street:harissa-road-jounieh` Harissa Road / طريق حريصا · Jounieh, 1399 m, anchors 0+0
- `street:jardin-public-de-jounieh-jounieh` Jardin Public de Jounieh / Jardin Public de Jounieh · Jounieh, 843 m, anchors 0+0, no-arabic-name
- `street:hopital-saint-louis-street-jounieh` Hôpital Saint Louis Street / Hôpital Saint Louis Street · Jounieh, 644 m, anchors 0+0, no-arabic-name
- `street:deutsche-schule-street-jounieh` Deutsche Schule Street / Deutsche Schule Street · Jounieh, 139 m, anchors 0+0, no-arabic-name
- `street:ghosta-street-jounieh` Ghosta Street / طريق غوسطا · Jounieh, 91 m, anchors 0+0
- `street:monastery-street-jounieh` Monastery street / Monastery street · Jounieh, 58 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Kaslik</b>: 3 streets, radius 800 m</summary>

- `street:sheer-street-kaslik` Sheer Street / شارع شير · Kaslik, Jounieh, 95 m, anchors 0+2
- `street:kaslik-shopping-street-kaslik` Kaslik Shopping Street / شارع الكسليك للتسوق · Kaslik, Jounieh, 793 m, anchors 0+1
- `street:hospital-notre-dame-street-kaslik` Hospital Notre Dame Street / شارع مستشفى نوتردام · Kaslik, Jounieh, 121 m, anchors 0+1

</details>

<details><summary><b>Mar Mikhael</b>: 22 streets, radius 400 m</summary>

- `street:armenia-street-beirut` Armenia Street / شارع أرمينيا · Beirut, 588 m, anchors 0+2
- `street:rue-pharaon-mar-mikhael` Rue Pharaon / شارع فرعون · Mar Mikhael, Beirut, 550 m, anchors 0+2
- `street:ibrahim-pacha-mar-mikhael` Ibrahim Pacha / شارع إبراهيم باشا · Mar Mikhael, Beirut, 497 m, anchors 0+2
- `street:fouad-boutros-mar-mikhael` Fouad Boutros / شارع فؤاد بطرس · Mar Mikhael, Beirut, 365 m, anchors 0+2
- `street:madrid-mar-mikhael` Madrid / شارع مدريد · Mar Mikhael, Beirut, 290 m, anchors 0+2
- `street:rue-nicolas-turk-mar-mikhael` Rue Nicolas Turk / شارع نقولا الترك · Mar Mikhael, Beirut, 229 m, anchors 0+2
- `street:chafaqa-mar-mikhael` Chafaqa / شارع الشفقة · Mar Mikhael, Beirut, 175 m, anchors 0+2
- `street:rue-ibn-el-rabih-mar-mikhael` Rue Ibn El-Rabih / شارع ابن الربيع · Mar Mikhael, Beirut, 161 m, anchors 0+2
- `street:mar-mikhael-mar-mikhael` Mar Mikhael / شارع مار مخائيل · Mar Mikhael, Beirut, 150 m, anchors 0+2
- `street:alexander-fleming-mar-mikhael` Alexander Fleming / شارع ألكسندر فليمنغ · Mar Mikhael, Beirut, 107 m, anchors 0+2
- `street:rue-rabbat-mar-mikhael` Rue Rabbat / شارع الرباط · Mar Mikhael, Beirut, 102 m, anchors 0+2
- `street:lamartine-mar-mikhael` Lamartine / شارع لامارتين · Mar Mikhael, Beirut, 85 m, anchors 0+2
- `street:rue-camille-youssef-chamoun-mar-mikhael` Rue Camille Youssef Chamoun / شارع كميل يوسف شمعون · Mar Mikhael, Beirut, 78 m, anchors 0+2
- `street:papinien-mar-mikhael` Papinien / شارع بابينيانوس · Mar Mikhael, Beirut, 30 m, anchors 0+2
- `street:brazil-street-mar-mikhael` Brazil Street / شارع البرازيل · Mar Mikhael, Beirut, 377 m, anchors 0+1
- `street:maroun-awad-mar-mikhael` Maroun Awad / شارع مارون عواد · Mar Mikhael, Beirut, 139 m, anchors 0+1
- `street:rue-raymond-raphael-mar-mikhael` Rue Raymond Raphael / Rue Raymond Raphael · Mar Mikhael, Beirut, 132 m, anchors 0+1, no-arabic-name
- `street:raymond-rouphael-mar-mikhael` Raymond Rouphael / شارع عين ورقة · Mar Mikhael, Beirut, 132 m, anchors 0+1
- `street:joseph-rophael-mar-mikhael` Joseph Rophaël / شارع جوزف روفائيل · Mar Mikhael, Beirut, 192 m, anchors 0+0
- `street:rihbane-mar-mikhael` Rihbane / شارع الرهبان · Mar Mikhael, Beirut, 30 m, anchors 0+0
- `street:abattoirs-mar-mikhael` Abattoirs / شارع المسلخ · Mar Mikhael, Beirut, 30 m, anchors 0+0
- `street:senegal-mar-mikhael` Sénégal / شارع السنغال · Mar Mikhael, Beirut, 30 m, anchors 0+0

</details>

<details><summary><b>Nabatieh</b>: 15 streets, radius 800 m</summary>

- `street:nabih-berri-avenue-nabatieh` Nabih Berri Avenue / جادة الرئيس نبيه بري · Nabatieh, 2154 m, anchors 0+2
- `street:maslakh-street-nabatieh` Maslakh Street / شارع المسلخ · Nabatieh, 675 m, anchors 0+2
- `street:nabatiyeh-marjayoun-road-nabatieh` Nabatiyeh - Marjayoun Road / طريق النبطية - مرجعيون · Nabatieh, 3649 m, anchors 0+0
- `street:mayfadoun-road-nabatieh` Mayfadoun Road / طريق ميفدون · Nabatieh, 2089 m, anchors 0+0
- `street:al-jazayer-street-nabatieh` Al Jazayer Street / شارع الجزاير · Nabatieh, 1585 m, anchors 0+0
- `street:shaqeef-street-nabatieh` Shaqeef Street / شارع الشقيف · Nabatieh, 1567 m, anchors 0+0
- `street:choukine-harrouf-road-nabatieh` Choukine - Harrouf Road / طريق شوكين - حاروف · Nabatieh, 1507 m, anchors 0+0
- `street:mashaa-street-nabatieh` Mashaa Street / طريق المشاع · Nabatieh, 1109 m, anchors 0+0
- `street:mahmoud-fakih-street-nabatieh` Mahmoud Fakih Street / شارع محمود فقيه · Nabatieh, 906 m, anchors 0+0
- `street:hasan-kamel-el-sabbah-street-nabatieh` Hasan Kamel el Sabbah Street / شارع حسن كامل الصباح · Nabatieh, 734 m, anchors 0+0
- `street:khallet-el-hawa-nabatieh` Khallet El Hawa / شارع خلة الهوا · Nabatieh, 480 m, anchors 0+0
- `street:zahrani-nabatieh-autostrad-nabatieh` Zahrani - Nabatieh Autostrad / الزهراني - النبطية أوتوستراد · Nabatieh, 442 m, anchors 0+0
- `street:old-assaraya-st-nabatieh` Old Assaraya ST / حي السرايا · Nabatieh, 393 m, anchors 0+0
- `street:rahibat-street-nabatieh` Rahibat Street / شارع الراهبات · Nabatieh, 356 m, anchors 0+0
- `street:bayyad-st-nabatieh` Bayyad St / شارع البياض · Nabatieh, 330 m, anchors 0+0

</details>

<details><summary><b>Ras Beirut</b>: 66 streets, radius 400 m</summary>

- `street:abdel-rahman-itani-ras-beirut` Abdel Rahman Itani / شارع عبد الرحمن العيتاني · Ras Beirut, Beirut, 304 m, anchors 3+5
- `street:amine-mneimne-ras-beirut` Amine Mneimné / شارع أمين منيمنة · Ras Beirut, Beirut, 229 m, anchors 2+5
- `street:alfred-nobel-beirut` Alfred Nobel / شارع ألفرد نوبل · Beirut, 406 m, anchors 4+4
- `street:madame-curie-ras-beirut` Madame Curie / شارع مدام كوري · Ras Beirut, Beirut, 991 m, anchors 2+4
- `street:dunant-beirut` Dunant / شارع دونان · Beirut, 661 m, anchors 1+4
- `street:rue-moustapha-kamel-ras-beirut` Rue Moustapha Kamel / شارع مصطفى كامل · Ras Beirut, Beirut, 336 m, anchors 1+4
- `street:wadih-sabra-ras-beirut` Wadih Sabra / شارع وديع صبرا · Ras Beirut, Beirut, 156 m, anchors 3+3
- `street:rue-tabary-ras-beirut` Rue Tabary / شارع الطبري · Ras Beirut, Beirut, 133 m, anchors 3+3
- `street:kamal-joumblatt-ras-beirut` Kamal Joumblatt / شارع كمال جنبلاط · Ras Beirut, Beirut, 316 m, anchors 2+3
- `street:john-kennedy-beirut` John Kennedy / شارع جون كينيدي · Beirut, 293 m, anchors 2+3
- `street:rue-negib-aboussouan-ras-beirut` Rue Negib Aboussouan / شارع نجيب أبو صوان · Ras Beirut, Beirut, 280 m, anchors 2+3
- `street:amerique-ras-beirut` Amérique / شارع أميركا · Ras Beirut, Beirut, 235 m, anchors 2+3
- `street:rue-jamil-houssami-ras-beirut` Rue Jamil Houssami / شارع جميل الحسامي · Ras Beirut, Beirut, 135 m, anchors 2+3
- `street:constantine-zreik-ras-beirut` Constantine Zreik / شارع قسطنط3ين زريق · Ras Beirut, Beirut, 118 m, anchors 2+3
- `street:dr-muhieddine-bargout-ras-beirut` Dr. Muhieddine Bargout / شارع 60 · Ras Beirut, Beirut, 85 m, anchors 2+3
- `street:kuwait-street-ras-beirut` Kuwait Street / شارع الكويت · Ras Beirut, Beirut, 587 m, anchors 3+2
- `street:negib-ardati-ras-beirut` Negib Ardati / شارع نجيب عرداتي · Ras Beirut, Beirut, 467 m, anchors 3+2
- `street:labbane-ras-beirut` Labbane / شارع اللبان · Ras Beirut, Beirut, 409 m, anchors 3+2
- `street:rue-justinien-ras-beirut` Rue Justinien / شارع جستنيان · Ras Beirut, Beirut, 370 m, anchors 0+3
- `street:tannoukhiyne-ras-beirut` Tannoukhiyne / شارع التنوخيين · Ras Beirut, Beirut, 315 m, anchors 3+2
- `street:mansour-jurdak-ras-beirut` Mansour Jurdak / شارع منصور جرداق · Ras Beirut, Beirut, 289 m, anchors 3+2
- `street:adonis-ras-beirut` Adonis / شارع أدونيس · Ras Beirut, Beirut, 283 m, anchors 3+2
- `street:adel-el-solh-ras-beirut` Adel El-Solh / شارع عادل الصلح · Ras Beirut, Beirut, 217 m, anchors 3+2
- `street:rue-ahmad-mokhtar-khaled-ras-beirut` Rue Ahmad Mokhtar Khaled / شارع أحمد مختار خالد · Ras Beirut, Beirut, 128 m, anchors 0+3
- `street:rue-moustapha-ghalaini-ras-beirut` Rue Moustapha Ghalaini / شارع مصطفى الغلايني · Ras Beirut, Beirut, 102 m, anchors 3+2
- `street:iskandar-riachi-ras-beirut` Iskandar Riachi / اسكندر رياشي · Ras Beirut, Beirut, 78 m, anchors 3+2
- `street:rue-el-houda-ras-beirut` Rue El-Houda / شارع الهدى · Ras Beirut, Beirut, 77 m, anchors 3+2
- `street:rue-aboul-fida-ras-beirut` Rue Aboul-Fida / شارع أبو الفدا · Ras Beirut, Beirut, 70 m, anchors 3+2
- `street:khaled-ibn-el-walid-beirut` Khaled Ibn-El Walid / شارع خالد إبن الوليد · Beirut, 476 m, anchors 2+2
- `street:dr-nicolas-rebeiz-ras-beirut` Dr. Nicolas Rebeiz / شارع الدكتور نقولا ربيز · Ras Beirut, Beirut, 207 m, anchors 2+2
- `street:el-hussein-ras-beirut` El-Hussein / شارع الحسين · Ras Beirut, Beirut, 783 m, anchors 4+1
- `street:mougarbel-ras-beirut` Mougarbel / شارع المغربل · Ras Beirut, Beirut, 196 m, anchors 4+1
- `street:bristol-ras-beirut` Bristol / شارع البريستول · Ras Beirut, Beirut, 77 m, anchors 1+2
- `street:rue-hourani-ras-beirut` Rue Hourani / شارع الحوراني · Ras Beirut, Beirut, 143 m, anchors 0+2
- `street:hussein-talhouk-ras-beirut` Hussein Talhouk / شارع حسين تلحوق · Ras Beirut, Beirut, 62 m, anchors 3+1
- `street:general-de-gaulle-avenue-beirut` Général de Gaulle Avenue / جادة الجنرال ديغول · Beirut, 4214 m, anchors 2+1
- `street:rue-khalid-ibn-al-walid-beirut` Rue Khalid ibn al-Walid / شارع خالد بن الوليد · Beirut, 998 m, anchors 2+1
- `street:australia-street-beirut` Australia street / شارع أستراليا · Beirut, 666 m, anchors 2+1
- `street:rafic-arslane-ras-beirut` Rafic Arslane / شارع رفيق أرسلان · Ras Beirut, Beirut, 403 m, anchors 2+1
- `street:mazboudi-ras-beirut` Mazboudi / شارع مزبودي · Ras Beirut, Beirut, 230 m, anchors 2+1
- `street:rue-abdel-rahim-diab-ras-beirut` Rue Abdel Rahim Diab / شارع عبد الرحيم دياب · Ras Beirut, Beirut, 222 m, anchors 2+1
- `street:abdel-razzak-hamade-beirut` Abdel-Razzak Hamadé / شارع عبد الرزاق حماده · Beirut, 170 m, anchors 2+1
- `street:badr-demachkieh-street-ras-beirut` Badr Demachkieh Street / شارع بدر دمشقية · Ras Beirut, Beirut, 908 m, anchors 1+1
- `street:rue-salaheddine-el-ayoubi-ras-beirut` Rue Salaheddine El Ayoubi / شارع صلاح الدين الأيوبي · Ras Beirut, Beirut, 550 m, anchors 1+1
- `street:khaled-chehab-ras-beirut` Khaled Chehab / شارع خالد شهاب · Ras Beirut, Beirut, 422 m, anchors 1+1
- `street:qalaa-street-ras-beirut` Qalaa Street / شارع القلعة · Ras Beirut, Beirut, 363 m, anchors 1+1
- `street:father-lammens-ras-beirut` Father Lammens / شارع الأب لامنس · Ras Beirut, Beirut, 329 m, anchors 1+1
- `street:adib-kaddoura-ras-beirut` Adib Kaddoura / شارع أديب قدورة · Ras Beirut, Beirut, 304 m, anchors 1+1
- `street:rue-chatila-ras-beirut` Rue Chatila / شارع شاتيلا · Ras Beirut, Beirut, 285 m, anchors 1+1
- `street:rue-tabbara-ras-beirut` Rue Tabbara / شارع طبارة · Ras Beirut, Beirut, 261 m, anchors 1+1
- `street:corniche-beirut-ras-beirut` Corniche Beirut / كرنيش بيروت · Ras Beirut, Beirut, 253 m, anchors 1+1
- `street:andalouss-ras-beirut` Andalouss / شارع الأندلس · Ras Beirut, Beirut, 250 m, anchors 1+1
- `street:rue-iskandar-azar-ras-beirut` Rue Iskandar Azar / شارع إسكندر عازار · Ras Beirut, Beirut, 215 m, anchors 1+1, english-name-from-french
- `street:zaki-mazboudi-ras-beirut` Zaki Mazboudi / شارع زكي مزبودي · Ras Beirut, Beirut, 205 m, anchors 1+1
- `street:bahrein-ras-beirut` Bahrein / شارع البحرين · Ras Beirut, Beirut, 196 m, anchors 1+1
- `street:rue-venus-ras-beirut` Rue Vénus / شارع فينوس · Ras Beirut, Beirut, 191 m, anchors 1+1
- `street:chevaliers-du-temple-ras-beirut` Chevaliers du Temple / شارع فرسان الهيكل · Ras Beirut, Beirut, 187 m, anchors 1+1
- `street:simon-bolivar-ras-beirut` Simon Bolivar / شارع سيمون بوليفار · Ras Beirut, Beirut, 147 m, anchors 1+1
- `street:rue-achtarout-ras-beirut` Rue Achtarout / شارع عشتروت · Ras Beirut, Beirut, 128 m, anchors 1+1, english-name-from-french
- `street:salah-eddine-itani-ras-beirut` Salah Eddine Itani / شارع صلاح الدين عيتاني · Ras Beirut, Beirut, 125 m, anchors 1+1
- `street:city-suite-street-ras-beirut` City Suite Street / City Suite Street · Ras Beirut, Beirut, 107 m, anchors 1+1, no-arabic-name
- `street:rue-soubra-ras-beirut` Rue Soubra / شارع سوبرة · Ras Beirut, Beirut, 77 m, anchors 1+1, english-name-from-french
- `street:rue-el-oud-ras-beirut` Rue El-Oud / Rue El-Oud · Ras Beirut, Beirut, 57 m, anchors 1+1, no-arabic-name
- `street:rue-michel-ange-ras-beirut` Rue Michel Ange / شارع ميكل أنج · Ras Beirut, Beirut, 194 m, anchors 0+1
- `street:rue-gibrael-nassar-ras-beirut` Rue Gibrael Nassar / شارع جبرائيل نصار · Ras Beirut, Beirut, 99 m, anchors 0+1
- `street:mgr-rouphael-ras-beirut` Mgr. Rouphael / شارع المونسينيور روفايل · Ras Beirut, Beirut, 97 m, anchors 0+1

</details>

<details><summary><b>Saida</b>: 40 streets, radius 800 m</summary>

- `street:sea-road-saida` Sea Road / طريق البحر · Saida, 13457 m, anchors 0+2
- `street:maarouf-saad-boulevard-saida` Maarouf Saad Boulevard / بولفار معروف سعد · Saida, 4970 m, anchors 0+2
- `street:president-adel-osseiran-street-saida` President Adel Osseiran Street / شارع الرئيس عادل عسيران · Saida, 2202 m, anchors 0+2
- `street:seray-street-saida` Seray Street / شارع السراي · Saida, 1309 m, anchors 0+2
- `street:rue-labeeb-abu-thaher-saida` Rue Labeeb Abu Thaher / شارع الدكتور لبيب أبو ظهر · Saida, 727 m, anchors 0+2, english-name-from-french
- `street:rue-fouad-osseiran-saida` Rue Fouad Osseiran / شارع الدكتور فؤاد عسيران · Saida, 509 m, anchors 0+2, english-name-from-french
- `street:cheikh-mouharram-aarify-street-saida` Cheikh Mouharram Aarify Street / شارع الشيخ محرم عارفي · Saida, 417 m, anchors 0+2
- `street:saida-osm-25921407` شارع دلاعة / شارع دلاعة · Saida, 404 m, anchors 0+2, no-latin-name
- `street:nazlet-sidoun-street-saida` Nazlet Sidoun Street / شارع نزلة صيدون · Saida, 333 m, anchors 0+2
- `street:al-arabi-square-saida` Al Arabi Square / دوار العربي · Saida, 331 m, anchors 0+2
- `street:martyrs-square-saida` Martyrs Square / ساحة الشهداء · Saida, 322 m, anchors 0+2
- `street:rue-mostafa-saad-saida` Rue Mostafa Saad / شارع مصطفى سعد · Saida, 285 m, anchors 0+2, english-name-from-french
- `street:saida-osm-33779116` شارع الحج حافظ / شارع الحج حافظ · Saida, 265 m, anchors 0+2, no-latin-name
- `street:saida-osm-1553993715` شارع الست نفيسة / شارع الست نفيسة · Saida, 239 m, anchors 0+2, no-latin-name
- `street:nazih-bizri-boulevard-saida` Nazih Bizri Boulevard / بوليفارد نزيه بزري · Saida, 5857 m, anchors 0+1
- `street:riad-al-solh-street-saida` Riad al-Solh Street / شارع رياض الصلح · Saida, 3794 m, anchors 0+1
- `street:sheikh-omar-al-hallaq-street-saida` Sheikh Omar al-Hallaq Street / شارع الشيخ عمر الحلاق · Saida, 409 m, anchors 0+1
- `street:rue-adnan-nawam-saida` Rue Adnan Nawam / شارع الدكتور عدنان النوام · Saida, 308 m, anchors 0+1, english-name-from-french
- `street:ghassan-hammoud-street-saida` Ghassan Hammoud Street / شارع غسان حمود · Saida, 281 m, anchors 0+1
- `street:al-quds-street-saida` Al Quds Street / شارع القدس · Saida, 220 m, anchors 0+1
- `street:hariri-square-saida` Hariri Square / دوار الحريري · Saida, 207 m, anchors 0+1
- `street:saida-osm-26708632` دوار الأمريكان / دوار الأمريكان · Saida, 156 m, anchors 0+1, no-latin-name
- `street:al-quds-square-saida` Al Quds Square / ساحة القدس · Saida, 77 m, anchors 0+1
- `street:houssam-eddine-rafic-hariri-street-saida` Houssam Eddine Rafic Hariri Street / شارع حسام الدين رفيق حريري · Saida, 1742 m, anchors 0+0
- `street:sea-highway-saida` Sea Highway / أتستراد البحر · Saida, 575 m, anchors 0+0
- `street:salim-hijazi-bilal-azam-street-saida` Salim Hijazi & Bilal Azam Street / شارع الشهيدين سليم أمين حجازي و بلال محي الدين عزام · Saida, 537 m, anchors 0+0
- `street:al-moasat-street-saida` Al Moasat Street / شارع المواساة · Saida, 456 m, anchors 0+0
- `street:ahmad-mahmoud-naddaf-street-saida` Ahmad Mahmoud Naddaf Street / شارع أحمد محمود النداف · Saida, 381 m, anchors 0+0
- `street:hesbeh-square-saida` Hesbeh Square / دوار الحسبة · Saida, 278 m, anchors 0+0
- `street:basilios-hajjar-street-saida` Basilios Hajjar Street / شارع باسيليوس حجار · Saida, 274 m, anchors 0+0
- `street:saida-osm-437052649` شارع القاضي  أحمد أكرم عزالدين بعاصيري / شارع القاضي  أحمد أكرم عزالدين بعاصيري · Saida, 243 m, anchors 0+0, no-latin-name
- `street:saida-osm-437054551` شارع مرعي أبو مرعي / شارع مرعي أبو مرعي · Saida, 220 m, anchors 0+0, no-latin-name
- `street:morjan-square-saida` Morjan Square / دوار مرجان · Saida, 217 m, anchors 0+0
- `street:dr-abdallah-youssef-kanaan-street-saida` Dr. Abdallah Youssef Kanaan Street / شارع الدكتور عبدالله يوسف كنعان · Saida, 208 m, anchors 0+0
- `street:salim-ghazzal-street-saida` Salim Ghazzal Street / شارع المطران سليم غزال · Saida, 194 m, anchors 0+0
- `street:muhammad-ali-zaatari-street-saida` Muhammad Ali Zaatari Street / شارع محمد علي زعتري · Saida, 167 m, anchors 0+0
- `street:place-nejmeh-saida` Place Nejmeh / ساحة النجمة · Saida, 135 m, anchors 0+0, english-name-from-french
- `street:saida-osm-437055844` شارع  الدكتور بازيل عبود / شارع  الدكتور بازيل عبود · Saida, 131 m, anchors 0+0, no-latin-name
- `street:jubeily-roundabout-saida` Jubeily Roundabout / دوار الجبيلي · Saida, 65 m, anchors 0+0
- `street:qanay-roundabout-saida` Qanay Roundabout / دوار القناية · Saida, 43 m, anchors 0+0

</details>

<details><summary><b>Tariq El Jdide</b>: 30 streets, radius 400 m</summary>

- `street:avenue-camille-chamoun-tariq-el-jdide` Avenue Camille Chamoun / جادة كميل شمعون · Tariq El Jdide, Beirut, 1635 m, anchors 0+3
- `street:mufti-cheikh-hassan-khaled-tariq-el-jdide` Mufti Cheikh Hassan Khaled / Mufti Cheikh Hassan Khaled · Tariq El Jdide, Beirut, 1152 m, anchors 0+3, no-arabic-name
- `street:hassanein-street-tariq-el-jdide` Hassanein Street / شارع الحسنين · Tariq El Jdide, Beirut, 562 m, anchors 0+3
- `street:universite-arabe-tariq-el-jdide` Université Arabe / شارع الجامعة العربية · Tariq El Jdide, Beirut, 537 m, anchors 0+3
- `street:baghdadi-street-tariq-el-jdide` Baghdadi Street / شارع البغدادي · Tariq El Jdide, Beirut, 352 m, anchors 0+3
- `street:abou-sahl-street-tariq-el-jdide` Abou Sahl Street / شارع أبو سهل · Tariq El Jdide, Beirut, 346 m, anchors 0+3
- `street:rue-omar-houri-tariq-el-jdide` Rue Omar Houri / شارع عمر الحوري · Tariq El Jdide, Beirut, 258 m, anchors 0+3, english-name-from-french
- `street:capitaine-zgheib-tariq-el-jdide` Capitaine Zgheib / شارع النقيب زغيب · Tariq El Jdide, Beirut, 244 m, anchors 0+3
- `street:mohammed-kharma-tariq-el-jdide` Mohammed Kharma / شارع محمد خرما · Tariq El Jdide, Beirut, 195 m, anchors 0+3
- `street:bachchar-tariq-el-jdide` Bachchar / شارع بشار · Tariq El Jdide, Beirut, 107 m, anchors 0+3
- `street:derwich-tariq-el-jdide` Derwich / شارع الدرويش · Tariq El Jdide, Beirut, 101 m, anchors 0+3
- `street:qalaat-rachaiya-tariq-el-jdide` Qalaat Rachaiya / شارع قلعة راشيا · Tariq El Jdide, Beirut, 87 m, anchors 0+3
- `street:tarik-el-jedide-tariq-el-jdide` Tarik El-Jedidé / شارع الطريق الجديدة · Tariq El Jdide, Beirut, 43 m, anchors 0+3
- `street:salma-sayegh-tariq-el-jdide` Salma Sayegh / شارع سلمى صايغ · Tariq El Jdide, Beirut, 35 m, anchors 0+3
- `street:freres-fleyfel-tariq-el-jdide` Frères Fleyfel / شارع الأخوين فليفل · Tariq El Jdide, Beirut, 34 m, anchors 0+3
- `street:rue-afif-tibi-tariq-el-jdide` Rue Afif Tibi / شارع عفيف الطيبي · Tariq El Jdide, Beirut, 33 m, anchors 0+3, english-name-from-french
- `street:omar-farroukh-tariq-el-jdide` Omar Farroukh / Omar Farroukh · Tariq El Jdide, Beirut, 32 m, anchors 0+3, no-arabic-name
- `street:abdel-rahmane-hout-tariq-el-jdide` Abdel Rahmane Hout / شارع عبد الرحمن الحوت · Tariq El Jdide, Beirut, 920 m, anchors 0+2
- `street:sabra-street-tariq-el-jdide` Sabra Street / شارع صبرا · Tariq El Jdide, Beirut, 461 m, anchors 0+2
- `street:rue-el-khartoum-tariq-el-jdide` Rue El-Khartoum / شارع الخرطوم · Tariq El Jdide, Beirut, 316 m, anchors 0+2, english-name-from-french
- `street:hittine-street-tariq-el-jdide` Hittine Street / شارع حطيّن · Tariq El Jdide, Beirut, 191 m, anchors 0+2
- `street:fuad-arslan-tariq-el-jdide` Fuad Arslan / شارع فؤاد ارسلان · Tariq El Jdide, Beirut, 168 m, anchors 0+2
- `street:kawsar-hallak-tariq-el-jdide` Kawsar Hallak / شارع كوثر حلاق · Tariq El Jdide, Beirut, 94 m, anchors 0+2
- `street:rouass-tariq-el-jdide` Rouass / شارع الرواس · Tariq El Jdide, Beirut, 41 m, anchors 0+2
- `street:rue-de-la-maison-de-l-ingenieur-tariq-el-jdide` Rue de la Maison de l'Ingénieur / شارع بيت المهندس · Tariq El Jdide, Beirut, 30 m, anchors 0+2, english-name-from-french
- `street:abdel-rahmane-labban-tariq-el-jdide` Abdel Rahmane Labban / شارع عبد الرحمن اللبان · Tariq El Jdide, Beirut, 244 m, anchors 0+1
- `street:rue-imrou-el-qais-tariq-el-jdide` Rue Imrou-El-Qais / شارع إمرؤ القيس · Tariq El Jdide, Beirut, 193 m, anchors 0+1, english-name-from-french
- `street:rue-hamam-tariq-el-jdide` Rue Hamam / شارع الحمّام · Tariq El Jdide, Beirut, 158 m, anchors 0+1, english-name-from-french
- `street:ahmed-el-assaad-tariq-el-jdide` Ahmed El-Assaad / شارع أحمد الأسعد · Tariq El Jdide, Beirut, 74 m, anchors 0+1
- `street:rue-ghozaiyel-tariq-el-jdide` Rue Ghozaiyel / Rue Ghozaiyel · Tariq El Jdide, Beirut, 36 m, anchors 0+1, no-arabic-name

</details>

<details><summary><b>Tripoli</b>: 48 streets, radius 800 m</summary>

- `street:sea-road-tripoli` Sea Road / طريق البحر · Tripoli, 9909 m, anchors 0+6
- `street:boulevard-bechara-el-khoury-tripoli` Boulevard Béchara el Khoury / Boulevard Béchara el Khoury · Tripoli, 3223 m, anchors 0+4, no-arabic-name
- `street:mohieddine-makkouk-street-tripoli` Mohieddine Makkouk Street / شارع محي الدين مكوك · Tripoli, 1836 m, anchors 0+4
- `street:rue-cheikh-hasan-khaled-tripoli` Rue Cheikh Hasan Khaled / شارع الشيخ حسن خالد · Tripoli, 1733 m, anchors 0+4
- `street:tripoli-boulevard-tripoli` Tripoli Boulevard / شارع طرابلس · Tripoli, 648 m, anchors 0+4
- `street:rue-achie-el-daya-tripoli` Rue Achie El Daya / شارع عشير الدايه · Tripoli, 3446 m, anchors 0+3, english-name-from-french
- `street:rue-akram-ouayda-tripoli` Rue Akram Ouayda / Rue Akram Ouayda · Tripoli, 896 m, anchors 0+3, no-arabic-name
- `street:marj-el-zuhoor-tripoli` Marj el zuhoor / Marj el zuhoor · Tripoli, 111 m, anchors 0+3, no-arabic-name
- `street:rue-achraf-kabbara-tripoli` Rue Achraf Kabbara / شارع أشرف كبارة · Tripoli, 1633 m, anchors 0+2
- `street:rue-el-biaa-tripoli` Rue El Biaa / Rue El Biaa · Tripoli, 438 m, anchors 0+2, no-arabic-name
- `street:rue-bab-el-ramel-tripoli` Rue Bab el Ramel / Rue Bab el Ramel · Tripoli, 299 m, anchors 0+2, no-arabic-name
- `street:rue-cheikh-sobhi-el-saleh-tripoli` Rue Cheikh Sobhi El Saleh / Rue Cheikh Sobhi El Saleh · Tripoli, 298 m, anchors 0+2, no-arabic-name
- `street:rue-salim-takla-tripoli` Rue Salim Takla / Rue Salim Takla · Tripoli, 296 m, anchors 0+2, no-arabic-name
- `street:rue-el-allamah-moustafa-al-rafii-tripoli` Rue El Allamah Moustafa Al Rafii / Rue El Allamah Moustafa Al Rafii · Tripoli, 295 m, anchors 0+2, no-arabic-name
- `street:al-salam-roundabout-tripoli` Al Salam Roundabout / دوار السلام · Tripoli, 170 m, anchors 0+2
- `street:mitein-street-tripoli` Mitein street / شارع المئتين · Tripoli, 1632 m, anchors 0+1
- `street:tripoli-osm-114315398` شارع فوزي قاوقجي / شارع فوزي قاوقجي · Tripoli, 1396 m, anchors 0+1, no-latin-name
- `street:syria-street-tripoli` Syria Street / شارع سوريا · Tripoli, 995 m, anchors 0+1
- `street:dr-hachem-el-husseini-tripoli` Dr. Hachem El Husseini / Dr. Hachem El Husseini · Tripoli, 662 m, anchors 0+1, no-arabic-name
- `street:rue-cheikh-mohammad-salaheddine-kabbara-tripoli` Rue Cheikh Mohammad Salaheddine Kabbara / Rue Cheikh Mohammad Salaheddine Kabbara · Tripoli, 456 m, anchors 0+1, no-arabic-name
- `street:nazih-mazloum-tripoli` Nazih Mazloum / Nazih Mazloum · Tripoli, 297 m, anchors 0+1, no-arabic-name
- `street:elcheikh-kazem-mikati-street-tripoli` Elcheikh Kazem Mikati Street / شارع الشيخ كاظم الميقاتي · Tripoli, 264 m, anchors 0+1
- `street:place-el-nour-tripoli` Place El Nour / ساحة النور · Tripoli, 154 m, anchors 0+1
- `street:tripoli-osm-74661103` مستديرة المئتين / مستديرة المئتين · Tripoli, 118 m, anchors 0+1, no-latin-name
- `street:riad-el-solh-street-tripoli` Riad El Solh Street / شارع رياض الصلح · Tripoli, 1689 m, anchors 0+0
- `street:aazmi-street-tripoli` Aazmi Street / شارع عزمي · Tripoli, 895 m, anchors 0+0
- `street:rue-rifaiye-tripoli` Rue Rifaiyé / طلعة الرفاعية · Tripoli, 871 m, anchors 0+0
- `street:amin-mokadem-street-tripoli` Amin Mokadem Street / شارع أمين المقدم · Tripoli, 630 m, anchors 0+0
- `street:rue-rafic-fattal-tripoli` Rue Rafic Fattal / شارع رفيق فتال · Tripoli, 566 m, anchors 0+0, english-name-from-french
- `street:hazem-el-jeser-street-tripoli` Hazem El Jeser Street / شارع حازم الجسر · Tripoli, 554 m, anchors 0+0
- `street:tripoli-osm-1017781669` طريق طرابس - الضنية / طريق طرابس - الضنية · Tripoli, 535 m, anchors 0+0, no-latin-name
- `street:saba-zariek-street-tripoli` Saba Zariek Street / شارع سابا زريق · Tripoli, 533 m, anchors 0+0
- `street:tripoli-osm-114315419` شارع الشيخ جميل عدرة / شارع الشيخ جميل عدرة · Tripoli, 531 m, anchors 0+0, no-latin-name
- `street:chafik-karameh-street-tripoli` Chafik Karameh Street / شارع شفيق كرامي · Tripoli, 437 m, anchors 0+0
- `street:tripoli-osm-326187496` شارع عبد الحميد الرفاعي / شارع عبد الحميد الرفاعي · Tripoli, 377 m, anchors 0+0, no-latin-name
- `street:abdel-kader-almollah-street-tripoli` Abdel Kader Almollah Street / شارع عبد القادر المله · Tripoli, 376 m, anchors 0+0
- `street:nadim-el-jisr-street-tripoli` Nadim El Jisr Street / شارع نديم الجسر · Tripoli, 365 m, anchors 0+0
- `street:rue-gibran-khalil-gibran-tripoli` Rue Gibran Khalil Gibran / شارع جبران خليل جبران · Tripoli, 364 m, anchors 0+0, english-name-from-french
- `street:tripoli-osm-114315416` شارع المطران / شارع المطران · Tripoli, 360 m, anchors 0+0, no-latin-name
- `street:taleet-al-kalaa-tripoli` Taleet Al Kalaa / طلعة القلعة · Tripoli, 354 m, anchors 0+0
- `street:tripoli-osm-114315394` شارع الكاردينال السمعاني / شارع الكاردينال السمعاني · Tripoli, 314 m, anchors 0+0, no-latin-name
- `street:tripoli-osm-452314651` شارع عدنان درويش أغا / شارع عدنان درويش أغا · Tripoli, 308 m, anchors 0+0, no-latin-name
- `street:tripoli-osm-114315421` شارع البطريرك إلياس الحويك / شارع البطريرك إلياس الحويك · Tripoli, 305 m, anchors 0+0, no-latin-name
- `street:tripoli-osm-114315400` شارع فؤاد المنلا / شارع فؤاد المنلا · Tripoli, 298 m, anchors 0+0, no-latin-name
- `street:tripoli-osm-114315408` شارع سعدي المنلا / شارع سعدي المنلا · Tripoli, 260 m, anchors 0+0, no-latin-name
- `street:omar-ben-abdel-aziz-street-tripoli` Omar Ben Abdel Aziz Street / شارع عمر بن عبد العزيز · Tripoli, 236 m, anchors 0+0
- `street:wadi-heb-tripoli` Wadi Heb / Wadi Heb · Tripoli, 154 m, anchors 0+0, no-arabic-name
- `street:nour-qasr-karameh-tripoli` Nour-Qasr Karameh / Nour-Qasr Karameh · Tripoli, 147 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Tyre</b>: 10 streets, radius 800 m</summary>

- `street:rue-abou-dib-tyre` Rue Abou Dib / شارع أبو ديب · Tyre, 937 m, anchors 0+1, english-name-from-french
- `street:rue-hafez-el-assad-tyre` Rue Hafez el-Assad / شارع حافظ الأسد · Tyre, 786 m, anchors 0+1
- `street:rue-hyram-tyre` Rue Hyram / شارع حيرام · Tyre, 595 m, anchors 0+1, english-name-from-french
- `street:el-kouds-tyre` El Kouds / El Kouds · Tyre, 447 m, anchors 0+1, no-arabic-name
- `street:el-kouks-tyre` el kouks / el kouks · Tyre, 376 m, anchors 0+1, no-arabic-name
- `street:rue-mohamad-al-zayat-tyre` Rue Mohamad Al Zayat / Rue Mohamad Al Zayat · Tyre, 339 m, anchors 0+1, no-arabic-name
- `street:senegal-street-tyre` Senegal Street / شارع السنغال · Tyre, 277 m, anchors 0+1
- `street:rue-de-dotations-tyre` Rue de Dotations / شارع الأوقاف · Tyre, 187 m, anchors 0+1
- `street:sea-road-tyre` Sea Road / طريق البحر · Tyre, 1553 m, anchors 0+0
- `street:dr-ali-al-khalil-tyre` dr ali al khalil / dr ali al khalil · Tyre, 190 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Verdun</b>: 67 streets, radius 400 m</summary>

- `street:ibn-rushd-street-verdun` Ibn Rushd Street / شارع ابن رشد · Verdun, Beirut, 533 m, anchors 1+3
- `street:rue-itani-beirut` Rue Itani / شارع العيتاني · Beirut, 336 m, anchors 2+2
- `street:abdallah-machnouk-beirut` Abdallah Machnouk / شارع عبد الله المشنوق · Beirut, 1416 m, anchors 1+2
- `street:rachid-karame-street-verdun` Rachid Karame Street / شارع رشيد كرامة · Verdun, Beirut, 732 m, anchors 1+2
- `street:mazraa-street-verdun` Mazraa Street / شارع المزرعة · Verdun, Beirut, 621 m, anchors 1+2
- `street:bechir-qassar-verdun` Béchir Qassar / شارع بشير القصار · Verdun, Beirut, 546 m, anchors 1+2
- `street:tamer-mallat-verdun` Tamer Mallat / شارع تامر ملاط · Verdun, Beirut, 530 m, anchors 1+2
- `street:amine-takieddine-verdun` Amine Takieddine / شارع أمين تقي الدين · Verdun, Beirut, 484 m, anchors 1+2
- `street:taki-eddine-el-solh-verdun` Taki Eddine El-Solh / شارع تقي الدين الصلح · Verdun, Beirut, 473 m, anchors 1+2
- `street:beni-maarouf-verdun` Beni Maarouf / شارع بني معروف · Verdun, Beirut, 409 m, anchors 1+2
- `street:rue-rida-el-solh-verdun` Rue Rida El-Solh / شارع رضا الصلح · Verdun, Beirut, 320 m, anchors 1+2
- `street:riad-taha-verdun` Riad Taha / شارع رياض طه · Verdun, Beirut, 315 m, anchors 1+2
- `street:rue-abi-tammam-verdun` Rue Abi Tammam / شارع أبي تمام · Verdun, Beirut, 260 m, anchors 1+2
- `street:rue-sobhi-mahmasani-verdun` Rue Sobhi Mahmasani / شارع 59 · Verdun, Beirut, 258 m, anchors 1+2, english-name-from-french
- `street:leonard-de-vinci-street-verdun` Léonard de Vinci street / شارع ليوناردو دافنشي · Verdun, Beirut, 254 m, anchors 1+2
- `street:vienne-verdun` Vienne / شارع فينا · Verdun, Beirut, 234 m, anchors 1+2
- `street:magistrat-youssef-najjar-verdun` Magistrat Youssef Najjar / شارع القاضي يوسف النجار · Verdun, Beirut, 222 m, anchors 1+2
- `street:rue-louis-massignon-beirut` Rue Louis Massignon / شارع لويس ماسينون · Beirut, 218 m, anchors 1+2
- `street:habib-srour-verdun` Habib Srour / شارع حبيب سرور · Verdun, Beirut, 207 m, anchors 1+2
- `street:abdel-basset-fakhoury-verdun` Abdel Basset Fakhoury / شارع عبد الباسط الفاخوري · Verdun, Beirut, 207 m, anchors 1+2
- `street:chili-verdun` Chili / شارع شيلي · Verdun, Beirut, 182 m, anchors 1+2
- `street:rue-ain-el-bayda-verdun` Rue Ain El-Bayda' / شارع 59 · Verdun, Beirut, 177 m, anchors 1+2, english-name-from-french
- `street:al-azhar-verdun` Al-Azhar / شارع الأزهر · Verdun, Beirut, 176 m, anchors 1+2
- `street:youssef-el-zein-verdun` Youssef El Zein / شارع يوسف الزين · Verdun, Beirut, 167 m, anchors 1+2
- `street:manfalouti-verdun` Manfalouti / شارع المنفلوطي · Verdun, Beirut, 166 m, anchors 1+2
- `street:tabet-verdun` Tabet / شارع تابت · Verdun, Beirut, 164 m, anchors 1+2
- `street:imam-abi-hanife-verdun` Imam Abi Hanifé / شارع الإمام أبي حنيفة · Verdun, Beirut, 162 m, anchors 1+2
- `street:sofar-verdun` Sofar / شارع صوفر · Verdun, Beirut, 157 m, anchors 1+2
- `street:rue-aicha-bakkar-verdun` Rue Aicha Bakkar / شارع عائشة بكار · Verdun, Beirut, 133 m, anchors 1+2
- `street:mozart-verdun` Mozart / شارع موزار · Verdun, Beirut, 122 m, anchors 1+2
- `street:taha-el-wali-verdun` Taha El-Wali / شارع طه الوالي · Verdun, Beirut, 118 m, anchors 1+2
- `street:hachem-el-charif-verdun` Hachem El-Charif / شارع هاشم الشريف · Verdun, Beirut, 97 m, anchors 1+2
- `street:saeb-salam-boulevard-verdun` Saëb Salam Boulevard / جادة صائب سلام · Verdun, Beirut, 2143 m, anchors 1+1
- `street:el-rachidine-verdun` El Rachidine / شارع الراشدين · Verdun, Beirut, 932 m, anchors 1+1
- `street:mufti-cheikh-mhd-toufic-khaled-verdun` Mufti Cheikh Mhd Toufic Khaled / شارع المفتي الشيخ محمد توفيق خالد · Verdun, Beirut, 884 m, anchors 1+1
- `street:georges-zouein-beirut` Georges Zouein / شارع جورج زوين · Beirut, 508 m, anchors 1+1
- `street:unesco-street-verdun` Unesco Street / شارع الأونيسكو · Verdun, Beirut, 466 m, anchors 1+1
- `street:berlin-verdun` Berlin / شارع برلين · Verdun, Beirut, 396 m, anchors 1+1
- `street:hassan-kamal-al-sabah-verdun` Hassan Kamal Al Sabah / شارع حسن كامل الصباح · Verdun, Beirut, 364 m, anchors 1+1
- `street:hussein-oueni-verdun` Hussein Ouéni / شارع حسين العويني · Verdun, Beirut, 341 m, anchors 1+1
- `street:rafic-naja-verdun` Rafic Naja / شارع رفيق نجا · Verdun, Beirut, 338 m, anchors 1+1
- `street:rue-knio-verdun` Rue Knio / شارع كنيعو · Verdun, Beirut, 328 m, anchors 1+1
- `street:anis-nsouli-verdun` Anis Nsouli / شارع أنيس النصولي · Verdun, Beirut, 318 m, anchors 1+1
- `street:mouhieddine-nsouli-verdun` Mouhieddine Nsouli / شارع محي الدين النصولي · Verdun, Beirut, 306 m, anchors 1+1
- `street:cleopatre-beirut` Cléopatre / شارع كليوبترا · Beirut, 303 m, anchors 1+1
- `street:najla-kfoury-verdun` Najla Kfoury / شارع نجلا كفوري · Verdun, Beirut, 283 m, anchors 1+1
- `street:cheikh-abdallah-el-sabah-verdun` Cheikh Abdallah El-Sabah / شارع الشيخ عبد الله الصباح · Verdun, Beirut, 282 m, anchors 1+1
- `street:ulpien-verdun` Ulpien / شارع أولبيانوس · Verdun, Beirut, 241 m, anchors 1+1
- `street:el-riad-verdun` El-Riad / شارع الرياض · Verdun, Beirut, 188 m, anchors 1+1
- `street:rue-said-freiha-verdun` Rue Saïd Freiha / شارع سعيد فريحة · Verdun, Beirut, 146 m, anchors 1+1
- `street:rue-mohamed-iqbal-verdun` Rue Mohamed Iqbal / شارع محمد إقبال · Verdun, Beirut, 131 m, anchors 1+1
- `street:sameh-fakhoury-verdun` Sameh Fakhoury / شارع سامح فاخوري · Verdun, Beirut, 109 m, anchors 1+1
- `street:abi-nouwass-verdun` Abi-Nouwass / شارع أبي نواس · Verdun, Beirut, 97 m, anchors 1+1
- `street:ouadi-el-aarayech-verdun` Ouadi El-Aarayech / شارع وادي العرايش · Verdun, Beirut, 97 m, anchors 1+1
- `street:rue-hassana-el-daouk-verdun` Rue Hassana El Daouk / شارع حسانة الداعوق · Verdun, Beirut, 94 m, anchors 1+1
- `street:rue-jammal-verdun` Rue Jammal / شارع الجمال · Verdun, Beirut, 83 m, anchors 1+1
- `street:place-rachid-el-solh-verdun` Place Rachid El Solh / Place Rachid El Solh · Verdun, Beirut, 82 m, anchors 1+1, no-arabic-name
- `street:amir-alzaani-verdun` Amir Alzaani / شارع عمر الزعني · Verdun, Beirut, 60 m, anchors 1+1
- `street:rue-majzoub-verdun` Rue Majzoub / شارع المجذوب · Verdun, Beirut, 56 m, anchors 1+1
- `street:cheikh-sabah-al-salem-al-sabah-verdun` Cheikh Sabah Al-Salem Al-Sabah / شارع الشيخ صباح السالم الصباح · Verdun, Beirut, 46 m, anchors 1+1
- `street:avenue-rafic-hariri-verdun` Avenue Rafic Hariri / جادة رفيق الحريري · Verdun, Beirut, 609 m, anchors 1+0
- `street:sanieh-habboub-verdun` Sanieh Habboub / شارع سنية حبوب · Verdun, Beirut, 312 m, anchors 1+0
- `street:beethoven-verdun` Beethoven / شارع بتهوفن · Verdun, Beirut, 277 m, anchors 1+0
- `street:thomas-edison-verdun` Thomas Edison / شارع توماس أديسون · Verdun, Beirut, 219 m, anchors 1+0
- `street:abdallah-el-rassi-verdun` Abdallah El Rassi / Abdallah El Rassi · Verdun, Beirut, 159 m, anchors 1+0, no-arabic-name
- `street:iskandar-ammoun-verdun` Iskandar Ammoun / شارع إسكندر عمون · Verdun, Beirut, 139 m, anchors 1+0
- `street:place-mufti-cheikh-mhd-toufic-khaled-verdun` Place Mufti Cheikh Mhd Toufic Khaled / Place Mufti Cheikh Mhd Toufic Khaled · Verdun, Beirut, 113 m, anchors 1+0, no-arabic-name

</details>

<details><summary><b>Zahle</b>: 23 streets, radius 800 m</summary>

- `street:rue-principale-de-maalaka-zahle` Rue Principale de Maalaka / Rue Principale de Maalaka · Zahle, 1444 m, anchors 0+1, no-arabic-name
- `street:tarik-e-farrin-zahle` Tarik E'farrin / Tarik E'farrin · Zahle, 404 m, anchors 0+1, no-arabic-name
- `street:boulevard-zahle-zahle` Boulevard Zahlé / Boulevard Zahlé · Zahle, 4568 m, anchors 0+0, no-arabic-name
- `street:rue-serenity-zahle` rue Serenity / rue Serenity · Zahle, 1369 m, anchors 0+0, no-arabic-name
- `street:rue-haouch-el-oumara-zahle` Rue Haouch El Oumara / Rue Haouch El Oumara · Zahle, 1136 m, anchors 0+0, no-arabic-name
- `street:said-road-zahle` Said Road / Said Road · Zahle, 869 m, anchors 0+0, no-arabic-name
- `street:rue-haoch-el-zaraane-zahle` Rue Haoch El Zaraané / Rue Haoch El Zaraané · Zahle, 809 m, anchors 0+0, no-arabic-name
- `street:tarik-ksara-zahle` Tarik Ksara / Tarik Ksara · Zahle, 747 m, anchors 0+0, no-arabic-name
- `street:rue-souk-el-khodra-zahle` Rue Souk El Khodra / شارع سوق الخضرة · Zahle, 554 m, anchors 0+0, english-name-from-french
- `street:tilal-road-zahle` Tilal Road / Tilal Road · Zahle, 391 m, anchors 0+0, no-arabic-name
- `street:rue-taleet-el-maalaka-zahle` Rue Taleet El Maalaka / Rue Taleet El Maalaka · Zahle, 283 m, anchors 0+0, no-arabic-name
- `street:zahle-osm-704735755` طلعة الحمّار / طلعة الحمّار · Zahle, 279 m, anchors 0+0, no-latin-name
- `street:rajaa-h-road-zahle` Rajaa H. Road / Rajaa H. Road · Zahle, 221 m, anchors 0+0, no-arabic-name
- `street:rue-de-jesus-zahle` Rue De Jesus / Rue De Jesus · Zahle, 211 m, anchors 0+0, no-arabic-name
- `street:sahet-el-sahel-zahle` Sahet El Sahel / Sahet El Sahel · Zahle, 194 m, anchors 0+0, no-arabic-name
- `street:norair-road-zahle` Norair Road / Norair Road · Zahle, 189 m, anchors 0+0, no-arabic-name
- `street:rue-talet-al-central-zahle` Rue Talet Al Central / Rue Talet Al Central · Zahle, 175 m, anchors 0+0, no-arabic-name
- `street:talet-el-saraya-zahle` Talet El Saraya / Talet El Saraya · Zahle, 155 m, anchors 0+0, no-arabic-name
- `street:taleet-mar-nkoula-zahle` Taleet Mar Nkoula / Taleet Mar Nkoula · Zahle, 142 m, anchors 0+0, no-arabic-name
- `street:rue-talet-joseph-skaf-zahle` Rue Talet Joseph Skaf / Rue Talet Joseph Skaf · Zahle, 132 m, anchors 0+0, no-arabic-name
- `street:tarik-ain-el-ghsain-zahle` Tarik Ain El Ghsain / Tarik Ain El Ghsain · Zahle, 126 m, anchors 0+0, no-arabic-name
- `street:sahet-el-maalaka-zahle` Sahet El Maalaka / Sahet El Maalaka · Zahle, 100 m, anchors 0+0, no-arabic-name
- `street:zahle-dhor-el-shweyr-zahle` Zahle - Dhor El Shweyr / Zahle - Dhor El Shweyr · Zahle, 52 m, anchors 0+0, no-arabic-name

</details>

<details><summary><b>Zouk Mosbeh</b>: 5 streets, radius 800 m</summary>

- `street:aintoura-ain-el-rihaneh-road-zouk-mosbeh` Aintoura-Ain El Rihaneh Road / Aintoura-Ain El Rihaneh Road · Zouk Mosbeh, 976 m, anchors 0+1, no-arabic-name
- `street:louaize-roundabout-zouk-mosbeh` Louaizé Roundabout / Louaizé Roundabout · Zouk Mosbeh, 155 m, anchors 0+1, no-arabic-name
- `street:zouk-mosbeh-antoura-road-zouk-mosbeh` Zouk Mosbeh Antoura Road / طريق ذوق مصبح – عينطورة · Zouk Mosbeh, 97 m, anchors 0+1
- `street:sea-road-zouk-mosbeh` Sea Road / طريق البحر · Zouk Mosbeh, 1323 m, anchors 0+0
- `street:route-saint-antonios-zouk-mosbeh` Route Saint-Antonios / Route Saint-Antonios · Zouk Mosbeh, 535 m, anchors 0+0, no-arabic-name

</details>
