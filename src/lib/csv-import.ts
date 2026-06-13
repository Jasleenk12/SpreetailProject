export type AnomalyAction = "skipped" | "fixed" | "imported" | "warning";

export interface ImportAnomaly {
  row: number;
  field?: string;
  issue: string;
  rawValue?: string;
  action: AnomalyAction;
  detail?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  fixed: number;
  anomalies: ImportAnomaly[];
  expenseIds: string[];
}

interface CsvRow {
  rowNumber: number;
  description: string;
  amount: string;
  paid_by_email: string;
  split_type: string;
  expense_date: string;
  participants: string;
  participant_values: string;
}

const REQUIRED_HEADERS = [
  "description",
  "amount",
  "paid_by_email",
  "split_type",
  "expense_date",
  "participants",
  "participant_values",
];

export function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim();
    });
    rows.push({
      rowNumber: i + 1,
      description: row.description || "",
      amount: row.amount || "",
      paid_by_email: row.paid_by_email || "",
      split_type: (row.split_type || "EQUAL").toUpperCase(),
      expense_date: row.expense_date || "",
      participants: row.participants || "",
      participant_values: row.participant_values || "",
    });
  }

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function validateHeaders(headers: string[]): ImportAnomaly[] {
  const anomalies: ImportAnomaly[] = [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    anomalies.push({
      row: 1,
      field: "headers",
      issue: `Missing required columns: ${missing.join(", ")}`,
      action: "skipped",
      detail: "Import aborted — CSV must match expected schema",
    });
  }
  return anomalies;
}

export function validateRow(row: CsvRow): ImportAnomaly[] {
  const anomalies: ImportAnomaly[] = [];

  if (!row.description.trim()) {
    anomalies.push({
      row: row.rowNumber,
      field: "description",
      issue: "Missing description",
      rawValue: row.description,
      action: "skipped",
    });
  }

  const amount = parseFloat(row.amount);
  if (row.amount === "" || isNaN(amount)) {
    anomalies.push({
      row: row.rowNumber,
      field: "amount",
      issue: "Non-numeric or missing amount",
      rawValue: row.amount,
      action: "skipped",
    });
  } else if (amount <= 0) {
    anomalies.push({
      row: row.rowNumber,
      field: "amount",
      issue: "Negative or zero amount",
      rawValue: row.amount,
      action: "skipped",
    });
  }

  if (!row.paid_by_email.trim()) {
    anomalies.push({
      row: row.rowNumber,
      field: "paid_by_email",
      issue: "Missing payer email",
      action: "skipped",
    });
  }

  const validSplitTypes = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"];
  if (!validSplitTypes.includes(row.split_type)) {
    anomalies.push({
      row: row.rowNumber,
      field: "split_type",
      issue: "Invalid split type",
      rawValue: row.split_type,
      action: "skipped",
    });
  }

  if (row.expense_date && row.expense_date !== "not-a-date") {
    const d = new Date(row.expense_date);
    if (isNaN(d.getTime())) {
      anomalies.push({
        row: row.rowNumber,
        field: "expense_date",
        issue: "Unparseable date",
        rawValue: row.expense_date,
        action: "fixed",
        detail: "Defaulted to today's date",
      });
    }
  } else if (row.expense_date === "not-a-date" || !row.expense_date) {
    if (row.expense_date === "not-a-date") {
      anomalies.push({
        row: row.rowNumber,
        field: "expense_date",
        issue: "Invalid date format",
        rawValue: row.expense_date,
        action: "fixed",
        detail: "Defaulted to today's date",
      });
    }
  }

  const participantEmails = row.participants
    .split(";")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (participantEmails.length === 0) {
    anomalies.push({
      row: row.rowNumber,
      field: "participants",
      issue: "No participants listed",
      action: "skipped",
    });
  }

  if (row.split_type === "PERCENTAGE" && row.participant_values) {
    const pcts = row.participant_values.split(";").map((v) => parseFloat(v.trim()));
    const sum = pcts.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);
    if (Math.abs(sum - 100) > 0.02) {
      anomalies.push({
        row: row.rowNumber,
        field: "participant_values",
        issue: `Percentages sum to ${sum}, not 100`,
        rawValue: row.participant_values,
        action: "skipped",
      });
    }
  }

  if (row.split_type === "EXACT" && row.participant_values) {
    const amounts = row.participant_values.split(";").map((v) => parseFloat(v.trim()));
    const sum = amounts.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);
    const total = parseFloat(row.amount);
    if (!isNaN(total) && Math.abs(sum - total) > 0.02) {
      anomalies.push({
        row: row.rowNumber,
        field: "participant_values",
        issue: `Exact amounts sum to ${sum}, expense total is ${total}`,
        rawValue: row.participant_values,
        action: "skipped",
      });
    }
  }

  return anomalies;
}

export function rowShouldSkip(anomalies: ImportAnomaly[]): boolean {
  return anomalies.some((a) => a.action === "skipped");
}

export function formatImportReport(result: ImportResult, groupName: string): string {
  const lines: string[] = [
    "# CSV Import Report",
    "",
    `**Group:** ${groupName}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Rows imported | ${result.imported} |`,
    `| Rows skipped | ${result.skipped} |`,
    `| Rows auto-fixed | ${result.fixed} |`,
    `| Total anomalies | ${result.anomalies.length} |`,
    "",
    "## Anomalies Detected",
    "",
  ];

  if (result.anomalies.length === 0) {
    lines.push("No anomalies detected. All rows imported successfully.");
  } else {
    lines.push("| Row | Field | Issue | Raw Value | Action | Detail |");
    lines.push("|-----|-------|-------|-----------|--------|--------|");
    for (const a of result.anomalies) {
      lines.push(
        `| ${a.row} | ${a.field || "—"} | ${a.issue} | ${a.rawValue || "—"} | ${a.action} | ${a.detail || "—"} |`
      );
    }
  }

  if (result.expenseIds.length > 0) {
    lines.push("", "## Imported Expense IDs", "");
    result.expenseIds.forEach((id) => lines.push(`- ${id}`));
  }

  return lines.join("\n");
}
