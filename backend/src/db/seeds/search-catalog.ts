import { AREA_COORDINATES } from '../../constants/areaCoordinates.js';
import { AREA_ALIASES } from './search-area-aliases.js';
import type { LebanonArea } from '../../constants/lebanonAreas.js';

/** Existing stored area keys remain untouched. These are browse relationships, not polygons. */
const rows: [LebanonArea, string, string, string, string][] = [
  ['Achrafieh','الأشرفية','Beirut','Beirut','بيروت'],
  ['Mar Mikhael','مار مخايل','Beirut','Beirut','بيروت'],
  ['Gemmayzeh','الجميزة','Beirut','Beirut','بيروت'],
  ['Hamra','الحمرا','Beirut','Beirut','بيروت'],
  ['Ras Beirut','رأس بيروت','Beirut','Beirut','بيروت'],
  ['Verdun','فردان','Beirut','Beirut','بيروت'],
  ['Jnah','الجناح','Beirut','Beirut','بيروت'],
  ['Badaro','بدارو','Beirut','Beirut','بيروت'],
  ['Furn El Chebbak','فرن الشباك','Furn El Chebbak','Baabda','بعبدا'],
  ['Tariq El Jdide','طريق الجديدة','Beirut','Beirut','بيروت'],
  ['Broummana','برمانا','Broummana','Matn','المتن'],
  ['Dbayeh','ضبية','Dbayeh','Matn','المتن'],
  ['Antelias','أنطلياس','Antelias','Matn','المتن'],
  ['Fanar','الفنار','Fanar','Matn','المتن'],
  ['Dekwaneh','الدكوانة','Dekwaneh','Matn','المتن'],
  ['Jounieh','جونية','Jounieh','Keserwan','كسروان'],
  ['Kaslik','الكسليك','Jounieh','Keserwan','كسروان'],
  ['Zouk Mosbeh','ذوق مصبح','Zouk Mosbeh','Keserwan','كسروان'],
  ['Byblos','جبيل','Byblos','Jbeil','جبيل'],
  ['Aley','عاليه','Aley','Aley','عاليه'],
  ['Bhamdoun','بحمدون','Bhamdoun','Aley','عاليه'],
  ['Tripoli','طرابلس','Tripoli','Tripoli','طرابلس'],
  ['Saida','صيدا','Saida','Sidon','صيدا'],
  ['Tyre','صور','Tyre','Tyre','صور'],
  ['Nabatieh','النبطية','Nabatieh','Nabatieh','النبطية'],
  ['Zahle','زحلة','Zahle','Zahle','زحلة'],
  ['Baalbek','بعلبك','Baalbek','Baalbek','بعلبك'],
];

export const locationSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export type SearchLocationSeed = {
  id: string; kind: 'city' | 'area'; slug: string; nameEn: string; nameAr: string;
  districtEn: string; districtAr: string; parentCityId: string | null;
  canonicalArea: string | null; lat: number | null; lng: number | null; aliases: readonly string[];
};

const extraAliases: Partial<Record<LebanonArea, readonly string[]>> = {
  Achrafieh: ['Achrafieh','Ashrafiyeh','Ashrafiye','Achrafiye','Achrafié','2ashrafiye','2ashrafieh','اشرفية','أشرفية'],
  Hamra: ['7amra','el7amra','al7amra','El Hamra','حمرا'],
  Fanar: ['Fanâr','Fânar','Fanar','فنار'],
  Dekwaneh: ['Dekouaneh','Dekouané','Dekwane','Dekwaneh','Dekouane','Dekwene','دكوانه'],
  'Ras Beirut': ['Ras Bayrout','Ras Beyrouth','راس بيروت'],
  Zahle: ['Zahlé','Zahlè'],
  'Zouk Mosbeh': ['Zuq Mosbeh','Zouk Mousbeh','زوق مصبح'],
  'Tariq El Jdide': ['Tari2 El Jdide','Tari2 Jdide'],
};

export const searchAreaSeeds: SearchLocationSeed[] = rows.map(([nameEn,nameAr,city,districtEn,districtAr]) => ({
  id: `area:${locationSlug(nameEn)}`, kind: 'area', slug: locationSlug(nameEn), nameEn,nameAr,districtEn,districtAr,
  parentCityId: `city:${locationSlug(city)}`, canonicalArea: nameEn,
  ...AREA_COORDINATES[nameEn], aliases: [...(AREA_ALIASES[nameEn] ?? []), ...(extraAliases[nameEn] ?? [])],
}));

