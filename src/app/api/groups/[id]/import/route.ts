import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";
import { calculateSplits } from "@/lib/balances";
import {
  formatImportReport,
  parseCsv,
  rowShouldSkip,
  validateHeaders,
  validateRow,
  type ImportAnomaly,
  type ImportResult,
} from "@/lib/csv-import";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const groupId = params.id;

    if (!(await isGroupMember(groupId, session.id))) {
      return errorResponse("Not a member of this group", 403);
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    if (!group) return errorResponse("Group not found", 404);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse("No file uploaded");

    const content = await file.text();
    const { headers, rows } = parseCsv(content);

    const headerAnomalies = validateHeaders(headers);
    if (headerAnomalies.some((a) => a.action === "skipped" && a.field === "headers")) {
      const result: ImportResult = {
        imported: 0,
        skipped: rows.length,
        fixed: 0,
        anomalies: headerAnomalies,
        expenseIds: [],
      };
      return jsonResponse({
        result,
        report: formatImportReport(result, group.name),
      });
    }

    const emailToUserId = new Map(
      group.members.map((m) => [m.user.email.toLowerCase(), m.user.id])
    );

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      fixed: 0,
      anomalies: [...headerAnomalies],
      expenseIds: [],
    };

    for (const row of rows) {
      const rowAnomalies = validateRow(row);

      const payerEmail = row.paid_by_email.trim().toLowerCase();
      if (payerEmail && !emailToUserId.has(payerEmail)) {
        rowAnomalies.push({
          row: row.rowNumber,
          field: "paid_by_email",
          issue: "Payer not found in group",
          rawValue: row.paid_by_email,
          action: "skipped",
        });
      }

      const participantEmails = row.participants
        .split(";")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      for (const email of participantEmails) {
        if (!emailToUserId.has(email)) {
          rowAnomalies.push({
            row: row.rowNumber,
            field: "participants",
            issue: `Participant not in group: ${email}`,
            rawValue: email,
            action: "skipped",
          });
        }
      }

      result.anomalies.push(...rowAnomalies);

      if (rowShouldSkip(rowAnomalies)) {
        result.skipped++;
        continue;
      }

      const fixedCount = rowAnomalies.filter((a) => a.action === "fixed").length;
      result.fixed += fixedCount;

      const paidById = emailToUserId.get(payerEmail)!;
      const amount = parseFloat(row.amount);
      const splitType = row.split_type as "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

      let expenseDate = new Date();
      if (row.expense_date && row.expense_date !== "not-a-date") {
        const parsed = new Date(row.expense_date);
        if (!isNaN(parsed.getTime())) expenseDate = parsed;
      }

      const values = row.participant_values
        ? row.participant_values.split(";").map((v) => v.trim())
        : [];

      const participants = participantEmails.map((email, i) => {
        const userId = emailToUserId.get(email)!;
        const base = { userId };
        if (splitType === "EXACT") return { ...base, amount: parseFloat(values[i] || "0") };
        if (splitType === "PERCENTAGE") return { ...base, percentage: parseFloat(values[i] || "0") };
        if (splitType === "SHARES") return { ...base, shares: parseInt(values[i] || "1", 10) };
        return base;
      });

      const splits = calculateSplits(amount, splitType, participants);

      const expense = await prisma.expense.create({
        data: {
          groupId,
          paidById,
          description: row.description.trim(),
          amount,
          splitType,
          expenseDate,
          splits: {
            create: splits.map((s) => ({
              userId: s.userId,
              amount: s.amount,
              percentage: s.percentage,
              shares: s.shares,
            })),
          },
        },
      });

      result.imported++;
      result.expenseIds.push(expense.id);
    }

    const report = formatImportReport(result, group.name);

    return jsonResponse({ result, report });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Unauthorized") return errorResponse("Unauthorized", 401);
      return errorResponse(e.message);
    }
    return errorResponse("Import failed", 500);
  }
}
