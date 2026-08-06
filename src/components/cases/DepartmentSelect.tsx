"use client";

import { AUTO_ASSIGN_DEPARTMENT_VALUE } from "@/lib/case-department";

interface DepartmentSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
  departments: string[];
  emptyLabel?: string;
  autoLabel?: string;
}

/** 指派部門（選填，空值顯示「不需指派」） */
export function DepartmentSelect({
  id,
  value,
  onChange,
  inputClass,
  labelClass,
  departments,
  emptyLabel = "不需指派",
  autoLabel,
}: DepartmentSelectProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        指派部門
      </label>
      <select
        id={id}
        name="department"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {autoLabel && (
          <option value={AUTO_ASSIGN_DEPARTMENT_VALUE}>{autoLabel}</option>
        )}
        <option value="">{emptyLabel}</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