const cityNames = [...new Set(rows.map(row => row[2]))];
export const searchCitySeeds: SearchLocationSeed[] = cityNames.map(nameEn => {
  const own = searchAreaSeeds.find(area => area.nameEn === nameEn);
  const child = rows.find(row => row[2] === nameEn)!;
  return {
    id: `city:${locationSlug(nameEn)}`, kind: 'city', slug: locationSlug(nameEn), nameEn,
    nameAr: nameEn === 'Beirut' ? 'بيروت' : own!.nameAr,
    districtEn: child[3], districtAr: child[4], parentCityId: null, canonicalArea: null,
    lat: own?.lat ?? null, lng: own?.lng ?? null,
    aliases: nameEn === 'Beirut' ? ['Beyrouth','Bayrut','Bayrout','Beirout','بيروت'] : own!.aliases,
  };
});

export const searchLocationSeeds = [...searchCitySeeds, ...searchAreaSeeds];

/** Curated display translations; no machine translation or new campus identities. */
export const institutionNamesAr: Record<string,string> = {
  aub:'الجامعة الأمريكية في بيروت', lau:'الجامعة اللبنانية الأمريكية', usj:'جامعة القديس يوسف في بيروت',
  ndu:'جامعة سيدة اللويزة', ua:'الجامعة الأنطونية', usek:'جامعة الروح القدس الكسليك',
  bau:'جامعة بيروت العربية', uob:'جامعة البلمند', liu:'الجامعة اللبنانية الدولية', uls:'جامعة الحكمة',
  meu:'جامعة الشرق الأوسط', haigazian:'جامعة هايكازيان', iul:'الجامعة الإسلامية في لبنان',
  biu:'جامعة بيروت الإسلامية', makassed:'جامعة المقاصد في بيروت', jinan:'جامعة الجنان', global:'الجامعة العالمية',
  aou:'الجامعة العربية المفتوحة', 'city-university':'جامعة المدينة', rhu:'جامعة رفيق الحريري',
  aust:'الجامعة الأمريكية للعلوم والتكنولوجيا', aut:'الجامعة الأمريكية للتكنولوجيا',
  aul:'جامعة الآداب والعلوم والتكنولوجيا في لبنان', mubs:'الجامعة الحديثة للإدارة والعلوم',
  lcu:'الجامعة اللبنانية الكندية', lgu:'الجامعة اللبنانية الألمانية', ulf:'الجامعة اللبنانية الفرنسية',
  aku:'جامعة الكفاءات', hfu:'جامعة العائلة المقدسة', ut:'جامعة طرابلس',
  auce:'الجامعة الأمريكية للثقافة والتعليم', usal:'جامعة العلوم والآداب اللبنانية',
  phoenicia:'جامعة فينيسيا', maaref:'جامعة المعارف', azm:'جامعة العزم', iub:'الجامعة الدولية',
};

