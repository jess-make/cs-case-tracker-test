import { mergeTaxonomyFilterNames } from "@/lib/complaint-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import type { ComplaintChannel, ComplaintSource } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

function normalizeSource(raw: Record<string, unknown>): ComplaintSource {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    is_active: raw.is_active !== false,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function normalizeChannel(raw: Record<string, unknown>): ComplaintChannel {
  return {
    id: String(raw.id ?? ""),
    source_id: String(raw.source_id ?? ""),
    name: String(raw.name ?? ""),
    is_active: raw.is_active !== false,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export async function getComplaintSourcesForManagement(): Promise<
  ComplaintSource[]
> {
  const { data, error } = await (await supabase())
    .from("complaint_sources")
    .select("*")
    .order("name");

  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeSource);
}

export async function getComplaintChannelsForManagement(): Promise<
  ComplaintChannel[]
> {
  const { data, error } = await (await supabase())
    .from("complaint_channels")
    .select("*")
    .order("name");

  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeChannel);
}

export async function getComplaintSourceById(
  id: string
): Promise<ComplaintSource | null> {
  const { data, error } = await (await supabase())
    .from("complaint_sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeSource(data as Record<string, unknown>);
}

export async function getComplaintChannelById(
  id: string
): Promise<ComplaintChannel | null> {
  const { data, error } = await (await supabase())
    .from("complaint_channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeChannel(data as Record<string, unknown>);
}

export async function getComplaintSourceUsageCount(
  sourceName: string
): Promise<number> {
  const { count, error } = await (await supabase())
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("source", sourceName);

  if (error) throw error;
  return count ?? 0;
}

export async function getComplaintChannelUsageCount(
  channelName: string
): Promise<number> {
  const { count, error } = await (await supabase())
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("source_detail", channelName);

  if (error) throw error;
  return count ?? 0;
}

export async function countChannelsBySourceId(sourceId: string): Promise<number> {
  const { count, error } = await (await supabase())
    .from("complaint_channels")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId);

  if (error) throw error;
  return count ?? 0;
}

export async function createComplaintSource(
  name: string
): Promise<ComplaintSource> {
  const trimmed = name.trim();
  const { data, error } = await (await supabase())
    .from("complaint_sources")
    .insert({ name: trimmed, is_active: true })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("客訴來源名稱已存在");
    throw error;
  }

  return normalizeSource(data as Record<string, unknown>);
}

export async function setComplaintSourceActive(
  id: string,
  isActive: boolean
): Promise<ComplaintSource> {
  const { data, error } = await (await supabase())
    .from("complaint_sources")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSource(data as Record<string, unknown>);
}

export async function renameComplaintSource(
  id: string,
  newName: string
): Promise<ComplaintSource> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("客訴來源名稱不可為空");

  const client = await supabase();
  const existing = await getComplaintSourceById(id);
  if (!existing) throw new Error("找不到客訴來源");

  const oldName = existing.name;
  if (oldName === trimmed) return existing;

  const { data: duplicate } = await client
    .from("complaint_sources")
    .select("id")
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) throw new Error("客訴來源名稱已存在");

  const { error: casesError } = await client
    .from("cases")
    .update({ source: trimmed })
    .eq("source", oldName);

  if (casesError) {
    throw new Error(`更新案件客訴來源失敗：${casesError.message}`);
  }

  const { data, error } = await client
    .from("complaint_sources")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await client.from("cases").update({ source: oldName }).eq("source", trimmed);
    if (error.code === "23505") throw new Error("客訴來源名稱已存在");
    throw new Error(`更新客訴來源失敗：${error.message}`);
  }

  return normalizeSource(data as Record<string, unknown>);
}

export async function deleteComplaintSource(id: string): Promise<void> {
  const existing = await getComplaintSourceById(id);
  if (!existing) throw new Error("找不到客訴來源");

  const cases = await getComplaintSourceUsageCount(existing.name);
  if (cases > 0) {
    throw new Error(
      `無法刪除客訴來源，目前仍有 ${cases} 筆案件使用此來源。`
    );
  }

  const channels = await countChannelsBySourceId(id);
  if (channels > 0) {
    throw new Error("無法刪除客訴來源，請先刪除底下的客訴管道。");
  }

  const { error } = await (await supabase())
    .from("complaint_sources")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createComplaintChannel(
  sourceId: string,
  name: string
): Promise<ComplaintChannel> {
  const trimmed = name.trim();
  const { data, error } = await (await supabase())
    .from("complaint_channels")
    .insert({ source_id: sourceId, name: trimmed, is_active: true })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("此來源下已有相同管道名稱");
    }
    throw error;
  }

  return normalizeChannel(data as Record<string, unknown>);
}

export async function setComplaintChannelActive(
  id: string,
  isActive: boolean
): Promise<ComplaintChannel> {
  const { data, error } = await (await supabase())
    .from("complaint_channels")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeChannel(data as Record<string, unknown>);
}

export async function renameComplaintChannel(
  id: string,
  newName: string
): Promise<ComplaintChannel> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("客訴管道名稱不可為空");

  const client = await supabase();
  const existing = await getComplaintChannelById(id);
  if (!existing) throw new Error("找不到客訴管道");

  const oldName = existing.name;
  if (oldName === trimmed) return existing;

  const { data: duplicate } = await client
    .from("complaint_channels")
    .select("id")
    .eq("source_id", existing.source_id)
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) throw new Error("此來源下已有相同管道名稱");

  const { error: casesError } = await client
    .from("cases")
    .update({ source_detail: trimmed })
    .eq("source_detail", oldName);

  if (casesError) {
    throw new Error(`更新案件客訴管道失敗：${casesError.message}`);
  }

  const { data, error } = await client
    .from("complaint_channels")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await client
      .from("cases")
      .update({ source_detail: oldName })
      .eq("source_detail", trimmed);
    if (error.code === "23505") throw new Error("此來源下已有相同管道名稱");
    throw new Error(`更新客訴管道失敗：${error.message}`);
  }

  return normalizeChannel(data as Record<string, unknown>);
}

export async function deleteComplaintChannel(id: string): Promise<void> {
  const existing = await getComplaintChannelById(id);
  if (!existing) throw new Error("找不到客訴管道");

  const cases = await getComplaintChannelUsageCount(existing.name);
  if (cases > 0) {
    throw new Error(
      `無法刪除客訴管道，目前仍有 ${cases} 筆案件使用此管道。`
    );
  }

  const { error } = await (await supabase())
    .from("complaint_channels")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getComplaintSourceNamesForCaseFilter(
  selected?: string
): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("complaint_sources")
    .select("name, is_active")
    .order("name");

  if (error) throw error;
  const items = (data ?? []).map((row) => ({
    id: String(row.name),
    name: String(row.name),
    is_active: row.is_active !== false,
  }));
  return mergeTaxonomyFilterNames(items, selected);
}

export async function getComplaintChannelNamesForCaseFilter(
  selected?: string
): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("complaint_channels")
    .select("name, is_active")
    .order("name");

  if (error) throw error;
  const items = (data ?? []).map((row) => ({
    id: String(row.name),
    name: String(row.name),
    is_active: row.is_active !== false,
  }));
  return mergeTaxonomyFilterNames(items, selected);
}
