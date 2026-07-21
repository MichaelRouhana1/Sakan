import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { listingReports } from "../../db/schema/index.js";
import type { ReportReason } from "./reports.schemas.js";

export class ReportsRepository {
  async hasReported(reporterUserId: string, listingId: string) {
    const [row] = await db
      .select({ id: listingReports.id })
      .from(listingReports)
      .where(
        and(
          eq(listingReports.reporterUserId, reporterUserId),
          eq(listingReports.listingId, listingId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async create(
    reporterUserId: string,
    listingId: string,
    reason: ReportReason,
  ) {
    const [row] = await db
      .insert(listingReports)
      .values({ reporterUserId, listingId, reason })
      .onConflictDoNothing({
        target: [listingReports.reporterUserId, listingReports.listingId],
      })
      .returning({
        id: listingReports.id,
        listingId: listingReports.listingId,
        reason: listingReports.reason,
        createdAt: listingReports.createdAt,
      });
    return row ?? null;
  }
}

export const reportsRepository = new ReportsRepository();