export const campusNamesAr: Record<string,string> = {
  aub:'حرم رأس بيروت', 'lau-beirut':'حرم بيروت', 'lau-jbeil':'حرم جبيل',
  'usj-csm':'حرم العلوم الطبية', 'usj-huvelin':'حرم فرنسوا دبانه للعلوم الاجتماعية',
  'usj-cst':'حرم العلوم والتكنولوجيا', 'usj-csh':'حرم العلوم الإنسانية',
  'usj-cis':'حرم الابتكار والرياضة', 'usj-corm':'حرم شارل قرم',
  'usj-cln':'حرم لبنان الشمالي', 'usj-cls':'حرم لبنان الجنوبي', 'usj-czb':'حرم زحلة والبقاع',
  'ndu-louaize':'الحرم الرئيسي في ذوق مصبح', 'ndu-nlc':'حرم لبنان الشمالي', 'ndu-shouf':'حرم الشوف',
  'ua-hadat-baabda':'الحرم الرئيسي في الحدت وبعبدا', 'ua-nabi-ayla':'حرم النبي أيلا وزحلة', 'ua-mejdlaya':'حرم مجدليا وزغرتا',
  'usek-kaslik':'حرم الكسليك', 'usek-zahle':'حرم زحلة', 'usek-chekka':'حرم شكا', 'usek-rmeich':'حرم رميش',
  'bau-beirut':'حرم بيروت', 'bau-debbieh':'حرم الدبية', 'bau-tripoli':'حرم طرابلس', 'bau-bekaa':'حرم البقاع',
  balamand:'حرم الكورة', 'uob-dekouaneh':'حرم الدكوانة', 'uob-beino':'حرم بينو وعكار',
  'uob-souk-el-gharb':'حرم سوق الغرب', 'uob-achrafieh':'حرم الأشرفية',
  'liu-beirut':'حرم بيروت', 'liu-bekaa':'حرم البقاع', 'liu-saida':'حرم صيدا', 'liu-nabatieh':'حرم النبطية',
  'liu-tripoli':'حرم طرابلس', 'liu-mount-lebanon':'حرم جبل لبنان', 'liu-tyre':'حرم صور',
  'liu-rayak':'حرم رياق', 'liu-halba':'حرم حلبا وعكار',
  'uls-furn':'حرم فرن الشباك', 'uls-achrafieh':'حرم الأشرفية', 'meu-sabtieh':'حرم السبتية',
  'haigazian-kantari':'حرم القنطاري', 'iul-khalde':'حرم خلدة', 'iul-wardanieh':'حرم الوردانية',
  'iul-tyre':'حرم صور', 'iul-baalbek':'حرم بعلبك', 'iul-bourj':'حرم برج البراجنة', 'iul-sohmor':'حرم سحمر',
  'biu-beirut':'حرم بيروت', 'makassed-beirut':'حرم بيروت', 'jinan-tripoli':'حرم طرابلس', 'jinan-saida':'حرم صيدا',
  'global-beirut':'حرم البطريركية', 'global-doha':'حرم الدوحة', 'aou-beirut':'حرم بيروت',
  'aou-antelias':'حرم أنطلياس', 'aou-tripoli':'حرم طرابلس', 'cityu-tripoli':'حرم طرابلس', 'cityu-tyre':'حرم صور',
  'rhu-mechref':'حرم المشرف', 'aust-ashrafieh':'حرم بيروت', 'aust-zahle':'حرم زحلة',
  'aust-sidon':'حرم صيدا', 'aust-bhamdoun':'حرم بحمدون', 'aut-halat':'حرم حالات',
  'aut-north':'حرم الشمال', 'aut-akkar':'حرم عكار', 'aul-beirut':'حرم بيروت', 'aul-jounieh':'حرم جونية',
  'aul-dekwaneh':'حرم الدكوانة', 'aul-chtaura':'حرم شتورا', 'aul-tripoli':'حرم طرابلس', 'aul-jadra':'حرم جدرا',
  'mubs-damour':'حرم الدامور', 'mubs-beirut':'حرم بيروت', 'mubs-aley':'حرم عاليه',
  'mubs-semqanieh':'حرم السمقانية', 'mubs-rashaya':'حرم راشيا', 'mubs-jal-el-dib':'حرم جل الديب',
  'lcu-aintoura':'حرم عينطورة', 'lcu-hadat':'حرم الحدت', 'lgu-sahel-alma':'حرم ساحل علما',
  'ulf-deddeh':'حرم دده', 'ulf-tripoli':'حرم طرابلس', 'ulf-beirut':'حرم بيروت',
  'aku-ain-saadeh':'حرم عين سعادة', 'hfu-batroun':'حرم البترون', 'ut-tripoli':'حرم طرابلس',
  'auce-beirut':'حرم بيروت', 'auce-koura':'حرم الكورة', 'auce-baouchrieh':'حرم البوشرية',
  'auce-tyre':'حرم صور', 'auce-nabatiyeh':'حرم النبطية', 'usal-beirut':'حرم بيروت',
  'pu-dist':'حرم الداودية', 'maaref-beirut':'حرم بيروت', 'azm-tripoli':'حرم طرابلس',
  'iub-beirut':'حرم سن الفيل', 'iub-akkar':'حرم عكار',
};

export const institutionExtraAliases: Record<string, readonly string[]> = {
  aub: ['A.U.B.','اي يو بي','إيه يو بي'], lau: ['L.A.U.','ال اي يو','إل إيه يو'],
  usj: ['U.S.J.','يو اس جي','Saint Joseph','Saint-Joseph','Saint Joseph University','Universite Saint Joseph'],
};

/** Targeted spelling correction: preserve public slug/UUID and previous search labels. */
export const campusDisplayCorrections: Record<string, { name: string; city: string; aliases: readonly string[] }> = {
  'uob-dekouaneh': {
    name: 'Dekwaneh Campus', city: 'Dekwaneh',
    aliases: ['Dekouaneh', 'Dekouaneh Campus', 'UOB Dekouaneh', 'UOB — Dekouaneh Campus',
      'University of Balamand Dekouaneh Campus'],
  },
};
