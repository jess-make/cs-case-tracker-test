"use client";

import { DEPARTMENTS } from "@/lib/constants";

interface DepartmentSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
}

/** 指派部門（選填，預設「暫不指派」） */
export function DepartmentSelect({
  id,
  value,
  onChange,
  inputClass,
  labelClass,
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
        <option value="">暫不指派</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
