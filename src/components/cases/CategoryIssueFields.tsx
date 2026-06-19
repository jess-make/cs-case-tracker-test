"use client";

import {
  buildChildNameOptions,
  buildParentNameOptions,
  type TaxonomyItem,
} from "@/lib/complaint-taxonomy";

interface CategoryIssueFieldsProps {
  category: string;
  issue: string;
  onCategoryChange: (value: string) => void;
  onIssueChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
  categoryItems: TaxonomyItem[];
  issuesByCategoryName: Record<string, TaxonomyItem[]>;
  legacyCategory?: string;
  legacyIssue?: string;
}

export function CategoryIssueFields({
  category,
  issue,
  onCategoryChange,
  onIssueChange,
  inputClass,
  labelClass,
  categoryItems,
  issuesByCategoryName,
  legacyCategory,
  legacyIssue,
}: CategoryIssueFieldsProps) {
  const categoryOptions = buildParentNameOptions(
    categoryItems,
    legacyCategory ?? category
  );
  const issueOptions = buildChildNameOptions(
    category,
    issuesByCategoryName,
    legacyIssue ?? issue
  );

  function handleCategoryChange(value: string) {
    onCategoryChange(value);
    onIssueChange("");
  }

  return (
    <>
      <div>
        <label className={labelClass}>客訴類別 *</label>
        <select
          name="complaint_type"
          required
          className={inputClass}
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="" disabled>
            請選擇
          </option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>客訴問題 *</label>
        <select
          name="complaint_subtype"
          required={Boolean(category)}
          className={`${inputClass} ${!category ? "pointer-events-none opacity-60" : ""}`}
          value={issue}
          onChange={(e) => onIssueChange(e.target.value)}
          aria-disabled={!category}
          tabIndex={category ? 0 : -1}
        >
          <option value="" disabled>
            {category ? "請選擇" : "請先選擇客訴類別"}
          </option>
          {issueOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
