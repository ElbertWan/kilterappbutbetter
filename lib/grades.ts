// Kilter / Aurora `difficulty_grades` scale.
//
// IMPORTANT: difficulty_id is NOT 1:1 with the V scale. The board uses a finer
// Font-style scale (1a … 9c+) where several ids collapse into a single V grade.
// e.g. ids 1–12 are all V0, id 30 is V13. The live curated catalog contains ids
// 1–30 (hardest = 8b / V13), and the full scale runs to id 39 (9c+ / V22).
//
// Each V grade therefore maps to a RANGE of difficulty ids. We key off that range
// for both display (id → "V13") and filtering (V grade → id range).

interface VGradeInfo {
  /** lowest difficulty_id that displays as this V grade */
  idMin: number;
  /** highest difficulty_id that displays as this V grade */
  idMax: number;
  color: string;
}

const V_GRADE_MAP: Record<string, VGradeInfo> = {
  V0:  { idMin: 1,  idMax: 12, color: 'bg-emerald-500' },
  V1:  { idMin: 13, idMax: 14, color: 'bg-teal-500' },
  V2:  { idMin: 15, idMax: 15, color: 'bg-cyan-600' },
  V3:  { idMin: 16, idMax: 17, color: 'bg-yellow-500' },
  V4:  { idMin: 18, idMax: 19, color: 'bg-amber-600' },
  V5:  { idMin: 20, idMax: 21, color: 'bg-orange-600' },
  V6:  { idMin: 22, idMax: 22, color: 'bg-red-600' },
  V7:  { idMin: 23, idMax: 23, color: 'bg-rose-700' },
  V8:  { idMin: 24, idMax: 25, color: 'bg-pink-700' },
  V9:  { idMin: 26, idMax: 26, color: 'bg-fuchsia-700' },
  V10: { idMin: 27, idMax: 27, color: 'bg-violet-700' },
  V11: { idMin: 28, idMax: 28, color: 'bg-purple-800' },
  V12: { idMin: 29, idMax: 29, color: 'bg-indigo-800' },
  V13: { idMin: 30, idMax: 30, color: 'bg-blue-800' },
  V14: { idMin: 31, idMax: 31, color: 'bg-slate-700' },
  V15: { idMin: 32, idMax: 32, color: 'bg-slate-700' },
  V16: { idMin: 33, idMax: 33, color: 'bg-slate-700' },
  V17: { idMin: 34, idMax: 34, color: 'bg-slate-800' },
  V18: { idMin: 35, idMax: 35, color: 'bg-slate-800' },
  V19: { idMin: 36, idMax: 36, color: 'bg-slate-800' },
  V20: { idMin: 37, idMax: 37, color: 'bg-slate-900' },
  V21: { idMin: 38, idMax: 38, color: 'bg-slate-900' },
  V22: { idMin: 39, idMax: 39, color: 'bg-slate-900' },
};

export function difficultyIdToVGrade(id?: number): string {
  if (!id) return 'V?';
  for (const [grade, info] of Object.entries(V_GRADE_MAP)) {
    if (id >= info.idMin && id <= info.idMax) return grade;
  }
  // ids above the known scale are still "harder than the hardest" — clamp to top.
  if (id > V_GRADE_MAP.V22.idMax) return 'V22';
  return 'V?';
}

export function getGradeColor(grade?: string | number): string {
  let gradeStr: string | undefined = grade as string | undefined;
  if (typeof grade === 'number') {
    gradeStr = difficultyIdToVGrade(grade);
  }
  if (!gradeStr) return 'bg-gray-300';
  return V_GRADE_MAP[gradeStr]?.color || 'bg-gray-300';
}

// Resolve a min/max V-grade selection into the inclusive difficulty_id range to
// filter on. Uses the bottom of the min grade's range and the top of the max
// grade's range so a single grade (min === max) matches all of its sub-grades.
export function getGradeRange(
  minGrade?: string,
  maxGrade?: string
): { min: number; max: number } | null {
  const minInfo = minGrade ? V_GRADE_MAP[minGrade] : undefined;
  const maxInfo = maxGrade ? V_GRADE_MAP[maxGrade] : undefined;

  if (minInfo && maxInfo) {
    return { min: minInfo.idMin, max: maxInfo.idMax };
  }
  if (minInfo) {
    return { min: minInfo.idMin, max: V_GRADE_MAP.V22.idMax };
  }
  if (maxInfo) {
    return { min: V_GRADE_MAP.V0.idMin, max: maxInfo.idMax };
  }
  return null;
}

export const V_GRADES = [
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'V8',
  'V9',
  'V10',
  'V11',
  'V12',
  'V13',
  'V14',
  'V15',
  'V16',
  'V17',
] as const;
