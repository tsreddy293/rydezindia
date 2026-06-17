import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsReport, analyticsToCsv } from "@/lib/services/analytics";
import { getReportRows, toCsv } from "@/lib/services/reports";
import { requireRole } from "@/server/actions/auth";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const type = request.nextUrl.searchParams.get("type") || "bookings";
    const format = request.nextUrl.searchParams.get("format") || "csv";

    if (type === "analytics") {
      const report = await getAnalyticsReport();
      const csv = analyticsToCsv(report);
      if (format === "pdf") {
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="rydez-analytics-report.pdf"',
          },
        });
      }
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="rydez-analytics-report.csv"',
        },
      });
    }

    const rows = await getReportRows(type);
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rydez-${type}-report.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to export report" },
      { status: 400 }
    );
  }
}
