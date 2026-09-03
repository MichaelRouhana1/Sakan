/**
 * Verified student discounts / perks for Lebanese university students.
 * Researched 3 Sep 2026 from official vendor, operator, bank, and university pages.
 *
 * Intentionally omitted (not currently usable by Lebanese university students):
 * - Spotify Premium Student — US Title IV institutions only (SheerID).
 * - Canva Education — K-12 teachers/students only; higher-ed is Canva for Campus (institutional).
 * - DigitalOcean GitHub Pack credits — wound down; remaining credits expired 31 Jul 2026.
 * - Cursor dedicated student plan — discontinued 25 Jun 2026.
 * - ChatGPT Plus / Amazon Prime Student — no official Lebanon-eligible student SKU found.
 * - Historic Hamra “show AUB ID” cafe lists (Roadster / Deek Duke / Burger King) —
 *   Beirut.com roundups, not currently confirmed by the brands.
 *
 * Local gym pages for “Lebanon, Ohio / Pennsylvania” were excluded.
 * Alfa’s weekday e-learning data bundle is a network-wide MEHE measure, not a student plan.
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
    title: "Free All Products Pack (Student license)",
    category: "tech",
    description:
      "Free 1-year license for the full JetBrains toolbox (IntelliJ IDEA Ultimate, PyCharm, WebStorm, CLion, Rider, DataGrip, and more). Renewable annually while enrolled. Educational licenses are for non-commercial educational use only. A 40% graduation discount is available for 2 years after the student license expires.",
    eligibility:
      "Full-time student (or vocational program ≥1 year) at a recognized institution. Apply with a school email, an ISIC card, or a GitHub Student Developer Pack account. As of July 2024 JetBrains no longer accepts standalone school documents.",
    redemptionType: "link",
    redemptionData: "https://www.jetbrains.com/shop/eform/students",
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
      "No credit card required. $100 Azure credit to use within 12 months, plus monthly free amounts of 20+ popular services (new customers) and 65+ always-free services. Renewable annually while you remain a student. Also unlocks Azure Dev Tools for Teaching downloads via the Education Hub. For ages 18+; a separate no-card offer exists for ages 13–17.",
    eligibility:
      "Full-time university students aged 18+. Sign up with a recognized school email (typically .edu.lb or the university’s Microsoft tenant domain). Renew yearly while enrolled.",
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
      "Students at Microsoft-qualified institutions can get Office 365 A1 at no cost: web versions of Word, Excel, PowerPoint, Outlook, OneNote, plus Teams. Desktop Office apps are included only if the university assigns A3/A5 (or Student Use Benefit) licenses — check with campus IT. Eligibility can be re-verified at any time.",
    eligibility:
      "Requires an eligible education email whose domain Microsoft recognizes as a qualified academic institution. A .edu.lb address is not an automatic guarantee; AUB, LAU, USJ and most MEHE-accredited privates typically provision this via campus IT.",
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
      "Individual students get a free Plus-equivalent Education plan: unlimited pages/blocks, file uploads, site publishing features, and 30-day version history. Re-verify once a year with the school email. Student-led orgs at verified institutions can apply separately for a free multi-member org workspace.",
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
      "Photoshop, Illustrator, Premiere Pro, Acrobat Pro, Firefly, and 20+ apps at education pricing. Adobe’s US store advertises $19.99/mo for the first year then $39.99/mo (annual billed monthly); Lebanon store price may differ. Also includes a 60% student discount on Adobe Professional certifications. First-time education customers only; 12-month commitment.",
    eligibility:
      "Students 13+ at an accredited institution, or teachers. Adobe verifies status (typically SheerID) and may request a current class schedule, tuition receipt, or enrollment letter. Buy directly from Adobe’s education store — not resellers.",
    redemptionType: "link",
    redemptionData: "https://www.adobe.com/creativecloud/buy/students.html",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://www.adobe.com/creativecloud/buy/students/explore/ccforstudents.html",
  },
  {
    companyName: "Autodesk",
    title: "Free 1-year Education access (AutoCAD, Revit, Maya, Fusion, and more)",
    category: "tech",
    description:
      "Eligible students get free single-user educational licenses for the full Education Community catalog (AutoCAD, Revit, Inventor, Fusion, Maya, 3ds Max, Civil 3D, and others). Access lasts one year and is renewable while eligible. Strictly for educational purposes — commercial/for-profit use is prohibited.",
    eligibility:
      "Enrolled at a qualified educational institution, meeting Autodesk’s minimum age. Sign up with a school email and complete Autodesk’s education verification; additional documents may be required. Renew from 30 days before expiry.",
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
      "Launched August 2026 on AWS Builder Center for verified higher-ed students worldwide. Completing SheerID verification and a Builder Center profile unlocks 12 months of Skill Builder Premium (~900 courses/labs). Earn badges for $10 then $20 in AWS credits, then an AWS Foundational certification exam voucher ($100 value).",
    eligibility:
      "Age 18+, enrolled at an accredited higher-education institution. Verify via SheerID on AWS Builder Center (university email or student ID as requested). Subject to AWS Student Rewards terms.",
    redemptionType: "link",
    redemptionData: "https://community.aws/",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://aws.amazon.com/blogs/aws/aws-weekly-roundup-student-rewards-on-aws-builder-center-local-zone-in-las-vegas-and-more-august-24-2026/",
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
      "Verified university students can subscribe to Apple Music at the discounted student rate for up to 48 months, with yearly re-verification. Apple’s Lebanon support page documents this offer. Verification is handled by SheerID or UNiDAYS depending on the flow.",
    eligibility:
      "Must be studying an associate, bachelor’s, postgraduate, or equivalent higher-education course. Have student ID and student email ready. Open Apple Music → Home → Student → Verify Eligibility, or start at music.apple.com/student.",
    redemptionType: "link",
    redemptionData: "https://music.apple.com/student",
    isGlobal: true,
    applicableUniversities: ["ALL"],
    locationOrArea: "Online",
    sourceUrl: "https://support.apple.com/en-lb/106008",
  },

  // ---------------------------------------------------------------------------
  // Lebanon-wide: telecom, banks, national student card
  // ---------------------------------------------------------------------------
  {
    companyName: "Alfa",
    title: "A+ $5 / A+ Max $15 university prepaid plans",
    category: "telecom",
    description:
      "Student prepaid (also offered postpaid): A+ is $5/month with 180 local minutes, 1,000 SMS, 5 GB data, unlimited Wikipedia and LinkedIn, and Clip Alert. A+ Max is $15/month with 240 minutes, 1,000 SMS, and 40 GB data (remaining data rolls over one month on prepaid). Prices exclude VAT. Line auto-reverts to regular prepaid/postpaid when you leave the eligibility list.",
    eligibility:
      "University students aged 25 or under. Your university administration must enroll your Alfa number on the official A+ list. Student ID is required during SMS subscription. Not a walk-in store plan.",
    redemptionType: "promo_code",
    redemptionData:
      "Ask your university to list your Alfa number. After the enrollment SMS, send AA+ (or AA+Max) plus your student ID to 1028, or dial *111#. Prepaid A+ Max requires an Alfa Prepaid line.",
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
      "Prepaid University Student Plan 1: $5 per 30 days (VAT excluded) with 5 GB data, 60 local minutes, 180 on-campus minutes, 300 preferred-number minutes, 300 MB WhatsApp, and 440 SMS. Plan 2 is listed at $17 / 30 days via the same switch. PAYG data after the bundle is $0.01/MB. Only magic lines can switch, once every 30 days.",
    eligibility:
      "Must not exceed 25 years old. Eligibility is confirmed by your university — check with student affairs before switching. Switch from a magic prepaid line in the touch self-care app (minimum $5 or $17 credit depending on plan).",
    redemptionType: "link",
    redemptionData:
      "Download the touch self-care app → Student Plan, after your university confirms eligibility.",
    isGlobal: false,
    applicableUniversities: ["ALL"],
    locationOrArea: "Nationwide, Lebanon",
    sourceUrl: "https://www.touch.com.lb/autoforms/portal/touch/personal/prepaid/studentplan",
  },
  {
    companyName: "Bank Audi neo",
    title: "Free banking for university students",
    category: "finance",
    description:
      "neo (Bank Audi’s digital bank) advertises free banking for university students: open Fresh LBP and USD accounts at no cost, multicurrency accounts (LBP, USD, EUR, GBP, SAR, AED), digital debit card, QR statements for embassy use, and cardless cash-in/out at 200+ Bank Audi ATMs. Entry package is free (cardless). Standard package with a physical card is $1.99/month.",
    eligibility:
      "Sign up in the neo app with a Lebanese mobile number plus national ID or passport. Marketed specifically to university students; KYC is ID-based rather than a .edu.lb check.",
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
      "NEXT is BLOM’s youth program: reloadable prepaid card (max USD 500), NEXT app (spend tracking, Alfa/touch recharge, P2P between NEXT cards, ATM send), and a rotating list of partner discounts inside the app (the public page currently lists examples such as 15% off a listed membership fee). Issuance fees on the retail page: LBP 200,000 or USD 15 depending on card currency.",
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
      "UNESCO-recognized proof of student status. GTS Alive Middle East is the official ISIC issuer for Lebanon. The card unlocks 150,000+ discounts in 100+ countries plus local 2026 partners (ALLO Taxi/Bus, Falafel Abou Andre, noknok). A virtual ISIC can be ordered online; Bank of Beirut also issues combined Visa+ISIC student cards at campus booths (NDU, USEK).",
    eligibility:
      "Currently studying full-time at high school, college, or university. Online virtual card requires enrollment proof less than 2 months old, ID, and a passport-style photo. Physical/bank-issued cards are processed at Bank of Beirut campus activations or via GTS Alive.",
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
      "ALLO Taxi partnered with ISIC in 2026 to give ISIC cardholders exclusive benefits on ALLO Taxi and ALLO Bus across Lebanon. Exact fare-off percentages are published to cardholders in the ISIC partner app/map rather than a public rate card — check the live ISIC offer before riding.",
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
    sourceUrl: "https://www.linkedin.com/in/alikrayemofficial",
  },
  {
    companyName: "Bank of Beirut",
    title: "Campus Visa + ISIC digital student card",
    category: "finance",
    description:
      "Bank of Beirut, Visa, and ISIC issued a combined university ID / digital Visa / ISIC product so students can pay locally and abroad and tap the global ISIC+Visa privilege network (advertised as 150,000+ benefits in 114 countries). On-campus activation booths have run at NDU and USEK; ask Student Affairs or Bank of Beirut whether your campus is in the current rollout.",
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
  // Campus-exclusive: AUB, USJ, USEK (official university sources)
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
    companyName: "USJ Carte Privilège",
    title: "Official 2025–2026 partner discount program",
    category: "services",
    description:
      "USJ’s student-run Carte Privilège (with HDF and CNDJ/CSG) publishes a monthly PDF of exclusive discounts for USJ students, faculty, staff, alumni, and Hôtel-Dieu staff. Covers F&B, gyms, hotels, beauty, and retail. Updated via the Carte Privilège WhatsApp channel. Contact cp.sve@usj.edu.lb or 71 856 242.",
    eligibility:
      "Must hold a USJ / HDF / CNDJ (or CSG) card. Offers are not valid with a generic university ID from another school. Read each partner’s conditions in the current monthly PDF.",
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
    title: "20% off (USJ Carte Privilège)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026 lists Burger King at 20% for cardholders. Confirm exclusions (combos/promos) at the counter — the PDF does not list further fine print.",
    eligibility:
      "Present a valid USJ Carte Privilège. Not a nationwide student-ID deal for other universities.",
    redemptionType: "show_id",
    redemptionData: "Show USJ Carte Privilège at Burger King checkout.",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Lebanon Burger King branches (as honored)",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
  {
    companyName: "Billy Boyz",
    title: "25% off all branches (USJ)",
    category: "food",
    description:
      "USJ Carte Privilège 2025–2026: 25% at all Billy Boyz branches for cardholders.",
    eligibility:
      "Present USJ Carte Privilège.",
    redemptionType: "show_id",
    redemptionData: "Show USJ card at any Billy Boyz branch.",
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
    companyName: "Qatar Airways",
    title: "Student Club via USJ Carte Privilège promo",
    category: "services",
    description:
      "USJ Carte Privilège 2025–2026 instructs students to join Qatar Airways Student Club with a USJ promo code for exclusive student airfares and club offers. The live code is in the monthly PDF / WhatsApp channel, not a public static string.",
    eligibility:
      "USJ community via Carte Privilège. Qatar Airways Student Club itself is a global student product; this row is the USJ-gated enrollment path.",
    redemptionType: "promo_code",
    redemptionData:
      "Open the current USJ Carte Privilège PDF or WhatsApp channel, copy the Qatar Airways Student Club enrollment link/code, and join with a valid student email/ID as Qatar Airways requires.",
    isGlobal: false,
    applicableUniversities: ["USJ"],
    locationOrArea: "Online",
    sourceUrl: "https://usj.edu.lb/sites/usj/files/2026-03/liste-2025-2026.pdf",
  },
];
