"use client";

import {
  COMPLAINT_SOURCE_TYPES,
  COMPLAINT_SOURCE_CHANNELS,
} from "@/lib/constants";

interface SourceChannelFieldsProps {
  source: string;
  sourceDetail: string;
  onSourceChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
  legacySource?: string;
}

export function SourceChannelFields({
  source,
  sourceDetail,
  onSourceChange,
  onDetailChange,
  inputClass,
  labelClass,
  legacySource,
}: SourceChannelFieldsProps) {
  const channelOptions = source ? COMPLAINT_SOURCE_CHANNELS[source] ?? [] : [];
  const showLegacy =
    legacySource &&
    !COMPLAINT_SOURCE_TYPES.includes(
      legacySource as (typeof COMPLAINT_SOURCE_TYPES)[number]
    );

  function handleSourceChange(value: string) {
    onSourceChange(value);
    onDetailChange("");
  }

  return (
    <>
      <div>
        <label className={labelClass}>客訴來源 *</label>
        <select
          name="source"
          required
          className={inputClass}
          value={source}
          onChange={(e) => handleSourceChange(e.target.value)}
        >
          <option value="" disabled>
            請選擇
          </option>
          {showLegacy && source === legacySource && (
            <option value={legacySource}>{legacySource}（舊資料）</option>
          )}
          {COMPLAINT_SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>客訴管道 *</label>
        <select
          name="source_detail"
          required
          className={`${inputClass} ${!source ? "pointer-events-none opacity-60" : ""}`}
          value={sourceDetail}
          onChange={(e) => onDetailChange(e.target.value)}
          aria-disabled={!source}
          tabIndex={source ? 0 : -1}
        >
          <option value="" disabled>
            {source ? "請選擇" : "請先選擇客訴來源"}
          </option>
          {channelOptions.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
