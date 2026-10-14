/**
 * Maps the profile's field / level codes (lib/degree-master.ts) to the values
 * stored in pune_programmes.field and pune_programmes.degree_level.
 *
 * Only exact database values are listed. A profile field with no entry here has
 * no programmes tagged for it in the dataset yet; the UI says so instead of guessing.
 * Forensic Science is its own field and is not merged into Science or Law.
 */
export const PROFILE_FIELD_TO_DB_FIELDS: Readonly<Record<string, readonly string[]>> = {
  AGRICULTURE: ["Agriculture"],
  ALLIED_HEALTH: ["Physiotherapy", "Audiology & Speech-Language Pathology"],
  ARCHITECTURE: ["Architecture"],
  ARTS_HUMANITIES: ["Arts and Humanities", "Arts", "Arts/Science"],
  AYUSH: ["AYUSH"],
  COMMERCE: ["Commerce", "Management/Commerce"],
  COMPUTER_APPLICATIONS: ["Computer Applications", "Computer Applications / Management", "Computer Science and IT"],
  DENTAL: ["Dental"],
  DESIGN: ["Design"],
  EDUCATION: ["Teacher Education"],
  ENGINEERING: ["Engineering/Technology"],
  FINE_PERFORMING_ARTS: ["Fine Arts"],
  FORENSIC_SCIENCE: ["Forensic Science"],
  HOSPITALITY: ["Hotel Management"],
  LAW: ["Law"],
  LIBRARY_SCIENCE: ["Library Science"],
  LIFE_SCIENCES: ["Biotechnology", "Science"],
  MANAGEMENT_PG: ["Management", "Management/Commerce", "Computer Applications / Management"],
  MANAGEMENT_UG: ["Management", "Management/Commerce", "Computer Applications / Management"],
  MEDICAL: ["Medical"],
  NURSING: ["Nursing"],
  PHARMACY: ["Pharmacy"],
  PHYSICAL_EDUCATION: ["Physical Education"],
  SCIENCE: ["Science", "Arts/Science"],
  SOCIAL_WORK: ["Social Work"],
  VOCATIONAL: ["Vocational"],
};

/** Profile level code -> pune_programmes.degree_level values. Empty = do not filter by level. */
export const PROFILE_LEVEL_TO_DB_LEVELS: Readonly<Record<string, readonly string[]>> = {
  UG: ["UG", "UG+PG (dual degree)"],
  INTEGRATED: ["UG+PG (dual degree)", "UG"],
  PG: ["PG", "UG+PG (dual degree)"],
};

export function dbFieldsFor(fieldCode: string | null | undefined): string[] {
  return fieldCode ? [...(PROFILE_FIELD_TO_DB_FIELDS[fieldCode] ?? [])] : [];
}

export function dbLevelsFor(levelCode: string | null | undefined): string[] {
  return levelCode ? [...(PROFILE_LEVEL_TO_DB_LEVELS[levelCode] ?? [])] : [];
}

/** Districts covered by the dataset today. */
export const COVERED_DISTRICTS = ["Pune"] as const;
