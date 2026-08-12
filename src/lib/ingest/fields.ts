export type CanonicalRow = {
  learnerKey: string;
  name: string;
  fatherName: string | null;
  dob: string | null;
  eventLabel: string;
  result: string | null;
  internalMarks: number | null;
  theoryMarks: number | null;
  totalMarks: number | null;
  rollNumber: string | null;
  examCentre: string | null;
  mobile: string | null;
  itgkCode: string | null;
  itgkName: string | null;
  spCentre: string | null;
  barcode: string | null;
  bookletSeries: string | null;
  sourceRank: number;
  extra: Record<string, unknown>;
};

const aliases = {
  learnerKey: [
    "scholar number",
    "scholar no",
    "scholarno",
    "scholar",
    "learner code",
    "learnercode",
    "learner id",
    "learnerid",
    "enrollment",
    "enrolment",
    "lnr_code",
    "lnrcode",
    "lnr code"
  ],
  name: ["learner name", "learnername", "student name", "candidate name", "name"],
  fatherName: ["father name", "fathername", "fathers name", "father", "guardian name", "f_name", "fname"],
  dob: ["dob", "date of birth", "dateofbirth", "birth date"],
  eventLabel: ["exam event", "examevent", "event", "exam month", "exammonth", "exam date", "examdate", "month"],
  result: ["result", "status", "result status", "pass fail"],
  internalMarks: ["internal", "internal marks", "internalmarks", "int_marks", "intmarks", "practical", "practical marks"],
  theoryMarks: ["theory", "theory marks", "theorymarks", "th_marks", "thmarks", "external", "marks"],
  totalMarks: ["total", "total marks", "totalmarks", "total_mrks", "totalmrks"],
  rollNumber: ["roll number", "roll no", "rollno", "roll", "rollno"],
  examCentre: ["exam centre", "exam center", "examcentre", "examcenter", "centre", "center"],
  mobile: ["mobile", "mobile no", "mobileno", "phone", "contact", "mob"],
  itgkCode: ["itgk code", "itgkcode", "itgk_code", "center code", "centre code"],
  itgkName: ["itgk", "itgk name", "itgknm", "center name", "centre name", "institute"],
  spCentre: ["sp centre", "sp center", "spcentre", "spcenter", "itgksp", "itgk sp"],
  barcode: ["barcode", "bar code", "bcode"],
  bookletSeries: ["booklet series", "bookletseries", "series"]
} satisfies Record<keyof Omit<CanonicalRow, "extra" | "sourceRank">, string[]>;

const aliasToField = new Map<string, keyof Omit<CanonicalRow, "extra" | "sourceRank">>();

Object.entries(aliases).forEach(([field, names]) => {
  names.forEach((name) => aliasToField.set(normalizeHeader(name), field as keyof Omit<CanonicalRow, "extra" | "sourceRank">));
});

export function normalizeHeader(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function canonicalize(raw: Record<string, unknown>, fallbackEvent: string, sourceRank = 0): CanonicalRow | null {
  const mapped: Partial<Record<keyof Omit<CanonicalRow, "extra" | "sourceRank">, string>> = {};
  const extra: Record<string, unknown> = {};

  Object.entries(raw).forEach(([key, value]) => {
    const text = clean(value);
    if (text === null) return;

    const field = aliasToField.get(normalizeHeader(key));
    if (field) {
      mapped[field] = mapped[field] ?? text;
    } else {
      extra[key] = text;
    }
  });

  const learnerKey = onlyDigits(mapped.learnerKey ?? "");
  if (!learnerKey) {
    return null;
  }

  return {
    learnerKey,
    name: mapped.name ?? "UNKNOWN",
    fatherName: mapped.fatherName ?? null,
    dob: normalizeDate(mapped.dob),
    eventLabel: mapped.eventLabel ?? fallbackEvent,
    result: mapped.result?.toUpperCase() ?? null,
    internalMarks: toInteger(mapped.internalMarks),
    theoryMarks: toInteger(mapped.theoryMarks),
    totalMarks: toInteger(mapped.totalMarks),
    rollNumber: mapped.rollNumber ?? null,
    examCentre: mapped.examCentre ?? null,
    mobile: mapped.mobile ?? null,
    itgkCode: mapped.itgkCode ?? null,
    itgkName: mapped.itgkName ?? null,
    spCentre: mapped.spCentre ?? null,
    barcode: mapped.barcode ?? null,
    bookletSeries: mapped.bookletSeries ?? null,
    sourceRank,
    extra
  };
}

export function fallbackEventFromPath(filePath: string, tableName?: string) {
  const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Unknown exam event";
  return [fileName, tableName].filter(Boolean).join(" - ").replace(/[_-]+/g, " ").trim();
}

function clean(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toInteger(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function normalizeDate(value: string | undefined) {
  if (!value) return null;

  const cleanVal = String(value).trim();
  
  // Strict guard: Agar date mein '+' hai, length 20 se zyada hai, ya ajeeb format/characters hain toh seedha null karo
  if (cleanVal.includes("+") || cleanVal.length > 20 || /[a-zA-Z]{3,}/.test(cleanVal)) {
    return null;
  }

  let year: string, month: string, day: string;

  try {
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanVal)) {
      const parts = cleanVal.split(/[/-]/).map((part) => part.padStart(2, "0"));
      day = parts[0];
      month = parts[1];
      year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    } else if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleanVal)) {
      const parts = cleanVal.split(/[/-]/).map((part) => part.padStart(2, "0"));
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      const date = new Date(cleanVal);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 10);
    }

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
      return null;
    }

    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1950 || y > 2030) {
      return null;
    }

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}