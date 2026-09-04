/**
 * Verified student discounts / perks for Lebanese university students.
 * Researched 3–4 Sep 2026 from official vendor, operator, bank, and university pages.
 * Full accuracy audit of every listed offer: 4 Sep 2026.
 *
 * Intentionally omitted (not currently usable by Lebanese university students):
 * - Canva Education — K-12 teachers/students only; higher-ed is Canva for Campus (institutional).
 * - DigitalOcean GitHub Pack credits — wound down; remaining credits expired 31 Jul 2026.
 * - Cursor dedicated student plan — discontinued 25 Jun 2026.
 * - ChatGPT Plus / Amazon Prime Student — no official Lebanon-eligible student SKU found.
 * - Apple Education Store hardware pricing — no Lebanon education store; US/SA programs do not ship here.
 * - Historic Hamra “show AUB ID” cafe lists (Roadster / Deek Duke / Burger King) —
 *   Beirut.com roundups, not currently confirmed by the brands.
 * - Clerk GitHub Pack Pro — omitted so it is not confused with Skoun’s Clerk auth.
 * - Headspace Student — SheerID countries are US/UK/AU/CA/FR/DE/PT/ES, not Lebanon.
 * - LinkedIn Premium Student / Grammarly individual student SKU — no self-serve offer found.
 * - NordVPN / Discord Nitro via UNiDAYS or Student Beans — Lebanon catalog not confirmed.
 * - MEA year-round student fare — no standing program on mea.com.lb.
 * - Netflix — no student SKU.
 * - Deezer Student — UNiDAYS country list (AR/AU/AT/BE/BR/BG/CA/CL/CO/DK/FR/DE/HU/IT/MX/NL/PL/ZA/ES/SE/CH/UK/US) excludes Lebanon.
 * - TIDAL Student — TIDAL is not listed as available in Lebanon; student plan is SheerID-gated by region.
 * - SoundCloud Go+ Student — Title IV US degree-granting institutions only.
 * - Chess.com Premium student — UNiDAYS countries are AU/CA/FR/DE/IN/IT/NL/NZ/ES/UK/US.
 * - Crunchyroll Student Beans — US/UK/CA catalogs; Lebanon not confirmed.
 * - Disney+ / Hulu / Paramount+ / Max / Peacock student plans — no Lebanon-eligible SKU found.
 * - Amazon Music Unlimited / Kindle Unlimited / Nintendo Switch Online via Prime Student —
 *   require Amazon Prime Student, which is not offered in Lebanon.
 * - Xbox Game Pass student / Discord Nitro Game Pass perk — published region lists exclude Lebanon.
 * - Shahid VIP / OSN+ — no self-serve student plan found (Epic bundles are GCC-only).
 * - VOX Cinemas Lebanon “Monday student package” page is still live but quotes 20,000 LBP
 *   (landing asset dated ~2018) and the FAQ ticket table is in the same obsolete LBP scale.
 * - Grand Cinemas / Empire — no current student-ID rate card; loyalty and school-group bookings only.
 * - Jeita Grotto / DGA archaeological sites — no standing published student tariff; Independence-week
 *   free-entry decrees are date-limited, not year-round.
 * - Sursock Museum and AUB Archaeological Museum — free to the public, not a student exclusive.
 * - Memory of Time Fossils Museum (Jbeil) — publicly free; USJ’s extra is a shop discount, not entry.
 *
 * Local gym pages for “Lebanon, Ohio / Pennsylvania” were excluded.
 * Alfa’s weekday e-learning data bundle is a network-wide MEHE measure, not a student plan.
 * Google AI Pro’s 12-month free trial is US-only; the paid student bundle below is Lebanon-eligible.
 */

export type StudentBenefitSeed = {
  companyName: string;
  title: string;
  category: "tech" | "food" | "services" | "entertainment" | "finance" | "telecom";
  description: string;
  eligibility: string;
  redemptionType: "link" | "promo_code" | "show_id";
  redemptionData: string;
  isGlobal: boolean;
  applicableUniversities: string[];
  locationOrArea?: string;
  sourceUrl?: string;
};

