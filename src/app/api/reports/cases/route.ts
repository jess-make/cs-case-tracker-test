import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessReportManagement } from "@/lib/auth/permissions";
import { getCaseLogsByCaseIds, getCases } from "@/lib/data/cases";
import { getCaseAssignmentResolver } from "@/lib/data/case-assignment-rules";
import {
  buildCategoryCaseReportFilename,
  buildCaseReportCsv,
  buildCaseReportDetailsByCaseId,
  buildCaseReportFilename,
  buildCaseReportXlsx,
  buildReturnExchangeCaseReportCsv,
  buildReturnExchangeCaseReportXlsx,
  type CaseReportFileFormat,
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
type ReturnExchangeReportType = "退貨" | "換貨";

const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function getReportFilters(searchParams: URLSearchParams): Record<FilterKey, string | undefined> {
  const filters = {} as Record<FilterKey, string | undefined>;
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key)?.trim();
    filters[key] = value || undefined;
  }
  return filters;
}

function getReturnExchangeReportType(
  searchParams: URLSearchParams
): ReturnExchangeReportType | null {
  const complaintType = searchParams.get("complaint_type")?.trim();
  return complaintType === "退貨" || complaintType === "換貨"
    ? complaintType
    : null;
}

function getReportFormat(searchParams: URLSearchParams): CaseReportFileFormat {
  return searchParams.get("format")?.trim().toLowerCase() === "xlsx"
    ? "xlsx"
    : "csv";
}

function reportResponse(
  body: string | Uint8Array,
  filename: string,
  contentType: string
): NextResponse {
  const fallbackFilename = filename.replace(/[^\x20-\x7E]/g, "_");
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.must_change_password || currentUser.must_bind_line) {
    return NextResponse.json({ message: "Onboarding required" }, { status: 403 });
  }

  const template = request.nextUrl.searchParams.get("template")?.trim();
  const format = getReportFormat(request.nextUrl.searchParams);
  if (template === "return-exchange") {
    if (!canAccessReportManagement(currentUser)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const reportType = getReturnExchangeReportType(request.nextUrl.searchParams);
    if (!reportType) {
      return NextResponse.json(
        { message: "Invalid return/exchange report type" },
        { status: 400 }
      );
    }

    const filters = getReportFilters(request.nextUrl.searchParams);
    const cases = await getCases(currentUser, {
      ...filters,
      complaint_type: reportType,
      filterByDate: true,
    });
    const logsByCaseId = await getCaseLogsByCaseIds(
      cases.map((caseData) => caseData.id)
    );
    const reportDetails = buildCaseReportDetailsByCaseId(logsByCaseId);
    const resolveAssignmentPlan = await getCaseAssignmentResolver().catch(
      () => null
    );
    const assignmentPlansByCaseId = new Map(
      cases.map((caseData) => [
        caseData.id,
        resolveAssignmentPlan
          ? resolveAssignmentPlan(
              caseData.complaint_type,
              caseData.complaint_subtype
            )
          : [],
      ])
    );
    const reportName = `${reportType}案件報表`;
    const filename = buildCategoryCaseReportFilename(reportName, format);

    if (format === "xlsx") {
      return reportResponse(
        buildReturnExchangeCaseReportXlsx(
          cases,
          reportDetails,
          assignmentPlansByCaseId,
          reportName
        ),
        filename,
        XLSX_CONTENT_TYPE
      );
    }

    return reportResponse(
      buildReturnExchangeCaseReportCsv(
        cases,
        reportDetails,
        assignmentPlansByCaseId
      ),
      filename,
      CSV_CONTENT_TYPE
    );
  }

  const filters = getReportFilters(request.nextUrl.searchParams);
  const cases = await getCases(currentUser, {
    ...filters,
    filterByDate: true,
  });
  const logsByCaseId = await getCaseLogsByCaseIds(
    cases.map((caseData) => caseData.id)
  );
  const reportDetails = buildCaseReportDetailsByCaseId(logsByCaseId);
  const filename = buildCaseReportFilename(format);

  if (format === "xlsx") {
    return reportResponse(
      buildCaseReportXlsx(cases, filters, reportDetails),
      filename,
      XLSX_CONTENT_TYPE
    );
  }

  return reportResponse(
    buildCaseReportCsv(cases, filters, reportDetails),
    filename,
    CSV_CONTENT_TYPE
  );
}
