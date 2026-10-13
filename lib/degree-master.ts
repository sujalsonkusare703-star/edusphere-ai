/**
 * Static degree catalogue for the profile page.
 *
 * GENERATED from audit/perplexity_brief/degree_master_list.csv (148 rows).
 * Columns: field_code, level_code, degree, full_name, typical_duration_years.
 * Profile dropdowns use only this list; they do not depend on database programme rows.
 */

export type DegreeRow = readonly [
  fieldCode: string,
  levelCode: string,
  degree: string,
  fullName: string,
  durationYears: string,
];

export const DEGREE_ROWS: readonly DegreeRow[] = [
  ["ENGINEERING", "DIPLOMA", "Diploma Engg", "Diploma in Engineering / Technology (Polytechnic, all branches)", "3"],
  ["ENGINEERING", "DIPLOMA", "Diploma Pharmacy", "D.Pharm", "2"],
  ["ENGINEERING", "DIPLOMA", "DSE Diploma", "Direct Second Year Diploma", "2"],
  ["ENGINEERING", "UG", "B.E.", "Bachelor of Engineering", "4"],
  ["ENGINEERING", "UG", "B.Tech", "Bachelor of Technology", "4"],
  ["ENGINEERING", "UG", "Direct Second Year B.E./B.Tech", "DSE B.E./B.Tech (diploma holders)", "3"],
  ["ENGINEERING", "UG", "B.Tech (Part-time)", "B.Tech / B.E. working professionals", "4"],
  ["ENGINEERING", "PG", "M.E.", "Master of Engineering", "2"],
  ["ENGINEERING", "PG", "M.Tech", "Master of Technology", "2"],
  ["ENGINEERING", "PG", "Integrated B.Tech+M.Tech", "Dual degree", "5"],
  ["COMPUTER_APPLICATIONS", "UG", "BCA", "Bachelor of Computer Applications", "3"],
  ["COMPUTER_APPLICATIONS", "UG", "B.Sc. Computer Science", "B.Sc. (Computer Science)", "3"],
  ["COMPUTER_APPLICATIONS", "UG", "B.Sc. IT", "B.Sc. (Information Technology)", "3"],
  ["COMPUTER_APPLICATIONS", "UG", "BCS", "Bachelor of Computer Science", "3"],
  ["COMPUTER_APPLICATIONS", "UG", "B.Sc. Data Science", "B.Sc. Data Science / AI", "3"],
  ["COMPUTER_APPLICATIONS", "PG", "MCA", "Master of Computer Applications", "2"],
  ["COMPUTER_APPLICATIONS", "PG", "M.Sc. Computer Science", "M.Sc. (Computer Science)", "2"],
  ["COMPUTER_APPLICATIONS", "PG", "M.Sc. IT", "M.Sc. (Information Technology)", "2"],
  ["COMPUTER_APPLICATIONS", "PG_DIPLOMA", "PGDCA", "PG Diploma in Computer Applications", "1"],
  ["SCIENCE", "UG", "B.Sc.", "B.Sc. (Physics, Chemistry, Maths, Statistics, Electronics, Geology, Geography, Environmental Science, Forensic Science, Home Science, Biochemistry, etc.)", "3"],
  ["SCIENCE", "UG", "B.Sc. (Honours)", "B.Sc. Honours", "3-4"],
  ["SCIENCE", "PG", "M.Sc.", "Master of Science (all subjects)", "2"],
  ["SCIENCE", "INTEGRATED", "Integrated M.Sc.", "Integrated M.Sc.", "5"],
  ["LIFE_SCIENCES", "UG", "B.Sc. Biotechnology", "B.Sc. Biotechnology", "3"],
  ["LIFE_SCIENCES", "UG", "B.Sc. Microbiology", "B.Sc. Microbiology", "3"],
  ["LIFE_SCIENCES", "UG", "B.Sc. Botany/Zoology", "B.Sc. Botany / Zoology / Life Sciences", "3"],
  ["LIFE_SCIENCES", "PG", "M.Sc. Biotechnology", "M.Sc. Biotechnology / Microbiology / Life Sciences", "2"],
  ["COMMERCE", "UG", "B.Com", "Bachelor of Commerce", "3"],
  ["COMMERCE", "UG", "B.Com (Accounting & Finance)", "B.Com Accounting & Finance", "3"],
  ["COMMERCE", "UG", "B.Com (Banking & Insurance)", "B.Com Banking & Insurance", "3"],
  ["COMMERCE", "UG", "B.Com (Computer Applications)", "B.Com Computer Applications", "3"],
  ["COMMERCE", "UG", "BAF", "Bachelor of Accounting & Finance", "3"],
  ["COMMERCE", "UG", "BBI", "Bachelor of Banking & Insurance", "3"],
  ["COMMERCE", "UG", "BFM", "Bachelor of Financial Markets", "3"],
  ["COMMERCE", "UG", "B.Com (Honours)", "B.Com Honours", "3-4"],
  ["COMMERCE", "PG", "M.Com", "Master of Commerce", "2"],
  ["MANAGEMENT_UG", "UG", "BBA", "Bachelor of Business Administration", "3"],
  ["MANAGEMENT_UG", "UG", "BBA (CA)", "BBA Computer Applications", "3"],
  ["MANAGEMENT_UG", "UG", "BMS", "Bachelor of Management Studies", "3"],
  ["MANAGEMENT_UG", "UG", "BBM", "Bachelor of Business Management", "3"],
  ["MANAGEMENT_UG", "UG", "BMS (Integrated)", "Integrated BBA+MBA", "5"],
  ["MANAGEMENT_PG", "PG", "MBA", "Master of Business Administration", "2"],
  ["MANAGEMENT_PG", "PG", "MMS", "Master of Management Studies", "2"],
  ["MANAGEMENT_PG", "PG", "PGDM", "Post Graduate Diploma in Management", "2"],
  ["MANAGEMENT_PG", "PG", "MBA (Executive)", "Executive MBA", "1-2"],
  ["ARTS_HUMANITIES", "UG", "B.A.", "Bachelor of Arts (all subjects)", "3"],
  ["ARTS_HUMANITIES", "UG", "B.A. (Honours)", "B.A. Honours", "3-4"],
  ["ARTS_HUMANITIES", "UG", "B.A. (Psychology)", "B.A. Psychology", "3"],
  ["ARTS_HUMANITIES", "PG", "M.A.", "Master of Arts (all subjects)", "2"],
  ["MEDIA_JOURNALISM", "UG", "BJMC", "Bachelor of Journalism & Mass Communication", "3"],
  ["MEDIA_JOURNALISM", "UG", "BMM", "Bachelor of Mass Media", "3"],
  ["MEDIA_JOURNALISM", "PG", "MJMC", "Master of Journalism & Mass Communication", "2"],
  ["SOCIAL_WORK", "UG", "BSW", "Bachelor of Social Work", "3"],
  ["SOCIAL_WORK", "PG", "MSW", "Master of Social Work", "2"],
  ["LIBRARY_SCIENCE", "UG", "B.Lib.I.Sc.", "Bachelor of Library & Information Science", "1"],
  ["LIBRARY_SCIENCE", "PG", "M.Lib.I.Sc.", "Master of Library & Information Science", "1"],
  ["LAW", "UG", "LL.B. (3 yr)", "LL.B. after graduation", "3"],
  ["LAW", "INTEGRATED", "B.A. LL.B.", "B.A. LL.B. (5 yr)", "5"],
  ["LAW", "INTEGRATED", "B.Com LL.B.", "B.Com LL.B.", "5"],
  ["LAW", "INTEGRATED", "BBA LL.B.", "BBA LL.B.", "5"],
  ["LAW", "INTEGRATED", "B.Sc. LL.B.", "B.Sc. LL.B.", "5"],
  ["LAW", "PG", "LL.M.", "Master of Laws", "1-2"],
  ["EDUCATION", "CERTIFICATE", "D.El.Ed.", "Diploma in Elementary Education (D.Ed.)", "2"],
  ["EDUCATION", "CERTIFICATE", "ECCEd", "Early Childhood Care & Education certificate", "1-2"],
  ["EDUCATION", "CERTIFICATE", "ATD", "Art Teacher Diploma", "1-2"],
  ["EDUCATION", "UG", "B.Ed.", "Bachelor of Education", "2"],
  ["EDUCATION", "UG", "B.El.Ed.", "Bachelor of Elementary Education", "4"],
  ["EDUCATION", "UG", "B.A.B.Ed. / B.Sc.B.Ed. (ITEP)", "Integrated 4-year teacher programmes", "4"],
  ["EDUCATION", "PG", "M.Ed.", "Master of Education", "2"],
  ["EDUCATION", "PG", "M.Ed. (Integrated)", "Integrated B.Ed.-M.Ed.", "3"],
  ["PHYSICAL_EDUCATION", "UG", "B.P.Ed.", "Bachelor of Physical Education", "3"],
  ["PHYSICAL_EDUCATION", "UG", "D.P.Ed.", "Diploma in Physical Education", "2"],
  ["PHYSICAL_EDUCATION", "PG", "M.P.Ed.", "Master of Physical Education", "2"],
  ["PHARMACY", "DIPLOMA", "D.Pharm", "Diploma in Pharmacy", "2"],
  ["PHARMACY", "UG", "B.Pharm", "Bachelor of Pharmacy", "4"],
  ["PHARMACY", "UG", "B.Pharm (Lateral)", "B.Pharm lateral entry", "3"],
  ["PHARMACY", "PG", "M.Pharm", "Master of Pharmacy", "2"],
  ["PHARMACY", "PROFESSIONAL_DOCTORATE", "Pharm.D", "Doctor of Pharmacy", "6"],
  ["PHARMACY", "PROFESSIONAL_DOCTORATE", "Pharm.D (Post Baccalaureate)", "Pharm.D PB", "3"],
  ["MEDICAL", "UG", "MBBS", "Bachelor of Medicine & Surgery", "5.5"],
  ["MEDICAL", "PG", "MD", "Doctor of Medicine", "3"],
  ["MEDICAL", "PG", "MS", "Master of Surgery", "3"],
  ["MEDICAL", "PG", "DNB", "Diplomate of National Board", "3"],
  ["MEDICAL", "PG", "PG Diploma (Medical)", "Post graduate diploma (DGO, DCH, DA etc.)", "2"],
  ["MEDICAL", "PROFESSIONAL_DOCTORATE", "DM", "Doctorate of Medicine (super-speciality)", "3"],
  ["MEDICAL", "PROFESSIONAL_DOCTORATE", "M.Ch.", "Master of Chirurgiae (super-speciality)", "3"],
  ["DENTAL", "UG", "BDS", "Bachelor of Dental Surgery", "5"],
  ["DENTAL", "PG", "MDS", "Master of Dental Surgery", "3"],
  ["AYUSH", "UG", "BAMS", "Bachelor of Ayurvedic Medicine & Surgery", "5.5"],
  ["AYUSH", "UG", "BHMS", "Bachelor of Homoeopathic Medicine & Surgery", "5.5"],
  ["AYUSH", "UG", "BUMS", "Bachelor of Unani Medicine & Surgery", "5.5"],
  ["AYUSH", "UG", "BNYS", "Bachelor of Naturopathy & Yogic Sciences", "5.5"],
  ["AYUSH", "UG", "BSMS", "Bachelor of Siddha Medicine & Surgery", "5.5"],
  ["AYUSH", "PG", "MD (Ayurved)", "MD / MS Ayurved", "3"],
  ["AYUSH", "PG", "MD (Homoeopathy)", "MD Homoeopathy", "3"],
  ["AYUSH", "PG", "MD (Unani)", "MD Unani", "3"],
  ["NURSING", "DIPLOMA", "ANM", "Auxiliary Nurse Midwife", "2"],
  ["NURSING", "DIPLOMA", "GNM", "General Nursing & Midwifery", "3"],
  ["NURSING", "UG", "B.Sc. Nursing", "B.Sc. Nursing", "4"],
  ["NURSING", "UG", "Post Basic B.Sc. Nursing", "PBBSc Nursing", "2"],
  ["NURSING", "PG", "M.Sc. Nursing", "M.Sc. Nursing", "2"],
  ["ALLIED_HEALTH", "UG", "BPT", "Bachelor of Physiotherapy", "4.5"],
  ["ALLIED_HEALTH", "UG", "BOTh", "Bachelor of Occupational Therapy", "4.5"],
  ["ALLIED_HEALTH", "UG", "BASLP", "Bachelor of Audiology & Speech-Language Pathology", "4"],
  ["ALLIED_HEALTH", "UG", "B.Sc. MLT", "B.Sc. Medical Laboratory Technology", "3"],
  ["ALLIED_HEALTH", "UG", "B.Optom", "Bachelor of Optometry", "4"],
  ["ALLIED_HEALTH", "UG", "B.Sc. Radiography", "B.Sc. Radiography / Imaging", "3"],
  ["ALLIED_HEALTH", "UG", "B.Sc. Allied Health", "Other B.Sc. Allied health (OT, dialysis, perfusion, etc.)", "3"],
  ["ALLIED_HEALTH", "UG", "BPMT", "Bachelor of Paramedical Technology", "3"],
  ["ALLIED_HEALTH", "PG", "MPT", "Master of Physiotherapy", "2"],
  ["ALLIED_HEALTH", "PG", "M.Sc. Allied Health", "M.Sc. Allied / Health sciences", "2"],
  ["ALLIED_HEALTH", "PG", "MPH", "Master of Public Health", "2"],
  ["AGRICULTURE", "DIPLOMA", "Diploma Agriculture", "Diploma in Agriculture / Horticulture / Dairy etc.", "2-3"],
  ["AGRICULTURE", "UG", "B.Sc. Agriculture", "B.Sc. (Hons.) Agriculture", "4"],
  ["AGRICULTURE", "UG", "B.Sc. Horticulture", "B.Sc. (Hons.) Horticulture", "4"],
  ["AGRICULTURE", "UG", "B.Sc. Forestry", "B.Sc. Forestry", "4"],
  ["AGRICULTURE", "UG", "B.Tech Agri Engg / Food Tech / Dairy / Biotech", "Agricultural-university B.Tech programmes", "4"],
  ["AGRICULTURE", "UG", "B.F.Sc.", "Bachelor of Fisheries Science", "4"],
  ["AGRICULTURE", "UG", "B.V.Sc. & A.H.", "Bachelor of Veterinary Science & Animal Husbandry", "5.5"],
  ["AGRICULTURE", "UG", "B.Sc. Community Science", "Community Science / Home Science (agri univ.)", "4"],
  ["AGRICULTURE", "PG", "M.Sc. Agriculture", "M.Sc. Agriculture (all subjects)", "2"],
  ["AGRICULTURE", "PG", "M.V.Sc.", "Master of Veterinary Science", "2"],
  ["AGRICULTURE", "PG", "M.Tech (Agri)", "M.Tech in agricultural streams", "2"],
  ["ARCHITECTURE", "UG", "B.Arch", "Bachelor of Architecture", "5"],
  ["ARCHITECTURE", "PG", "M.Arch", "Master of Architecture", "2"],
  ["PLANNING", "UG", "B.Plan", "Bachelor of Planning", "4"],
  ["PLANNING", "PG", "M.Plan", "Master of Planning", "2"],
  ["DESIGN", "UG", "B.Des", "Bachelor of Design", "4"],
  ["DESIGN", "UG", "Interior Design (degree/diploma)", "Interior design programmes", "1-4"],
  ["DESIGN", "PG", "M.Des", "Master of Design", "2"],
  ["FINE_PERFORMING_ARTS", "UG", "BFA", "Bachelor of Fine Arts (Painting, Sculpture, Applied Art, Photography, etc.)", "4"],
  ["FINE_PERFORMING_ARTS", "UG", "B.Mus", "Bachelor of Music", "3"],
  ["FINE_PERFORMING_ARTS", "UG", "BPA", "Bachelor of Performing Arts", "3"],
  ["FINE_PERFORMING_ARTS", "PG", "MFA", "Master of Fine Arts", "2"],
  ["FINE_PERFORMING_ARTS", "PG", "M.Mus", "Master of Music", "2"],
  ["HOSPITALITY", "DIPLOMA", "Diploma Hotel Management", "Diploma / Certificate in Hotel Management & Catering", "1-3"],
  ["HOSPITALITY", "UG", "BHM", "Bachelor of Hotel Management", "3-4"],
  ["HOSPITALITY", "UG", "BHMCT", "Bachelor of Hotel Management & Catering Technology", "4"],
  ["HOSPITALITY", "UG", "B.Sc. Hospitality", "B.Sc. Hospitality Studies", "3-4"],
  ["HOSPITALITY", "UG", "BTTM", "Bachelor of Travel & Tourism Management", "3"],
  ["HOSPITALITY", "PG", "MHM / MHMCT", "Master of Hotel Management", "2"],
  ["VOCATIONAL", "CERTIFICATE", "ITI trades", "Industrial Training Institute certificates", "1-2"],
  ["VOCATIONAL", "UG", "B.Voc", "Bachelor of Vocation", "3"],
  ["VOCATIONAL", "PG", "M.Voc", "Master of Vocation", "2"],
  ["UNCLASSIFIED", "UG", "Aviation / Defence / Specialised UG", "e.g. B.Sc. Aviation, CPL, maritime, defence academy programmes", "varies"],
  ["UNCLASSIFIED", "DOCTORAL", "Ph.D.", "Doctor of Philosophy (all fields)", "3-6"],
  ["UNCLASSIFIED", "DOCTORAL", "D.Litt. / D.Sc.", "Higher doctorates", "varies"],
  ["UNCLASSIFIED", "PG_DIPLOMA", "PG Diploma (other)", "Other post graduate diplomas", "1-2"],
];