export const studentBenefitSeeds: StudentBenefitSeed[] = [
  // ---------------------------------------------------------------------------
  // Global tech & software (usable from Lebanon when verification succeeds)
  // ---------------------------------------------------------------------------
  {
    companyName: "GitHub Education",
    title: "Student Developer Pack (80+ partner offers)",
    category: "tech",
    description:
      "Free GitHub Pro plus a catalog of partner tools (cloud credits, IDEs, domains, learning platforms). Student verification lasts 2 years, then you must re-verify. Teachers and staff are not eligible for the Pack.",
    eligibility:
      "Must be 13+, enrolled in a degree- or diploma-granting program, and verified by GitHub Education. Academic email (including .edu.lb) is preferred; otherwise upload a current student ID, transcript, or enrollment letter. Lebanese universities that issue academic email typically require it.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "GitHub",
    title: "Free GitHub Pro while verified",
    category: "tech",
    description:
      "Verified students receive GitHub Pro (advanced repo insights and higher Codespaces usage) for as long as GitHub Education verification remains active.",
    eligibility:
      "Requires an approved GitHub Education student application (academic email and/or enrollment documents). Not available to faculty/staff via the Student Pack.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://docs.github.com/en/education/about-github-education/github-education-for-students/github-terms-and-conditions-for-the-student-developer-pack",
  },
  {
    companyName: "GitHub Copilot",
    title: "Free Copilot Student plan",
    category: "tech",
    description:
      "Verified students get GitHub Copilot Student: unlimited code completions, an allowance of GitHub AI credits, and limited chat/agent usage with auto-selected models. Activation is a separate step after Education approval and can take a few days.",
    eligibility:
      "Requires an approved GitHub Education student account. Re-evaluated monthly. Do not purchase a paid Copilot plan while waiting for the student benefit to attach.",
    redemptionType: "link",
    redemptionData: "https://github.com/settings/education/benefits",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-students",
  },
  {
    companyName: "JetBrains",
    title: "Free JetBrains Student Pack (all IDEs)",
    category: "tech",
    description:
      "Free 1-year license for the JetBrains Student Pack: IntelliJ IDEA Ultimate, PyCharm, WebStorm, CLion, Rider, DataGrip, ReSharper, and the rest of the JetBrains IDEs/.NET tools. Renewable annually while enrolled. Educational licenses are for non-commercial educational use only. A 40% graduation discount is available for 2 years after the student license expires.",
    eligibility:
      "Full-time student at an accredited high school, college, or university in a program that takes one or more years of full-time study. Apply with a school email, an ISIC/ITIC card, or a GitHub Student Developer Pack account. As of July 2024 JetBrains no longer accepts standalone school documents.",
    redemptionType: "link",
    redemptionData: "https://www.jetbrains.com/shop/eform/v2/students",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://sales.jetbrains.com/hc/en-gb/articles/11558649766674-How-do-I-apply-for-a-free-educational-license",
  },
  {
    companyName: "Microsoft Azure",
    title: "$100 Azure for Students credit + free services",
    category: "tech",
    description:
      "No credit card required. $100 Azure credit to use within 12 months, plus monthly free amounts of 20+ popular services (new customers) and 65+ always-free services. Renew the subscription annually while you remain a verified student to keep free access — Microsoft does not state that a fresh $100 is issued each year. Also unlocks Azure Dev Tools for Teaching downloads via the Education Hub. Ages 18+. A separate no-card Starter offer (no $100 credit) exists for younger students: 16+ outside the US, including Lebanon.",
    eligibility:
      "Full-time students aged 18+ at an accredited two- or four-year degree-granting institution. Sign up with your organization’s school email (university Microsoft tenant or other recognized school domain). Renew yearly while enrolled.",
    redemptionType: "link",
    redemptionData: "https://azure.microsoft.com/free/students/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://azure.microsoft.com/en-us/free/students",
  },
  {
    companyName: "Microsoft 365 Education",
    title: "Free Office 365 A1 (web apps) via school email",
    category: "tech",
    description:
      "Students at Microsoft-qualified institutions can get Office 365 A1 at no cost: web versions of Word, Excel, PowerPoint, Outlook, OneNote, plus Teams (and PC-only Publisher and Access). Desktop Office apps are included only if the university assigns A3/A5 (or Student Use Benefit) licenses — check with campus IT. Eligibility can be re-verified at any time.",
    eligibility:
      "Requires an eligible education email whose domain Microsoft recognizes as a qualified academic institution. A school email alone is not a guarantee — campus IT must complete Microsoft’s academic verification and assign a license. Ask your university which plan you actually get (A1 vs A3/A5/SUB).",
    redemptionType: "link",
    redemptionData: "https://www.microsoft.com/education/products/office",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.microsoft.com/en/education/products/office",
  },
  {
    companyName: "Notion",
    title: "Free Education Plus plan (1-member workspace)",
    category: "tech",
    description:
      "Individual students get a free Plus-equivalent Education plan: unlimited pages/blocks, file uploads, site publishing features, and 30-day version history. Full Notion AI is not included on the free Education/Plus plan (limited complimentary AI responses only). Re-verify once a year with the school email. Student-led orgs at verified institutions can apply separately for a free multi-member org workspace.",
    eligibility:
      "Must sign in with a school email whose domain is listed in the World Higher Education Database (WHED). Notion does not accept student IDs or other documents. The school email must be the account’s primary address, not an extra alias.",
    redemptionType: "link",
    redemptionData: "https://www.notion.com/help/notion-for-education",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.notion.com/help/notion-for-education",
  },
  {
    companyName: "Figma",
    title: "Free Education plan (Professional tools + FigJam + Dev Mode)",
    category: "tech",
    description:
      "Higher-ed students get a free Education plan covering Figma, FigJam, and Dev Mode professional features. Student access lasts one year; reapply while still enrolled. Must be used on an Education team after verification.",
    eligibility:
      "Create or update a Figma account using a school-issued email, then apply at figma.com/education/apply, select Higher ed, and complete SheerID. Personal emails are not accepted. If SheerID cannot auto-verify, contact figmasupport@sheerid.com with enrollment proof.",
    redemptionType: "link",
    redemptionData: "https://www.figma.com/education/apply",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://help.figma.com/hc/en-us/articles/360041061214-Figma-for-Education",
  },
  {
    companyName: "Adobe",
    title: "Creative Cloud Pro student/teacher pricing (~71% off year 1)",
    category: "tech",
    description:
      "Photoshop, Illustrator, Premiere Pro, Acrobat Pro, Firefly, and 20+ apps at education pricing. Adobe’s US store advertises $19.99/mo for the first year then $39.99/mo (annual billed monthly); Lebanon is on Adobe’s MENA store and the local price may differ. Creative Cloud Pro subscribers may get a student discount on Adobe Certified Professional exams (US marketing cites 60%; MENA says “special student discount” — confirm at checkout). First-time education customers only; 12-month commitment.",
    eligibility:
      "Students 13+ at an accredited primary/secondary school or degree-granting college/university, or teachers. Adobe verifies status (typically SheerID) and may request a current school ID, report card, transcript, or tuition bill. Buy from Adobe’s education store for your region.",
    redemptionType: "link",
    redemptionData: "https://www.adobe.com/mena_en/creativecloud/buy/students.html",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.adobe.com/mena_en/creativecloud/buy/students.html",
  },
  {
    companyName: "Autodesk",
    title: "Free 1-year Education access (AutoCAD, Revit, Maya, Fusion, and more)",
    category: "tech",
    description:
      "Eligible students get free single-user educational licenses for the full Education Community catalog (AutoCAD, Revit, Inventor, Fusion, Maya, 3ds Max, Civil 3D, and others). Access lasts one year and is renewable while eligible. Strictly for educational purposes — commercial/for-profit use is prohibited.",
    eligibility:
      "Enrolled at a qualified accredited educational institution, meeting Autodesk’s minimum age. Create an Autodesk account and complete SheerID verification — a school email is not required and is not sufficient on its own; enrollment documents may be requested. Renew from 30 days before expiry.",
    redemptionType: "link",
    redemptionData: "https://www.autodesk.com/education/edu-software/overview",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.autodesk.com/education/edu-software/overview",
  },
  {
    companyName: "Unity",
    title: "Free Unity Student plan (Pro Editor)",
    category: "tech",
    description:
      "Free Unity Pro Editor for verified students, plus a free Odin Inspector/Validator education license, a Synty asset bundle, and Unity Cloud personal-tier access. License is valid 1 year and renewable while enrolled. Commercialization of student-plan projects is allowed under Unity Editor terms.",
    eligibility:
      "Age 16+, currently enrolled in credit-bearing classes toward a diploma, degree, or professional license. SheerID verification (school email is not strictly required). One Unity ID per student plan.",
    redemptionType: "link",
    redemptionData: "https://unity.com/products/unity-student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://unity.com/products/unity-student",
  },
  {
    companyName: "Heroku",
    title: "$13/month platform credit for 24 months ($312 total)",
    category: "tech",
    description:
      "GitHub Student Pack members aged 18+ receive one $312 credit allocation that burns down at $13/month for 24 months. Usable on Heroku Dynos, Postgres, and Key-Value Store — not third-party add-ons. $13 covers Eco Dynos ($5) + Mini Postgres ($5) + Mini Key-Value Store ($3). One 24-month period per student.",
    eligibility:
      "Must already be in the GitHub Student Developer Pack and be 18 or older. Redeem from the Pack offers page, then from heroku.com/github-students.",
    redemptionType: "link",
    redemptionData: "https://www.heroku.com/github-students/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.heroku.com/github-students/",
  },
  {
    companyName: "MongoDB",
    title: "$50 Atlas credit + free certification ($150 value)",
    category: "tech",
    description:
      "Through the GitHub Student Developer Pack: $50 MongoDB Atlas credit, MongoDB Compass, MongoDB University access, and a free certification exam (listed at $150 value).",
    eligibility:
      "Requires GitHub Student Developer Pack approval (academic email or enrollment documents, GitHub account, age 13+).",
    redemptionType: "link",
    redemptionData: "https://www.mongodb.com/students",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.mongodb.com/students",
  },
  {
    companyName: "Namecheap",
    title: "Free 1-year .me domain + 1-year SSL",
    category: "tech",
    description:
      "GitHub Student Pack partner offer: one year of .me domain registration and one free SSL certificate for one year. Claim from the Pack offers page after GitHub Education approval.",
    eligibility:
      "Requires an active GitHub Student Developer Pack. Redeem once via the Pack partner offer.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "AWS",
    title: "Student Rewards: Skill Builder Premium + credits + cert voucher",
    category: "tech",
    description:
      "Launched August 2026 on AWS Builder Center for verified higher-ed students worldwide. After SheerID verification and completing a Builder Center profile (photo + About), unlock 12 months of Skill Builder Premium (900+ courses/labs). Earn badges: 7 → $10 AWS credits, 14 → additional $20 credits, 21 → an AWS Foundational certification exam voucher ($100 value).",
    eligibility:
      "Age 18+, enrolled at an accredited higher-education institution. Verify via SheerID on AWS Builder Center (university email or student ID as requested). Subject to AWS Student Rewards terms and successful verification of your institution.",
    redemptionType: "link",
    redemptionData: "https://builder.aws.com/student-rewards",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://builder.aws.com/student-rewards",
  },
  {
    companyName: "1Password",
    title: "Free 1Password for 1 year (incl. Developer Tools)",
    category: "tech",
    description:
      "GitHub Student Pack offer: 1Password free for one year, including 1Password Developer Tools, for password and secrets management while studying.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Termius",
    title: "Free Termius Pro + Team while enrolled",
    category: "tech",
    description:
      "GitHub Student Pack: free access to all Termius Pro and Termius Team features (cross-device SSH client with secure sync) for as long as you remain a verified student.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Appwrite",
    title: "Free Education plan (Pro-equivalent, 2 projects)",
    category: "tech",
    description:
      "GitHub Student Pack: Education plan with 2 projects at Appwrite Pro resource limits (listed at $40/month value) for as long as GitHub Education membership remains active. Backend + hosting for web, mobile, and AI apps.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "DataCamp",
    title: "3 months free access (GitHub Student Pack)",
    category: "tech",
    description:
      "GitHub Student Pack: three months of free DataCamp access (course library for Python, SQL, R, and data science) when you activate with your GitHub student account. One-time offer — claim it when you have time to use it.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page with your GitHub student account.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Frontend Masters",
    title: "6 months free courses and workshops",
    category: "tech",
    description:
      "GitHub Student Pack: six months of Frontend Masters (in-depth JavaScript, Node.js, CSS, and front-end engineering courses and workshops).",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Educative",
    title: "6 months free + 30% off after",
    category: "tech",
    description:
      "GitHub Student Pack: six months of Educative (70+ interactive courses covering web development, Python, Java, and machine learning), then 30% off any paid subscription you choose.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "GitKraken",
    title: "6 months free Student plan, then up to 80% off",
    category: "tech",
    description:
      "GitHub Student Pack: GitKraken Student plan (GitKraken Desktop, GitLens, CLI) free for 6 months, then up to 80% off Pro while you remain a verified student.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Name.com",
    title: "Free 1-year domain (25+ extensions)",
    category: "tech",
    description:
      "GitHub Student Pack: one free domain for a year from Name.com, with extensions such as .live, .studio, .software, .app, and .dev. Use a unique Name.com account email or the system may treat the claim as a duplicate.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Datadog",
    title: "Pro account (10 servers) free for 2 years",
    category: "tech",
    description:
      "GitHub Student Pack: Datadog Pro including monitoring for 10 servers, free for two years. Production-grade observability for class projects and side apps.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Deepnote",
    title: "Free Team plan while enrolled",
    category: "tech",
    description:
      "GitHub Student Pack: Deepnote Team plan while you remain a student — unlimited team members and projects, 30-day version history, basic machines (up to 5 GB RAM / 2 vCPU), and premium warehouse integrations (Snowflake, BigQuery, Redshift, and more). Jupyter-compatible cloud notebooks.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Sentry",
    title: "Team error tracking (1 year, renewable)",
    category: "tech",
    description:
      "GitHub Student Pack: Sentry education sponsored plan with Team features for one year (renewable while you stay a verified student). Official Sentry quotas include 50K errors, 5M spans, 5GB logs, 500 session replays, 1 GB attachments, plus monitors/profiling/Seer allowances. GitHub’s Pack page still lists 100K transactions (older wording). On-demand/PAYG is off by default; Sentry lets you enable it with a card.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Stripe",
    title: "Waived fees on first $1,000 processed",
    category: "tech",
    description:
      "GitHub Student Pack: Stripe waives processing fees on your first $1,000 in revenue. Activate before you take payments on a student project or campus startup.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page. Stripe is not available for Lebanon-registered businesses or local LB payouts — you need a Stripe account in a supported country.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Boot.dev",
    title: "3 months free interactive backend courses",
    category: "tech",
    description:
      "GitHub Student Pack: three months of Boot.dev’s interactive membership (Python, Go, TypeScript, backend, DevOps, and data analysis). Game-like curriculum — claim it when you have time to finish tracks.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Codédex",
    title: "6 months free Club membership",
    category: "tech",
    description:
      "GitHub Student Pack: six months of Codédex Club (Python, HTML/CSS, JavaScript, React, Git, and command line courses aimed at beginners).",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: ".TECH",
    title: "Free .TECH domain for 1 year",
    category: "tech",
    description:
      "GitHub Student Pack: one standard .TECH domain free for a year — useful for a portfolio or class project hostname.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Bootstrap Studio",
    title: "Free student license (1 year, renewable)",
    category: "tech",
    description:
      "GitHub Student Pack: a Bootstrap Studio student license while you are enrolled — non-commercial, one computer, issued for one year and renewable annually. Visual builder for responsive Bootstrap sites (not the paid Standard/Lifetime license).",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "New Relic",
    title: "Free observability platform while a student",
    category: "tech",
    description:
      "GitHub Student Pack: New Relic at no cost while you remain a verified student (listed as a $300/month-value plan on the Pack page). New Relic’s student program docs cap access at 2 years. Application performance monitoring for class projects and side apps.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page. New Relic support: students@newrelic.com. Self-service signup may be temporarily unavailable — open a New Relic student support case if OAuth fails.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "BrowserStack",
    title: "Free Automate Mobile Plan for 1 year",
    category: "tech",
    description:
      "GitHub Student Pack: BrowserStack Automate Mobile for 1 parallel and 1 user for one year — real iOS/Android devices and 2000+ browsers for testing web and mobile apps.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Arduino",
    title: "Arduino Cloud free for 6 months",
    category: "tech",
    description:
      "GitHub Student Pack: six months of Arduino Cloud plus discounts on selected Arduino hardware. Useful for IoT and embedded coursework.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Dashlane",
    title: "Premium password manager free for 6 months",
    category: "tech",
    description:
      "GitHub Student Pack: Dashlane Premium free for six months (sync, dark web monitoring, and unlimited devices). Complements 1Password’s Education offer — pick one manager and stick with it.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "LocalStack",
    title: "Free AWS emulator license (cloud environment)",
    category: "tech",
    description:
      "GitHub Student Pack: a free license for LocalStack’s AWS emulator in a ready-to-use cloud environment — develop and test against AWS APIs without a live AWS bill.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Icons8",
    title: "3 months free icons, photos, and illustrations",
    category: "tech",
    description:
      "GitHub Student Pack: three months of Icons8 (icons, photos, illustrations, and music) for UI mockups and presentations.",
    eligibility:
      "Requires GitHub Student Developer Pack approval. Redeem from the Pack offers page.",
    redemptionType: "link",
    redemptionData: "https://education.github.com/pack",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://education.github.com/pack",
  },
  {
    companyName: "Google",
    title: "Google AI Pro + YouTube Premium Student bundle",
    category: "tech",
    description:
      "Official Google One student offer: Google AI Pro (Gemini Advanced, extra storage, Flow/Antigravity usage) bundled with YouTube Premium Student. Lebanon is on Google’s country list for this bundle. Re-verify with SheerID about every 12 months, for up to 4 consecutive years. The separate 12-month free AI Pro trial is US-only — this row is the paid student bundle. Recurring add-ons (Home/Health Premium, extra 2 TB/10 TB) are not included.",
    eligibility:
      "Higher-education student in a listed country (Lebanon included). Personal Google Account plus a qualifying payment method. Verify with SheerID using a school email at one.google.com/ai-student. Leave a Google One family group first if you are on a shared plan. If you already pay for YouTube Premium separately, cancel the duplicate before bundling.",
    redemptionType: "link",
    redemptionData: "https://one.google.com/ai-student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.google.com/googleone/answer/17422238",
  },
  {
    companyName: "Perplexity",
    title: "Education Pro ($10/mo via SheerID)",
    category: "tech",
    description:
      "Students and educators get Perplexity Education Pro at $10/mo vs $20/mo Pro via SheerID: Pro searches, file/image uploads, premium models, Learn Mode, and Perplexity Computer access (Computer is credit-limited, not unlimited). Checkout may quote a local price. A past US-campus free-year promo (Race to Infinity) ended 31 Dec 2024 — it is not an ongoing Lebanon-wide giveaway.",
    eligibility:
      "Verify as a student through SheerID from Perplexity’s upgrade paywall (toggle Education / Verify as student). You may use a personal Perplexity email; SheerID can use a different school email. If your university is missing from SheerID, request it be added. Student discounts are not transferable to another email.",
    redemptionType: "link",
    redemptionData: "https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.perplexity.ai/help-center/en/articles/12162294-how-to-verify-your-student-status",
  },
  {
    companyName: "Tableau",
    title: "Free Tableau Desktop Public Edition",
    category: "tech",
    description:
      "Tableau for Students now ships Tableau Desktop Public Edition at no cost — no annual license request. Learn visualizations, publish to Tableau Public, and enter Iron Viz: Student Edition. Not for commercial/internship work, and it cannot publish to Tableau Cloud (ask your professor for course software if the class requires Cloud).",
    eligibility:
      "Sign up on Tableau Public and download Desktop Public Edition from tableau.com/academic/students. Aimed at students and other learners; no separate student-ID check for Public Edition. No renewal required once downloaded.",
    redemptionType: "link",
    redemptionData: "https://www.tableau.com/academic/students",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.tableau.com/academic/students",
  },
  {
    companyName: "MathWorks",
    title: "MATLAB via campus license or Student Suite",
    category: "tech",
    description:
      "Many universities (including most Lebanese privates with an engineering faculty) already include MATLAB/Simulink under a Campus-Wide license — create a MathWorks account with your school email first. If your campus does not, MathWorks sells a MATLAB and Simulink Student Suite (MATLAB, Simulink, Online Training, and common toolboxes). US store lists US$119/year; Lebanon pricing is quoted by MathWorks sales, not the US catalog.",
    eligibility:
      "Currently enrolled student. Try MATLAB through your university email at mathworks.com/academia/student_version.html. Buying Student Suite requires student verification and is for coursework/non-commercial use.",
    redemptionType: "link",
    redemptionData: "https://www.mathworks.com/academia/student_version.html",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.mathworks.com/academia/student_version.html",
  },
  {
    companyName: "Overleaf",
    title: "Student plan (~50% off Standard)",
    category: "tech",
    description:
      "Official Overleaf Student plan: 10 collaborators per project, full history, track changes, symbol palette, and faster compiles — the same collaboration features as Standard, at the student rate (USD catalog shows $8.25/month or $98/year vs Standard $16.75/$199). Checkout may quote a local price. Free plan stays available with 1 collaborator.",
    eligibility:
      "Students at educational institutions, including graduate students. Buy from Overleaf’s plans page and choose Student. Confirm the price shown for your billing country before paying.",
    redemptionType: "link",
    redemptionData: "https://www.overleaf.com/user/subscription/plans",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.overleaf.com/user/subscription/plans",
  },
  {
    companyName: "Miro",
    title: "Free Education plan (2 years, 10-person team)",
    category: "tech",
    description:
      "Official Miro Education plan for students: unlimited boards, 10 team members, unlimited external visitors, templates, core integrations, and limited Miro AI (100 credits/month per team, 5 Flow runs per member). Valid for two years; re-apply with proof of enrollment to extend. Educators get a larger forever plan (100 members). Not for vocational/training programs. Accredited technical schools can qualify. Review can take up to 10 days.",
    eligibility:
      "Student at an accredited college or university (MEHE-accredited Lebanese universities qualify; Miro states the program is available outside the US). Apply with proof of enrollment (student ID). Use a school email when you have one; if not, submit proof of affiliation for manual review. One Education team per email. Existing paid Miro teams cannot convert.",
    redemptionType: "link",
    redemptionData: "https://miro.com/education/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://help.miro.com/hc/en-us/articles/360017730473-Education-plan",
  },
  {
    companyName: "Lucidchart",
    title: "Free Lucid for Education account (school email)",
    category: "tech",
    description:
      "Students and educators get a free Lucid for Education account (Lucidchart + Lucidspark): real-time diagramming, comments, and education templates. Higher-education sign-up is supported — register with your university email and select Student. Google Classroom/LMS assignment integrations may need EDU Premium or admin setup; they are not guaranteed on the free higher-ed plan.",
    eligibility:
      "Use a recognized educational email (including typical .edu.lb / university domains). Select Student or Educator on first login. If auto-upgrade fails, submit Lucid’s Request Free Educational Upgrade form — enrollment PDFs are not the documented fallback.",
    redemptionType: "link",
    redemptionData: "https://www.lucidchart.com/pages/usecase/education",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.lucidchart.com/pages/usecase/education",
  },
  {
    companyName: "Wolfram",
    title: "Mathematica Student Edition (or campus license)",
    category: "tech",
    description:
      "Check whether your university already provides Mathematica / Wolfram Language at no cost (campus/site license is a separate institutional path). If not, Wolfram sells Mathematica Student Edition — all major Mathematica functionality for personal, nonprofessional academic use on up to two personally owned machines, plus student-tier cloud access (not full professional parity: student banner, 8-core desktop limit). Student checkout quotes the price for your region (Lebanon is selectable in the Wolfram Store; the US catalog does not apply). Proof of enrollment is required. After graduation, eligible recent grads can apply to Wolfram’s Early Professionals Program for a free six-month license (not automatic).",
    eligibility:
      "Part- or full-time student at an accredited institution (including bachelor’s/master’s/doctoral). Provide a dated student ID, class schedule/registration, school bill, or a public university page that shows you are enrolled. Install only on your own computer; not for faculty teaching licenses. Early Professionals requires graduating within 3 months or having graduated within 12 months, and not pursuing another degree.",
    redemptionType: "link",
    redemptionData: "https://www.wolfram.com/mathematica/pricing/students/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.wolfram.com/mathematica/pricing/students/",
  },
  {
    companyName: "Spotify",
    title: "Premium Student (US$2.99/month in Lebanon)",
    category: "entertainment",
    description:
      "Ad-free Spotify Premium at the Lebanon student rate: US$0 for 1 month, then US$2.99/month (Premium Individual is US$5.49). Eligible for up to 4 years; re-verify with SheerID every 12 months. The 1-month trial is only for accounts that have never tried Premium. After eligibility ends, the plan switches to Premium Individual. Cannot be billed through a phone/ISP — use a card or other method shown at checkout.",
    eligibility:
      "Age 18+, enrolled at a SheerID-eligible accredited college or university. Start checkout from Spotify’s Lebanon student page and search your university in the SheerID form; if it is not listed you are not eligible yet. Spotify account country should be Lebanon (or match where you study) with a payment method issued there. Upload a current enrollment letter, class schedule, or tuition receipt if auto-verify fails (SheerID can take a few days).",
    redemptionType: "link",
    redemptionData: "https://www.spotify.com/lb-en/student/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.spotify.com/lb-en/student/",
  },
  {
    companyName: "YouTube",
    title: "YouTube Premium / YouTube Music Premium Student",
    category: "entertainment",
    description:
      "Discounted YouTube Premium or YouTube Music Premium for students. Lebanon is on Google’s official student-membership country list. Eligible for up to 4 consecutive years; re-verify with SheerID every 12 months. Cancel any existing paid YouTube membership before switching.",
    eligibility:
      "Enrolled at a SheerID-approved higher-education institution in a listed country (Lebanon included). Start checkout, search your university in the SheerID form; if it is not listed you are not eligible yet. Upload enrollment documents if auto-verify fails (up to 48 hours outside the US).",
    redemptionType: "link",
    redemptionData: "https://www.youtube.com/premium/student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.google.com/youtube/answer/9158808",
  },
  {
    companyName: "Apple Music",
    title: "Student subscription (up to 48 months)",
    category: "entertainment",
    description:
      "Verified university students can subscribe to Apple Music at the discounted student rate for up to 48 months, with yearly re-verification. Apple’s Lebanon support page documents this offer. The same student subscription includes Apple TV+ (Apple Originals) at no extra cost while the Music student plan is active — it is not a separate charge and cannot be shared with Family Sharing. Verification is handled by SheerID or UNiDAYS depending on the flow.",
    eligibility:
      "Must be studying an associate, bachelor’s, postgraduate, or equivalent higher-education course. Have student ID and student email ready. Open Apple Music → Home → Student → Verify Eligibility, or start at music.apple.com/student.",
    redemptionType: "link",
    redemptionData: "https://music.apple.com/student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.apple.com/en-lb/106008",
  },
  {
    companyName: "Apple TV",
    title: "Apple TV+ included with Apple Music Student",
    category: "entertainment",
    description:
      "While an Apple Music student subscription is active, Apple TV+ (Apple Originals in the Apple TV app) is included at no extra cost. There is no separate Apple TV+ student SKU and no extra line on the bill. Access is tied to the Music student plan, so it ends if you cancel Music or roll off student pricing. You cannot share this Apple TV+ access with Family Sharing.",
    eligibility:
      "Must already hold (or subscribe to) the Apple Music student plan — same higher-education verification (SheerID or UNiDAYS), up to 48 months with yearly re-verify. Open the Apple TV app after Music student is active; you will not see a separate Apple TV+ subscription.",
    redemptionType: "link",
    redemptionData: "https://music.apple.com/student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.apple.com/en-lb/106008",
  },
  {
    companyName: "Anghami",
    title: "Plus Student — 50% off (US$2.49/month in Lebanon)",
    category: "entertainment",
    description:
      "Ad-free Anghami Plus (unlimited downloads, lyrics, full player controls) at half the Lebanon monthly price: US$2.49 vs US$4.99 Individual. No student trial. Re-verify the education email every 12 months. Pay with a card on the web, or Apple / Google Play in the app. Anghami Plus vouchers from retailers are for the regular plan, not this student SKU. The student offer is not available when connecting from Jordan.",
    eligibility:
      "Eligible students only. Anghami’s help pages ask you to link a valid .edu educational email and confirm it from the inbox; the studentoffer page also lists ISIC credentials as an alternate path. Pay with a card on the web, or Apple / Google Play in the app — Lebanon prepaid vouchers are for standard/Family/Gold plans, not this student SKU. Start at anghami.com/studentoffer (web) or tap Subscribe in the app and choose Student Plan if it appears.",
    redemptionType: "link",
    redemptionData: "https://www.anghami.com/studentoffer",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.anghami.com/hc/en-us/articles/228547567-Anghami-Student-Discount-Save-50-on-Your-Plan",
  },
  {
    companyName: "MACAM",
    title: "Student guided-tour fee US$2 (full-time ID)",
    category: "entertainment",
    description:
      "Modern and Contemporary Art Museum in Alita (Jbeil district). Independent visits are by donation — pay what you wish, no booking. Guided tours (min. 5 people, book at least 2 days ahead) cost US$2 for full-time students with ID versus US$4 for adults (fees, not suggested donations). Hours: Wednesday–Sunday 10:00–16:00 (1 Apr–30 Nov); Friday–Sunday 10:00–16:00 (1 Dec–31 Mar). Closed 25 Dec, 1 Jan, and 1 May. Disabled visitors and a companion enter free.",
    eligibility:
      "Full-time students presenting a current student ID for the student guided-tour rate. Independent walk-in donation has no ID requirement. Groups and school visits: email info@macamlebanon.org.",
    redemptionType: "show_id",
    redemptionData:
      "Show a current student ID at MACAM, Alita (Qartaba exit, then ~7 km uphill). Guided tours: info@macamlebanon.org at least two days ahead.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Alita, Jbeil District",
    sourceUrl: "https://www.macamlebanon.org/visitus",
  },
  {
    companyName: "Museum of Lebanese Prehistory",
    title: "Reduced admission for students under 26",
    category: "entertainment",
    description:
      "USJ’s Musée de Préhistoire Libanaise (Monnot, Achrafieh) lists a reduced visit price for students under 26: 100,000 LBP versus 150,000 LBP full price (confirm today’s LBP/USD at the desk — museum pages lag FX). Open Tuesday–Friday 08:30–16:30; Saturday by reservation for groups of 12+. Closed on national holidays and university vacations. Groups, guided tours, and workshops must book ahead (01 421 860 / mpl@usj.edu.lb).",
    eligibility:
      "Any student under 26 with a current student ID — not limited to USJ. Bring ID to the ticket desk.",
    redemptionType: "show_id",
    redemptionData:
      "Present a current student ID at the Museum of Lebanese Prehistory, Saint Joseph University Street, Quartier Monnot, Achrafieh (01 421 860 / mpl@usj.edu.lb).",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Monnot / Achrafieh, Beirut",
    sourceUrl: "https://usj.edu.lb/mpl/info-pratiques.php?lang=2",
  },
  {
    companyName: "Al Bustan Festival",
    title: "Youth Card: US$25 then US$10 concert tickets (ages ≤25)",
    category: "entertainment",
    description:
      "Winter performing-arts festival (Beit Mery). The Youth Card is US$25 and lets you buy one ticket per performance for US$10, one hour before concert time, subject to availability. Seat is assigned the day of the show; pick up at the Festival box office before 20:00. Card is personal and non-transferable. A separate Meteor Card (US$150 / 5 concerts) is open to anyone and is not a student product.",
    eligibility:
      "Age 25 or under (youth product — not a university-enrollment check). Show ID when collecting the card and again when collecting each ticket. Buy at any Al Bustan Festival point of sale. Confirm the current season’s points of sale on albustanfestival.com.",
    redemptionType: "show_id",
    redemptionData:
      "Buy the Youth Card at an Al Bustan Festival point of sale, then collect each US$10 ticket at the box office from one hour before the concert (before 20:00), with ID. Hub: https://albustanfestival.com/youth-and-meteor-cards/",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Beit Mery (festival venues)",
    sourceUrl: "https://albustanfestival.com/youth-and-meteor-cards/",
  },
  {
    companyName: "Baalbeck International Festival",
    title: "25% off — university students (2 tickets, student ID)",
    category: "entertainment",
    description:
      "The festival’s booking page offers university students 25% off when purchasing 2 tickets, on presentation of a valid student ID. Tickets are sold via Ticketing Box Office / Virgin Megastores (ABC branches) and ticketingboxoffice.com, then collected at BOB Finance, Whish, or OMT. The 2026 summer edition was postponed (announced 12 Jun 2026) — confirm new dates and that the student offer still applies before paying.",
    eligibility:
      "University students with a valid student ID. The published offer is for a 2-ticket purchase. Not a general public promo.",
    redemptionType: "show_id",
    redemptionData:
      "Buy 2 tickets at Virgin / Ticketing Box Office (or ticketingboxoffice.com) and present a valid university student ID for the 25% student offer. Info: +961 1 217 810.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Baalbek (festival); tickets in Beirut / nationwide box offices",
    sourceUrl: "https://www.baalbeck.org.lb/booking/",
  },
  {
    companyName: "Metropolis Cinema",
    title: "Reduced student tickets on many programs",
    category: "entertainment",
    description:
      "Independent cinema in Mar Mikhael. Metropolis does not publish a single year-round student rate card, but many 2026 programs list a student price at the box office (recent film-cycle example: 400,000 LBP student vs 500,000 LBP general — confirm the figure on that event’s page). Student tickets are often box-office only. Box office / WhatsApp 81 069 530 from 16:00. Also hosts Écrans du Réel, European Film Festival, and Beirut Animated — check each festival’s student fare.",
    eligibility:
      "Present a current student ID at the Metropolis box office. If a program page does not list a student price, ask before paying — it is per event, not automatic.",
    redemptionType: "show_id",
    redemptionData:
      "Show a student ID at Metropolis Cinema, Pharoun Street, Mar Mikhael (box office from 16:00 / WhatsApp 81 069 530). Confirm the student fare on the event page first: https://www.metropoliscinema.net/",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Mar Mikhael, Beirut",
    sourceUrl: "https://www.metropoliscinema.net/",
  },

  // ---------------------------------------------------------------------------
  // Lebanon-wide: telecom, banks, national student card
  // ---------------------------------------------------------------------------
  {
    companyName: "Alfa",
    title: "A+ $5 / A+ Max $15 university prepaid plans",
    category: "telecom",
    description:
      "Student prepaid (also offered postpaid): A+ is $5/month with 180 local minutes, 1,000 SMS, 5 GB data, unlimited Wikipedia and LinkedIn, and Clip Alert. A+ Max is $15/month with 240 minutes, 1,000 SMS, and 40 GB data (remaining data rolls over one month on prepaid and postpaid). Prices exclude VAT. Line auto-reverts to regular prepaid/postpaid when you leave the eligibility list.",
    eligibility:
      "University students aged 25 or under. Your university administration must enroll your Alfa number on the official A+ list. Student ID is required during SMS subscription. Not a walk-in store plan.",
    redemptionType: "promo_code",
    redemptionData:
      "Ask your university to list your Alfa number. After the enrollment SMS, prepaid: send AA+ (or AA+Max) plus your student ID to 1028, or dial *111#. Postpaid plan switches: Call 111. Prepaid A+ Max requires an Alfa Prepaid line.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon",
    sourceUrl: "https://www.alfa.com.lb/en/prepaid/plans/alfa-a-plans",
  },
  {
    companyName: "touch",
    title: "University Student Plan from $5 / 30 days",
    category: "telecom",
    description:
      "Prepaid University Student Plan 1: $5 per 30 days (VAT and stamp duty excluded) with 5 GB data, 60 local minutes, 180 on-campus minutes, 300 preferred-number minutes, 300 MB WhatsApp, and 440 SMS. Plan 2 is $17 / 30 days (40 GB, 100 local minutes — confirm the live table). PAYG data after the bundle is $0.01/MB. Only magic lines can switch, once every 30 days (Plan 1 ↔ Plan 2 is once per calendar quarter).",
    eligibility:
      "Must not exceed 25 years old. Eligibility is confirmed by your university — check with student affairs before switching. Switch from a magic prepaid line in the touch self-care app (minimum $5 or $17 credit depending on plan).",
    redemptionType: "link",
    redemptionData:
      "Download the touch self-care app → Student Plan, after your university confirms eligibility.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon",
    sourceUrl: "https://www.touch.com.lb/en/mobile-plans/prepaid/student-plan",
  },
  {
    companyName: "Bank Audi neo",
    title: "Digital banking marketed to university students",
    category: "finance",
    description:
      "neo (Bank Audi’s digital bank) is marketed as free banking for university students. The published packages: Entry is free and cardless (Fresh LBP/USD accounts, multicurrency LBP/USD/EUR/GBP/SAR/AED, QR embassy statements, cardless cash at 200+ Bank Audi ATMs). Standard is $1.99/month and includes physical + digital debit cards. Some campus partnerships (e.g. USJ GROUP USJ) may waive Standard fees — that is not the default public package.",
    eligibility:
      "18+ with Lebanese nationality. Sign up in the neo app with a Lebanese mobile number plus national ID or passport. Marketed to university students, but KYC is ID-based rather than a .edu.lb or enrollment check — any eligible adult can open neo.",
    redemptionType: "link",
    redemptionData: "https://www.neo.com.lb/english/home",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon (app + Bank Audi ATMs)",
    sourceUrl: "https://www.neo.com.lb/english/home",
  },
  {
    companyName: "BLOM Bank NEXT",
    title: "Youth prepaid card + in-app partner discounts (ages 12–25)",
    category: "finance",
    description:
      "NEXT is BLOM’s youth program: reloadable prepaid card (max USD 500), NEXT app (spend tracking, Alfa/touch recharge, P2P between NEXT cards, ATM send), and exclusive partner discounts inside the app. Annual fee on the retail page: LBP 200,000 or USD 15 depending on card currency.",
    eligibility:
      "Ages 12–25. This is an age-based youth product, not a university-enrollment check. Ages 12–18 must visit a BLOM branch with a guardian. Download the NEXT app and join, or apply at a BLOM branch.",
    redemptionType: "link",
    redemptionData: "https://www.blomretail.com/nextprogram",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon",
    sourceUrl: "https://www.blomretail.com/nextprogram",
  },
  {
    companyName: "ISIC (GTS Alive Middle East)",
    title: "International Student Identity Card — Lebanon issuer",
    category: "services",
    description:
      "UNESCO-endorsed since 1968 as proof of student status. GTS Alive Middle East is ISIC’s Appointed Office for Lebanon (isic.org) and the regional issuer (GTS). GTS/Bank of Beirut advertise 150,000+ benefits; isic.org documents discounts in 100+ countries. Local 2026 GTS partnerships include ALLO Taxi/Bus, Falafel Abou Andre, and noknok. Digital ISIC is used in the Alive app after issuance. Bank of Beirut issues combined Visa+ISIC student cards at campus booths (NDU, USEK). mystudentcard.org’s self-serve shop does not currently list Lebanon — apply via Bank of Beirut or GTS Alive ME.",
    eligibility:
      "Currently studying full-time at high school, college, or university. Typical documents: passport-style photo, government ID, and current full-time enrollment proof. Physical/bank-issued cards are processed at Bank of Beirut campus activations or via GTS Alive.",
    redemptionType: "link",
    redemptionData: "https://www.isic.org/",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon + 100+ countries",
    sourceUrl: "https://www.isic.org/about/members/",
  },
  {
    companyName: "ALLO Taxi",
    title: "ISIC exclusive mobility benefits (Taxi + Bus)",
    category: "services",
    description:
      "ALLO Taxi partnered with ISIC in 2026 to give ISIC cardholders exclusive mobility benefits on ALLO Taxi and ALLO Bus across Lebanon. Exact rates are not on a public fare card — check the live ISIC offer before riding. Partnership go-live was announced 22 Jun 2026.",
    eligibility:
      "Must hold a valid ISIC (physical or virtual) issued for the current academic year. Show the card/app QR as instructed by ALLO at booking or boarding.",
    redemptionType: "show_id",
    redemptionData:
      "Present a valid ISIC in the ALLO Taxi app or to the driver/bus staff. Confirm the current partner offer in the ISIC discounts map before travel.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon",
    sourceUrl: "https://www.linkedin.com/posts/allotaxi-lb_allotaxi-isic-studentmobility-activity-7474761304394850304-p1PJ",
  },
  {
    companyName: "Falafel Abou Andre",
    title: "ISIC exclusive dining offers",
    category: "food",
    description:
      "Named an official ISIC Lebanon partner in July 2026. ISIC cardholders receive special benefits on Falafel Abou Andre orders. Confirm the live percentage in the ISIC partner listing before ordering — the public announcement does not freeze a single rate.",
    eligibility:
      "Valid ISIC required. Present the card or ISIC app offer at order/checkout.",
    redemptionType: "show_id",
    redemptionData:
      "Show a valid ISIC when ordering at Falafel Abou Andre, or follow the live ISIC partner instructions.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Lebanon (brand locations)",
    sourceUrl: "https://www.linkedin.com/posts/alikrayemofficial_were-excited-to-welcome-falafel-abou-andre-activity-7478441037070434305-h58G",
  },
  {
    companyName: "noknok",
    title: "ISIC exclusive offers on orders",
    category: "food",
    description:
      "ISIC announced a strategic partnership with noknok (May 2026) so cardholders get exclusive offers on orders. Check the ISIC app for the current promo before checkout.",
    eligibility:
      "Valid ISIC required. Apply the live ISIC–noknok offer in the noknok app or at checkout as instructed.",
    redemptionType: "show_id",
    redemptionData:
      "Open the ISIC discounts listing for noknok and apply the current partner offer at checkout.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide delivery, Lebanon",
    sourceUrl: "https://www.linkedin.com/posts/alikrayemofficial_we-are-pleased-to-announce-a-new-strategic-activity-7462830760345997312-va_1",
  },
  {
    companyName: "Bank of Beirut",
    title: "Campus Visa + ISIC digital student card",
    category: "finance",
    description:
      "Bank of Beirut, Visa, and ISIC issued a combined university ID / digital Visa / ISIC product so students can pay locally and abroad and tap the global ISIC+Visa privilege network (advertised as 150,000+ benefits in 114 countries). On-campus activation events have run at NDU and USEK; ask Student Affairs or Bank of Beirut whether your campus is in the current rollout — booths are periodic, not a year-round desk.",
    eligibility:
      "Currently documented for NDU and USEK campus activations. Bring university ID and KYC documents to the Bank of Beirut booth or branch as instructed by the university.",
    redemptionType: "show_id",
    redemptionData:
      "Visit the Bank of Beirut ISIC activation booth on campus (NDU / USEK) or a Bank of Beirut branch and ask for the student Visa+ISIC card.",
    isGlobal: false,
    applicableUniversities: ["NDU", "USEK"],
    locationOrArea: "NDU Zouk Mosbeh; USEK Kaslik; Bank of Beirut branches",
    sourceUrl: "https://www.bankofbeirut.com",
  },

  // ---------------------------------------------------------------------------
  // Campus-exclusive: AUB, LAU, USJ, USEK, RHU (official university sources)
  // ---------------------------------------------------------------------------
  {
    companyName: "AUB Charles Hostler Student Center",
    title: "Free gym, pool, and sports facilities for registered students",
    category: "services",
    description:
      "Registered AUB students may use Charles Hostler Student Center facilities (fitness center, gymnasium, pool, and related sports spaces) without an extra membership fee. Paid memberships apply to employees, alumni, and guests. Student programs have evening priority on some courts/gym times.",
    eligibility:
      "Must be a currently registered AUB student. A current valid AUB student ID is required at entry. Not open to other universities’ students under this waiver.",
    redemptionType: "show_id",
    redemptionData: "Present a current AUB student ID at Charles Hostler Student Center.",
    isGlobal: false,
    applicableUniversities: ["AUB"],
    locationOrArea: "Ras Beirut / Hamra, Beirut",
    sourceUrl: "https://www.aub.edu.lb/SAO/sports/Pages/Membership.aspx",
  },
  {
    companyName: "LAU Cinema Club",
    title: "Weekly free film screenings (Beirut campus)",
    category: "entertainment",
    description:
      "LAU’s Cinema Club screens a film weekly on the Beirut campus; all LAU students can attend for free. Some screenings are followed by a discussion. This is a student-club program, not a commercial cinema discount — dates and titles change each semester. Check the club’s campus posts or Student Life for the current slot.",
    eligibility:
      "Current LAU students. Not listed as open to other universities.",
    redemptionType: "show_id",
    redemptionData:
      "Attend with a current LAU ID. Club listing: https://www.lau.edu.lb/experience/clubs/",
    isGlobal: false,
    applicableUniversities: ["LAU"],
    locationOrArea: "LAU Beirut campus",
    sourceUrl: "https://www.lau.edu.lb/experience/clubs/",
  },
  {
    companyName: "USJ Carte Privilège",
    title: "Official 2025–2026 partner discount program",
    category: "services",
    description:
      "USJ’s student-initiated Carte Privilège (run by Service de la vie étudiante, with HDF, CNDJ, and CSG as partners) publishes a monthly PDF of exclusive discounts for USJ students, faculty, staff, alumni, CNDJ/CSG alumni, and HDF doctors/hospital-network staff. Covers F&B, gyms, hotels, beauty, and retail. Updated via the Carte Privilège WhatsApp channel. Contact cp.sve@usj.edu.lb or 71 856 242.",
    eligibility:
      "Present a valid USJ, HDF, or CNDJ card (the published redemption line). CSG appears on the live hub as a partner — confirm CSG eligibility at redemption. Offers are not valid with a generic university ID from another school. Read each partner’s conditions in the current monthly PDF.",
    redemptionType: "show_id",
    redemptionData: "Present your USJ (or HDF/CNDJ/CSG) card. Program hub: https://usj.edu.lb/carte-privilege/",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Greater Beirut, campuses, and listed partner sites",
    sourceUrl: "https://usj.edu.lb/carte-privilege/",
  },
  {
    companyName: "F45 Training",
    title: "Student unlimited: $165/month or $450/3 months (USJ)",
    category: "services",
    description:
      "USJ Carte Privilège 2025–2026 exclusive: student unlimited membership $165/month (was $220) or $450 for 3 months (was $565) at Achrafieh, Verdun, and Dbayeh. Includes a 1-week trial, unlimited classes, nutrition plan, and F45 app access. Employee/alumni rates are higher ($185 / $480).",
    eligibility:
      "USJ students presenting Carte Privilège / USJ ID. Quote is from the official 2025–2026 list; confirm at the studio before paying.",
    redemptionType: "show_id",
    redemptionData:
      "Show USJ Carte Privilège at F45 Achrafieh, Verdun, or Dbayeh (81 814 545 / 03 745 845).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Achrafieh, Verdun, Dbayeh",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Pizzanini",
    title: "15% off all branches (USJ / HDF delivery)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026: 15% at all Pizzanini branches for dine-in, takeaway, and delivery. Deliveries under this offer can be sent only to USJ, Hôtel-Dieu de France, and HDF network hospitals. Order via 1570.",
    eligibility:
      "Present USJ / HDF Carte Privilège. Delivery restriction: USJ or HDF sites only.",
    redemptionType: "show_id",
    redemptionData: "Call 1570 and present USJ/HDF card. Delivery limited to USJ and HDF hospitals.",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "All Pizzanini branches; delivery to USJ / HDF only",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Crepaway",
    title: "20% dine-in / 15% delivery (Achrafieh, USJ card)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026: Achrafieh branch only — 20% dine-in and 15% delivery, with a maximum reduction of LBP 600,000 on the bill. Phone 01 745 845.",
    eligibility:
      "USJ Carte Privilège. Achrafieh location only for this listed rate.",
    redemptionType: "show_id",
    redemptionData: "Present USJ card at Crepaway Achrafieh (01 745 845).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Achrafieh, Beirut",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Burger King",
    title: "20% off via BK Lebanon app (promo HDF20)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026: 20% at Burger King when ordering through the BK Lebanon app with promo code HDF20 (dine-in, delivery, takeaway). Discounts are not valid on promotional items (June 2026 list). Not a nationwide student-ID deal for other universities.",
    eligibility:
      "USJ Carte Privilège / affiliated HDF–CNDJ cardholders. Order in the BK Lebanon app — this is not a walk-up counter deal.",
    redemptionType: "promo_code",
    redemptionData: "HDF20 — apply in the BK Lebanon app when ordering (dine-in, delivery, or takeaway).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Lebanon Burger King branches (as honored)",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Billy Boyz",
    title: "25% off dine-in, all branches (USJ)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026: 25% at all Billy Boyz branches, dine-in only.",
    eligibility:
      "Present USJ Carte Privilège. Dine-in only.",
    redemptionType: "show_id",
    redemptionData: "Show USJ card at any Billy Boyz branch (dine-in only).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "All Billy Boyz branches, Lebanon",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "iStyle",
    title: "5% off Mac (students, Middle East stores)",
    category: "tech",
    description:
      "USJ Carte Privilège 2025–2026: 5% on Mac at iStyle stores across the Middle East, marked for students only. Contact Baabda: 71 999 618.",
    eligibility:
      "USJ students presenting Carte Privilège. Listed as students-only; confirm at iStyle before purchase.",
    redemptionType: "show_id",
    redemptionData: "Present USJ student/Carte Privilège ID at iStyle (Baabda 71 999 618).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "iStyle stores, Middle East (listed from Baabda)",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Chill Lounge",
    title: "30% off entrance packages (Beirut Souks, USJ)",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: 30% on all entrance packages at Chill Lounge, Beirut Souks — hangout space with board games, sofas, art corner, and bookable rooms. Phone 81 818 636. Confirm the live package list at the door.",
    eligibility:
      "Present USJ / HDF / CNDJ (or CSG) Carte Privilège.",
    redemptionType: "show_id",
    redemptionData: "Show USJ Carte Privilège at Chill Lounge, Beirut Souks (81 818 636).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Beirut Souks",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "SuperHeated Neurons",
    title: "15% off board games (promo USJ15)",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: 15% on SuperHeated Neurons (Catan, Carcassonne, Azul, and other titles they distribute) with promo code USJ15 on the website. Lebanese office in Monte Verde, Metn.",
    eligibility:
      "USJ community via the published Carte Privilège code. Apply USJ15 at checkout on superheatedneurons.com.",
    redemptionType: "promo_code",
    redemptionData: "USJ15 — apply on superheatedneurons.com (confirm the live code in the current Carte Privilège PDF).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Online / Monte Verde, Metn",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Panic Zones",
    title: "15% off (PZ-USJ15) + extra on bundles",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: 15% on every Panic Zones order (PZ games and caps) and 20%+ savings on bundles with promo code PZ-USJ15, any order size on the website.",
    eligibility:
      "USJ community via the published code. Use PZ-USJ15 at checkout.",
    redemptionType: "promo_code",
    redemptionData: "PZ-USJ15 — apply on the Panic Zones website (confirm the live code in the current Carte Privilège PDF).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Online",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Fun Zone",
    title: "Playground + Zahle water park discounts (USJ)",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: Fun Zone playgrounds — 25% off entrance at Rayfoun; US$11 instead of US$14 at Antelias; US$12 instead of US$15 at Monteverde (indoor/outdoor slides, games, birthday space). Fun Zone water park Zahle is listed at 25% (81 555 305). Phones: Rayfoun 71 081 555, Antelias 71 341 711, Monteverde 71 968 333. Confirm today’s door price before paying.",
    eligibility:
      "Present USJ Carte Privilège. Quote is from the official 2025–2026 list.",
    redemptionType: "show_id",
    redemptionData:
      "Show USJ card at Fun Zone Rayfoun / Antelias / Monteverde, or Fun Zone water park Zahle (81 555 305).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Rayfoun, Antelias, Monteverde; water park Zahle",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Ludo Board Game Café",
    title: "15% off (Deir el Qamar, USJ)",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: 15% at Ludo Board Game Café, Deir el Qamar, Chouf (71 844 138).",
    eligibility:
      "Present USJ Carte Privilège.",
    redemptionType: "show_id",
    redemptionData: "Show USJ card at Ludo Board Game Café, Deir el Qamar (71 844 138).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Deir el Qamar, Chouf",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Wildlife Taxidermy Museum",
    title: "Kids entrance price at Bnachii Lake (USJ)",
    category: "entertainment",
    description:
      "USJ Carte Privilège 2025–2026: cardholders pay the kids entrance price at the Wildlife Taxidermy Museum / Bnachii Lake (06 550 500). Confirm today’s adult vs kids tariff at the gate — the PDF does not freeze a dollar figure.",
    eligibility:
      "Present USJ / HDF / CNDJ (or CSG) Carte Privilège.",
    redemptionType: "show_id",
    redemptionData: "Show USJ card at Wildlife Taxidermy Museum, Bnachii Lake (06 550 500).",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Bnachii Lake",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "USEK Marketing Office",
    title: "Official campus promotional offers list",
    category: "services",
    description:
      "USEK publishes an official partner table (restaurants, health/beauty, hotels, apps) for students and, in some rows, staff. Offers change; always re-check the Marketing Office page for the current academic year.",
    eligibility:
      "USEK student ID (some partners also accept staff). Each partner sets its own hours and exclusions.",
    redemptionType: "show_id",
    redemptionData: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Kaslik / Jounieh corridor and listed partner sites",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "La Crêperie",
    title: "15% off final bill Mon–Thu (USEK ID)",
    category: "food",
    description:
      "Official USEK promotional offer: 15% on the final bill for USEK ID holders, Monday through Thursday, excluding events and holidays, for the current academic year. Location: Kaslik–Sarba.",
    eligibility:
      "Must show a USEK student ID. Not valid Friday–Sunday, events, or holidays.",
    redemptionType: "show_id",
    redemptionData: "Present USEK ID at La Crêperie Kaslik–Sarba, Monday–Thursday.",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Kaslik–Sarba",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Poule D'or",
    title: "30% off dine-in and takeaway (Jounieh)",
    category: "food",
    description:
      "Official USEK promotional offer: 30% discount on takeaway and dine-in meals at the Jounieh branch.",
    eligibility:
      "Listed on USEK’s student promotional offers page — present USEK ID at the Jounieh branch.",
    redemptionType: "show_id",
    redemptionData: "Present USEK ID at Poule D'or Jounieh.",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Jounieh",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Senses Health Gym",
    title: "20% off membership (USEK students and staff)",
    category: "services",
    description:
      "Official USEK promotional offer: 20% discount on membership for all USEK students and staff. Phone 71 112 388.",
    eligibility:
      "USEK students and staff. Show university ID at registration.",
    redemptionType: "show_id",
    redemptionData: "Present USEK ID at Senses Health Gym (71 112 388).",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Kaslik area (confirm studio address when booking)",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Rooster",
    title: "10% dine-in (Adma, USEK)",
    category: "food",
    description:
      "Official USEK promotional offer: 10% discount, dine-in only, at Rooster Adma.",
    eligibility:
      "Present USEK ID. Dine-in only.",
    redemptionType: "show_id",
    redemptionData: "Present USEK ID at Rooster Adma for dine-in.",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Adma",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Fitness Zone",
    title: "15% off card/check memberships (USEK)",
    category: "services",
    description:
      "Official USEK promotional offer: Fitness Zone accepts LBP at the listed 2,250 rate for open-end (monthly) and 6-month memberships. Dollar payments by credit card or check get 15% off. Kaslik 09-222770; also Baabda, Hamra, Achrafieh, Verdun, Dbayeh, Manara.",
    eligibility:
      "Listed for USEK students — present USEK ID and confirm the current FX/card rule at the desk before paying.",
    redemptionType: "show_id",
    redemptionData:
      "Present USEK ID at Fitness Zone (Kaslik 09-222770 / www.fitnesszone-lb.com). Ask whether you are paying LBP monthly/6-month or USD card/check for the 15% off.",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Kaslik, Baabda, Hamra, Achrafieh, Verdun, Dbayeh, Manara",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "CITYKART",
    title: "30% off go-kart tickets (Citymall, USEK)",
    category: "entertainment",
    description:
      "Official USEK promotional offer: 30% off CITYKART tickets at Citymall, 1st floor. Confirm the discount at the counter before paying (Citymall’s own page does not list a student rate). CityKart direct: 76 55 11 66 (USEK’s listing still shows 01 905 550, which looks like the mall switchboard).",
    eligibility:
      "Present USEK student ID. Confirm exclusions at the counter.",
    redemptionType: "show_id",
    redemptionData: "Show USEK ID at CITYKART, Citymall L1 (76 55 11 66).",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Citymall, 1st floor",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Sanita",
    title: "25% off website products (USEK promo)",
    category: "services",
    description:
      "Official USEK promotional offer: 25% on Sanita ServU website products with promo code usek25. Create an account on sanitaservu.com (approval can take 24–48 hours). USEK PDFs also list a $200 minimum, campus/branch pickup (not home delivery), and that card payment can cancel the promo. Phone 09 477 479 / 09 209 000 ext. 4726.",
    eligibility:
      "USEK community via the published code. Create a Sanita ServU account and apply usek25 at checkout after approval.",
    redemptionType: "promo_code",
    redemptionData: "usek25 — apply on https://www.sanitaservu.com after creating an approved account. Confirm $200 minimum and pickup rules before ordering.",
    isGlobal: false,
    applicableUniversities: ["USEK"],
    locationOrArea: "Online / Sanita Lebanon",
    sourceUrl: "https://www.usek.edu.lb/en/marketing-office/promotional-offers",
  },
  {
    companyName: "Rafik Hariri University",
    title: "Official student, faculty, and staff partner discounts",
    category: "services",
    description:
      "RHU publishes an official Offers & Discounts page: Kempinski Summerland (F&B and massage) and Le Commodore Hotel (F&B) for students, faculty, and staff; plus student-only local deals in Saida (Escape Hour, Al Capone, Yamout Group, Rashet Somsom). Amounts for the hotel rows are not listed — ask at the venue with your RHU ID.",
    eligibility:
      "Current RHU ID. Hotel rows also cover faculty and staff; the Saida merchant rows are listed for students.",
    redemptionType: "show_id",
    redemptionData: "Present a current RHU ID. Hub: https://www.rhu.edu.lb/offers-discounts",
    isGlobal: false,
    applicableUniversities: ["RHU"],
    locationOrArea: "Mechref campus; Saida merchants; Beirut hotels as listed",
    sourceUrl: "https://www.rhu.edu.lb/offers-discounts",
  },
  {
    companyName: "Escape Hour",
    title: "20% off (RHU students, Saida)",
    category: "entertainment",
    description:
      "Official RHU student offer: 20% at Escape Hour Saida (escape rooms). RHU’s page still lists this as of Sep 2026, but the venue’s own website/socials appear inactive — confirm with RHU Student Affairs and call ahead before going.",
    eligibility:
      "Present a current RHU student ID.",
    redemptionType: "show_id",
    redemptionData: "Show RHU ID at Escape Hour Saida.",
    isGlobal: false,
    applicableUniversities: ["RHU"],
    locationOrArea: "Saida",
    sourceUrl: "https://www.rhu.edu.lb/offers-discounts",
  },
  {
    companyName: "Al Capone Restaurant",
    title: "20% off (RHU students, Saida)",
    category: "food",
    description:
      "Official RHU student offer: 20% at Al Capone Restaurant, Saida.",
    eligibility:
      "Present a current RHU student ID.",
    redemptionType: "show_id",
    redemptionData: "Show RHU ID at Al Capone Restaurant, Saida.",
    isGlobal: false,
    applicableUniversities: ["RHU"],
    locationOrArea: "Saida",
    sourceUrl: "https://www.rhu.edu.lb/offers-discounts",
  },
  {
    companyName: "Yamout Group",
    title: "30% off optical frames and sunglasses (RHU)",
    category: "services",
    description:
      "Official RHU student offer: 30% on all optical frames and sunglasses at Yamout Group.",
    eligibility:
      "Present a current RHU student ID. Confirm exclusions (lenses, branded promo items) at the counter.",
    redemptionType: "show_id",
    redemptionData: "Show RHU ID at Yamout Group.",
    isGlobal: false,
    applicableUniversities: ["RHU"],
    locationOrArea: "Yamout Group (confirm branch when booking)",
    sourceUrl: "https://www.rhu.edu.lb/offers-discounts",
  },
  {
    companyName: "Rashet Somsom",
    title: "10% off (RHU students, Saida)",
    category: "food",
    description:
      "Official RHU student offer: 10% at Rashet Somsom, Saida, plus stacking on in-house deals when the invoice meets the shop’s minimum. The university page still quotes old LBP floors (10,000 LP minimum / 20,000 LP pizza combo) — treat those numbers as stale and confirm today’s minimum at the counter.",
    eligibility:
      "Present a current RHU student ID.",
    redemptionType: "show_id",
    redemptionData: "Show RHU ID at Rashet Somsom, Saida. Confirm the current invoice minimum.",
    isGlobal: false,
    applicableUniversities: ["RHU"],
    locationOrArea: "Saida",
    sourceUrl: "https://www.rhu.edu.lb/offers-discounts",
  },
  {
    companyName: "Qatar Airways",
    title: "Student Club (Privilege Club, ages 18–30)",
    category: "services",
    description:
      "Global Qatar Airways Student Club (powered by Privilege Club): Special Fares (typically 10% / 15% / 20% off on a limited number of bookings), extra baggage on many QR-operated routes, Avios, and a graduation tier upgrade if you fly at least once per membership year then graduate. Join with SheerID; membership is typically up to 4 years from join (yearly re-verify). Online degrees are excluded. Separate from the USJ Carte Privilège enrollment code.",
    eligibility:
      "Ages 18–30, enrolled at an accredited college or university. Complete Qatar Airways’ form, then SheerID (upload current enrollment proof if asked). Account country/payment should match where you book.",
    redemptionType: "link",
    redemptionData: "https://www.qatarairways.com/en-ae/student-club.html",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.qatarairways.com/en-ae/student-club.html",
  },
  {
    companyName: "Qatar Airways",
    title: "Student Club via USJ Carte Privilège promo",
    category: "services",
    description:
      "USJ Carte Privilège 2025–2026 instructs students to join Qatar Airways Student Club with enrollment promo code LBUSJSC for club offers. That code is for joining only — booking discounts use unique codes Qatar sends after SheerID verification. Confirm the current PDF / WhatsApp channel still lists LBUSJSC before using it.",
    eligibility:
      "USJ community via Carte Privilège. Qatar Airways Student Club itself is a global student product; this row is the USJ-gated enrollment path.",
    redemptionType: "promo_code",
    redemptionData:
      "LBUSJSC — join at https://www.qatarairways.com/en/Privilege-Club/student-club-join-now.html?promoCode=LBUSJSC with a valid student email/ID as Qatar Airways requires. Confirm the code still appears in the current Carte Privilège PDF.",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Online",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
];
