/** 選單選項：啟用類別 + 保留目前值（停用類別仍顯示於編輯畫面） */
export function buildComplaintCategoryOptions(
  activeCategories: string[],
  currentValue?: string | null
): string[] {
  const options = [...activeCategories];
  const current = currentValue?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  return options;
}