/** Display order and labels for degree levels (dropdown 1). */
export const DEGREE_LEVELS: readonly { code: string; label: string }[] = [
  { code: "CERTIFICATE", label: "Certificate" },
  { code: "DIPLOMA", label: "Diploma" },
  { code: "UG", label: "Undergraduate (UG)" },
  { code: "INTEGRATED", label: "Integrated (UG + PG)" },
  { code: "PG_DIPLOMA", label: "Postgraduate Diploma" },
  { code: "PG", label: "Postgraduate (PG)" },
  { code: "PROFESSIONAL_DOCTORATE", label: "Professional Doctorate" },
  { code: "DOCTORAL", label: "Doctoral (Ph.D. and higher)" },
];

/** Labels for academic fields (dropdown 2). */
export const FIELD_LABELS: Readonly<Record<string, string>> = {
  AGRICULTURE: "Agriculture",
  ALLIED_HEALTH: "Allied Health Sciences",
  ARCHITECTURE: "Architecture",
  ARTS_HUMANITIES: "Arts and Humanities",
  AYUSH: "AYUSH (Ayurveda, Homoeopathy, Unani, etc.)",
  COMMERCE: "Commerce",
  COMPUTER_APPLICATIONS: "Computer Applications",
  DENTAL: "Dental",
  DESIGN: "Design",
  EDUCATION: "Education",
  ENGINEERING: "Engineering and Technology",
  FINE_PERFORMING_ARTS: "Fine and Performing Arts",
  HOSPITALITY: "Hospitality and Tourism",
  LAW: "Law",
  LIBRARY_SCIENCE: "Library Science",
  LIFE_SCIENCES: "Life Sciences",
  MANAGEMENT_PG: "Management (PG)",
  MANAGEMENT_UG: "Management (UG)",
  MEDIA_JOURNALISM: "Media and Journalism",
  MEDICAL: "Medical",
  NURSING: "Nursing",
  PHARMACY: "Pharmacy",
  PHYSICAL_EDUCATION: "Physical Education",
  PLANNING: "Planning",
  SCIENCE: "Science",
  SOCIAL_WORK: "Social Work",
  VOCATIONAL: "Vocational",
  UNCLASSIFIED: "Other / All fields",
};

