/**
 * Faculties / schools for every private institution in `institutionSeeds`.
 * Names follow official faculty lists (or Erasmus+ HEI guide 2022 when a
 * current English list was not published). No tuition — attach rates later.
 */

export type FacultyNameSeed = { name: string; slug: string };

export const FACULTY_CATALOG: Record<string, FacultyNameSeed[]> = {
  aub: [
    { name: "Faculty of Arts and Sciences", slug: "fas" },
    { name: "Faculty of Agricultural and Food Sciences", slug: "fafs" },
    {
      name: "Maroun Semaan Faculty of Engineering and Architecture",
      slug: "msfea",
    },
    { name: "Faculty of Health Sciences", slug: "fhs" },
    { name: "Suliman S. Olayan School of Business", slug: "osb" },
    { name: "Rafic Hariri School of Nursing", slug: "hson" },
    { name: "Faculty of Medicine", slug: "fm" },
  ],
  lau: [
    { name: "School of Architecture & Design", slug: "architecture-design" },
    { name: "School of Arts & Sciences", slug: "arts-sciences" },
    { name: "Adnan Kassar School of Business", slug: "business" },
    { name: "School of Engineering", slug: "engineering" },
    { name: "School of Pharmacy", slug: "pharmacy" },
    {
      name: "Gilbert and Rose-Marie Chagoury School of Medicine",
      slug: "medicine",
    },
    {
      name: "Alice Ramez Chaghoury School of Nursing",
      slug: "nursing",
    },
  ],
  usj: [
    { name: "Faculty of Medicine", slug: "fm" },
    { name: "Faculty of Dental Medicine", slug: "fmd" },
    { name: "Faculty of Pharmacy", slug: "fp" },
    { name: "Faculty of Nursing Science", slug: "fsi" },
    { name: "Faculty of Engineering and Architecture (ESIB)", slug: "esib" },
    { name: "Faculty of Science", slug: "fs" },
    { name: "Faculty of Law and Political Science", slug: "fdsp" },
    { name: "Faculty of Economics", slug: "fse" },
    { name: "USJ Business School", slug: "fgm" },
    { name: "Faculty of Humanities Ramez G. Chagoury", slug: "flsh" },
    { name: "Faculty of Education", slug: "fsedu" },
    { name: "Faculty of Languages and Translation", slug: "fdlt" },
    { name: "Faculty of Religious Studies", slug: "fsr" },
    { name: "IESAV — Audiovisual", slug: "iesav" },
  ],
  ndu: [
    {
      name: "Ramez G. Chagoury Faculty of Architecture, Arts and Design",
      slug: "architecture-arts-design",
    },
    {
      name: "Faculty of Business Administration and Economics",
      slug: "business",
    },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Humanities", slug: "humanities" },
    { name: "Faculty of Law and Political Science", slug: "law-political" },
    { name: "Faculty of Natural and Applied Sciences", slug: "natural-sciences" },
    { name: "Faculty of Nursing and Health Sciences", slug: "nursing-health" },
  ],
  ua: [
    { name: "Faculty of Engineering and Technology", slug: "engineering" },
    { name: "Antonine School of Business", slug: "business" },
    { name: "Faculty of Public Health", slug: "public-health" },
    { name: "Faculty of Information and Communication", slug: "info-comm" },
    { name: "Faculty of Sport Sciences", slug: "sport" },
    { name: "Faculty of Music and Musicology", slug: "music" },
    { name: "Faculty of Theology", slug: "theology" },
  ],
  usek: [
    { name: "Business School", slug: "business" },
    { name: "Faculty of Arts and Sciences", slug: "arts-sciences" },
    { name: "School of Architecture and Design", slug: "architecture-design" },
    { name: "School of Engineering", slug: "engineering" },
    { name: "School of Law and Political Sciences", slug: "law-political" },
    { name: "School of Medicine and Medical Sciences", slug: "medicine" },
    { name: "School of Music and Performing Arts", slug: "music" },
    { name: "Pontifical School of Theology", slug: "theology" },
    { name: "Higher Institute of Nursing Sciences", slug: "nursing" },
  ],
  bau: [
    { name: "Faculty of Human Sciences", slug: "human-sciences" },
    { name: "Faculty of Law and Political Science", slug: "law-political" },
    { name: "Faculty of Business Administration", slug: "business" },
    {
      name: "Faculty of Architecture — Design and Built Environment",
      slug: "architecture",
    },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Science", slug: "science" },
    { name: "Faculty of Pharmacy", slug: "pharmacy" },
    { name: "Faculty of Medicine", slug: "medicine" },
    { name: "Faculty of Dentistry", slug: "dentistry" },
    { name: "Faculty of Health Sciences", slug: "health" },
  ],
  uob: [
    { name: "Académie libanaise des beaux-arts", slug: "alba" },
    {
      name: "Saint John of Damascus Institute of Theology",
      slug: "theology",
    },
    { name: "Faculty of Arts and Sciences", slug: "arts-sciences" },
    { name: "Faculty of Business and Management", slug: "business" },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Health Sciences", slug: "health" },
    { name: "Faculty of Medicine and Medical Sciences", slug: "medicine" },
    {
      name: "Issam M. Fares Faculty of Technology",
      slug: "technology",
    },
    {
      name: "Faculty of Postgraduate Medical Education",
      slug: "postgraduate-medicine",
    },
  ],
  liu: [
    { name: "School of Arts and Sciences", slug: "arts-sciences" },
    { name: "School of Business", slug: "business" },
    { name: "School of Education", slug: "education" },
    { name: "School of Engineering", slug: "engineering" },
    { name: "School of Pharmacy", slug: "pharmacy" },
  ],
  uls: [
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Law", slug: "law" },
    { name: "Faculty of Economics and Management", slug: "economics" },
    { name: "Faculty of Canon Law", slug: "canon-law" },
    {
      name: "Faculty of Tourism and Hotel Management",
      slug: "tourism",
    },
    {
      name: "Faculty of Religious and Theological Sciences",
      slug: "religious",
    },
    { name: "Faculty of Political Sciences", slug: "political" },
    { name: "Faculty of Public Health", slug: "public-health" },
  ],
  meu: [
    { name: "Faculty of Arts and Sciences", slug: "arts-sciences" },
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Education", slug: "education" },
    { name: "Faculty of Philosophy and Theology", slug: "philosophy-theology" },
  ],
  haigazian: [
    {
      name: "Faculty of Business Administration and Economics",
      slug: "business",
    },
    { name: "Faculty of Humanities", slug: "humanities" },
    {
      name: "Faculty of Sciences — Natural Sciences",
      slug: "natural-sciences",
    },
    {
      name: "Faculty of Sciences — Mathematical Sciences",
      slug: "mathematical-sciences",
    },
    {
      name: "Faculty of Social and Behavioral Sciences",
      slug: "social-behavioral",
    },
  ],
  iul: [
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Literature and Human Sciences", slug: "letters" },
    { name: "Faculty of Tourism Sciences", slug: "tourism" },
    { name: "Faculty of Islamic Studies", slug: "islamic-studies" },
    { name: "Faculty of Sciences and Arts", slug: "sciences-arts" },
    {
      name: "Faculty of Economics and Business Administration",
      slug: "economics-business",
    },
    { name: "Faculty of Law", slug: "law" },
    { name: "Faculty of Public Health", slug: "public-health" },
    {
      name: "Faculty of Political, Administrative and Diplomatic Sciences",
      slug: "political",
    },
  ],
  biu: [{ name: "Faculty of Islamic Studies", slug: "islamic-studies" }],
  makassed: [
    { name: "Faculty of Islamic Studies", slug: "islamic-studies" },
    { name: "Faculty of Nursing and Health Sciences", slug: "nursing-health" },
  ],
  jinan: [
    { name: "Faculty of Communication", slug: "communication" },
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Literature and Humanities", slug: "literature" },
    { name: "Faculty of Education", slug: "education" },
    { name: "Faculty of Public Health", slug: "public-health" },
    { name: "Faculty of Sciences", slug: "sciences" },
    { name: "Political Science Institute", slug: "political" },
  ],
  global: [
    { name: "Faculty of Literature and Humanities", slug: "literature" },
    { name: "Faculty of Health Sciences", slug: "health" },
    { name: "Faculty of Administrative Sciences", slug: "administrative" },
  ],
  aou: [
    { name: "Faculty of Business Studies", slug: "business" },
    { name: "Faculty of Computer Studies", slug: "computer" },
    { name: "Faculty of Language Studies", slug: "language" },
    { name: "Faculty of Education Studies", slug: "education" },
  ],
  "city-university": [
    { name: "Faculty of Architecture and Design", slug: "architecture" },
    { name: "Faculty of Arts and Human Sciences", slug: "arts" },
    { name: "Faculty of Business Administration", slug: "business" },
    {
      name: "Faculty of Engineering and Information Technology",
      slug: "engineering",
    },
    { name: "Faculty of Maritime Studies", slug: "maritime" },
    { name: "Faculty of Public Health", slug: "public-health" },
    { name: "Faculty of Tourism", slug: "tourism" },
  ],
  rhu: [
    { name: "College of Business Administration", slug: "business" },
    { name: "College of Engineering", slug: "engineering" },
    { name: "College of Arts and Sciences", slug: "arts-sciences" },
  ],
  aust: [
    { name: "Faculty of Arts and Sciences", slug: "arts-sciences" },
    { name: "Faculty of Business and Economics", slug: "business" },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Health Sciences", slug: "health" },
  ],
  aut: [
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Arts and Humanities", slug: "arts-humanities" },
    {
      name: "Faculty of Applied Sciences and Technology",
      slug: "applied-sciences",
    },
  ],
  aul: [
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Sciences and Fine Arts", slug: "sciences-arts" },
    { name: "Faculty of Humanities", slug: "humanities" },
    { name: "Faculty of Engineering", slug: "engineering" },
  ],
  mubs: [
    { name: "International School of Business", slug: "business" },
    { name: "School of Health Sciences", slug: "health" },
    { name: "School of Computer and Applied Sciences", slug: "computer" },
    { name: "School of Education and Social Work", slug: "education" },
  ],
  lcu: [
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Arts and Sciences", slug: "arts-sciences" },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Humanities", slug: "humanities" },
    { name: "Faculty of Education Sciences", slug: "education" },
  ],
  lgu: [
    { name: "Faculty of Public Health", slug: "public-health" },
    { name: "Faculty of Business and Insurance", slug: "business" },
    { name: "Faculty of Education and Arts", slug: "education-arts" },
  ],
  ulf: [
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Management", slug: "management" },
    { name: "Faculty of Sciences and Letters", slug: "sciences-letters" },
    { name: "Faculty of Technology", slug: "technology" },
    { name: "Faculty of Arts", slug: "arts" },
  ],
  aku: [
    { name: "Ghassan Barrage School of Business", slug: "business" },
    { name: "School of Arts and Advertising", slug: "arts" },
    { name: "School of Education", slug: "education" },
    { name: "School of Technology", slug: "technology" },
  ],
  hfu: [
    { name: "Faculty of Pedagogy", slug: "pedagogy" },
    { name: "Faculty of Health", slug: "health" },
    { name: "Faculty of Management", slug: "management" },
  ],
  ut: [
    { name: "Faculty of Islamic Studies", slug: "islamic-studies" },
    { name: "Faculty of Humanities", slug: "humanities" },
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Education", slug: "education" },
  ],
  auce: [
    { name: "Faculty of Sciences and Literature", slug: "sciences-literature" },
    { name: "Faculty of Business", slug: "business" },
    { name: "Faculty of Arts", slug: "arts" },
  ],
  usal: [
    { name: "Faculty of Humanities and Sciences", slug: "humanities-sciences" },
    {
      name: "Faculty of Business Administration, Finance and Economy",
      slug: "business",
    },
    { name: "Faculty of Education", slug: "education" },
  ],
  phoenicia: [
    { name: "College of Architecture and Design", slug: "architecture" },
    { name: "College of Arts and Sciences", slug: "arts-sciences" },
    { name: "College of Business", slug: "business" },
    { name: "College of Engineering", slug: "engineering" },
    { name: "College of Law and Political Science", slug: "law-political" },
    { name: "College of Public Health", slug: "public-health" },
  ],
  maaref: [
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Religions and Humanities", slug: "religions" },
    {
      name: "Faculty of Mass Communication and Fine Arts",
      slug: "media-arts",
    },
    { name: "Faculty of Engineering", slug: "engineering" },
    { name: "Faculty of Sciences", slug: "sciences" },
  ],
  azm: [
    { name: "Faculty of Business Administration", slug: "business" },
    { name: "Faculty of Architecture and Design", slug: "architecture" },
  ],
  iub: [
    { name: "School of Engineering", slug: "engineering" },
    { name: "School of Business and Administration", slug: "business" },
    { name: "School of Arts", slug: "arts" },
    { name: "School of Literature and Science", slug: "literature-science" },
    { name: "School of Education", slug: "education" },
  ],
};
