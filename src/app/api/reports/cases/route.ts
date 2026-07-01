import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCases } from "@/lib/data/cases";
import {
  buildCaseReportCsv,
  buildCaseReportFilename,
} from "@/lib/reports/case-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILTER_KEYS = [
  "status",
  "assignee_id",
  "department",
  "source",
  "source_detail",
  "complaint_type",
  "complaint_subtype",
  "urgency",
  "q",
  "date_preset",
  "date_from",
  "date_to",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

function getReportFilters(searchParams: URLSearchParams): Record<FilterKey, string | undefined> {
  const filters = {} as Record<FilterKey, string | undefined>;
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key)?.trim();
    filters[key] = value || undefined;
  }
  return filters;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.must_change_password || currentUser.must_bind_line) {
    return NextResponse.json({ message: "Onboarding required" }, { status: 403 });
  }

  const filters = getReportFilters(request.nextUrl.searchParams);
  const cases = await getCases(currentUser, {
    ...filters,
    filterByDate: true,
  });
  const csv = buildCaseReportCsv(cases, filters);
  const filename = buildCaseReportFilename();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