/** Rows filed under this code (e.g. Ph.D.) apply to every field at their level. */
const ALL_FIELDS = "UNCLASSIFIED";

export function levelLabel(code: string): string {
  return DEGREE_LEVELS.find((l) => l.code === code)?.label ?? code;
}

export function fieldLabel(code: string): string {
  return FIELD_LABELS[code] ?? code;
}

/** Field codes that offer at least one degree at the given level (all fields when level is empty). */
export function fieldsForLevel(levelCode: string): string[] {
  const rows = levelCode ? DEGREE_ROWS.filter((r) => r[1] === levelCode) : DEGREE_ROWS;
  const codes = new Set(rows.map((r) => r[0]));
  if (codes.has(ALL_FIELDS)) {
    for (const code of Object.keys(FIELD_LABELS)) codes.add(code);
  }
  return Array.from(codes).sort((a, b) => {
    if (a === ALL_FIELDS) return 1;
    if (b === ALL_FIELDS) return -1;
    return fieldLabel(a).localeCompare(fieldLabel(b));
  });
}

/** Degrees for a field + level, including the all-field rows of that level (e.g. Ph.D.). */
export function degreesFor(fieldCode: string, levelCode: string): DegreeRow[] {
  if (!fieldCode || !levelCode) return [];
  return DEGREE_ROWS.filter(
    (r) => r[1] === levelCode && (r[0] === fieldCode || r[0] === ALL_FIELDS)
  );
}
