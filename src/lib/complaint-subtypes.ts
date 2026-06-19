import { COMPLAINT_CATEGORIES } from "@/lib/constants";

/** 客訴問題選項（子類別仍由常數對應；改名後保留既有子類別值） */
export function getComplaintSubtypeOptions(
  category: string,
  currentSubtype?: string | null
): string[] {
  const base = [...(COMPLAINT_CATEGORIES[category] ?? [])];
  const current = currentSubtype?.trim();
  if (current && !base.includes(current)) {
    base.push(current);
  }
  if (base.length === 0) {
    return current ? [current] : ["其他"];
  }
  return base;
}
