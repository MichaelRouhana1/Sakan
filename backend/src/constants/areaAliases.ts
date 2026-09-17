import type { LebanonArea } from "./lebanonAreas.js";

/**
 * Suggestion-only alt spellings / Arabic for canonical LEBANON_AREAS labels.
 * Backend search suggestions are the source of truth. Frontend catalog
 * (`lebanonZones.ts`) stays canonical English for pickers and filter chips.
 * Do not add aliases that are not in LEBANON_AREAS.
 */
export const AREA_ALIASES: Partial<Record<LebanonArea, readonly string[]>> = {
  Achrafieh: ["Ashrafieh", "Achrafie", "Al Ashrafieh", "الأشرفية", "الاشرفية"],
  "Mar Mikhael": ["Mar Mikhayel", "Mar Michael", "مار مخايل"],
  Gemmayzeh: ["Gemmayze", "Gemayzeh", "Gemayze", "الجميزة", "الجمّيزة"],
  Hamra: ["Al Hamra", "الحمرا", "الحمراء"],
  "Ras Beirut": ["Ras Beyrouth", "رأس بيروت"],
  Verdun: ["فردان"],
  Jnah: ["Jnahh", "Al Jnah", "الجناح"],
  Badaro: ["بدارو"],
  "Furn El Chebbak": [
    "Furn el Chebbak",
    "Furn El Chebak",
    "Furn Chebbak",
    "Furn al Chebbak",
    "فرن الشباك",
  ],
  "Tariq El Jdide": [
    "Tariq el Jdideh",
    "Tariq El Jadideh",
    "Tariq El Jdideh",
    "Tariq Jdideh",
    "طريق الجديدة",
  ],
  Broummana: ["Broumane", "برمانا"],
  Dbayeh: ["Dbaiye", "Dhayeh", "ضبية", "الضبية"],
  Antelias: ["انطلياس", "أنطلياس"],
  Fanar: ["El Fanar", "الفنار"],
  Dekwaneh: ["Dekwane", "الدكوانة", "دكوانة"],
  Jounieh: ["Jounie", "جونيه", "جونية"],
  Kaslik: ["الكسليك"],
  "Zouk Mosbeh": ["ذوق مصبح"],
  Byblos: ["Jbeil", "Jbail", "جبيل"],
  Aley: ["عاليه"],
  Bhamdoun: ["بحمدون"],
  Tripoli: ["Trablous", "طرابلس"],
  Saida: ["Sidon", "صيدا"],
  Tyre: ["Sour", "صور"],
  Nabatieh: ["Nabatiyeh", "النبطية", "نبطية"],
  Zahle: ["Zahleh", "زحلة"],
  Baalbek: ["Baalbeck", "بعلبك"],
};
