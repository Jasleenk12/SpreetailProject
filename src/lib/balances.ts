import { Decimal } from "@prisma/client/runtime/library";

export type BalanceMap = Record<string, number>;

export function toNumber(value: Decimal | number | string): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Compute net balances for a group.
 * Positive = user is owed money; Negative = user owes money.
 */
export function computeGroupBalances(
  expenses: {
    paidById: string;
    amount: Decimal | number;
    splits: { userId: string; amount: Decimal | number }[];
  }[],
  settlements: {
    payerId: string;
    receiverId: string;
    amount: Decimal | number;
  }[]
): BalanceMap {
  const balances: BalanceMap = {};

  const adjust = (userId: string, delta: number) => {
    balances[userId] = roundMoney((balances[userId] || 0) + delta);
  };

  for (const expense of expenses) {
    const paid = toNumber(expense.amount);
    adjust(expense.paidById, paid);
    for (const split of expense.splits) {
      adjust(split.userId, -toNumber(split.amount));
    }
  }

  for (const settlement of settlements) {
    const amt = toNumber(settlement.amount);
    adjust(settlement.payerId, amt);
    adjust(settlement.receiverId, -amt);
  }

  return balances;
}

export interface DebtPair {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Simplify debts: who owes whom (greedy algorithm).
 */
export function simplifyDebts(balances: BalanceMap): DebtPair[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ id: userId, amount: balance });
    else if (balance < -0.01) debtors.push({ id: userId, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const debts: DebtPair[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0) {
      debts.push({
        fromUserId: debtors[i].id,
        toUserId: creditors[j].id,
        amount,
      });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return debts;
}

export type SplitInput = {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
};

export function calculateSplits(
  totalAmount: number,
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES",
  participants: SplitInput[]
): { userId: string; amount: number; percentage?: number; shares?: number }[] {
  const total = roundMoney(totalAmount);

  if (splitType === "EQUAL") {
    const count = participants.length;
    const base = roundMoney(total / count);
    const splits = participants.map((p, i) => ({
      userId: p.userId,
      amount: i === count - 1 ? roundMoney(total - base * (count - 1)) : base,
    }));
    return splits;
  }

  if (splitType === "EXACT") {
    const sum = participants.reduce((s, p) => s + (p.amount || 0), 0);
    if (Math.abs(sum - total) > 0.02) {
      throw new Error(`Exact amounts must sum to ${total}, got ${sum}`);
    }
    return participants.map((p) => ({
      userId: p.userId,
      amount: roundMoney(p.amount || 0),
    }));
  }

  if (splitType === "PERCENTAGE") {
    const sum = participants.reduce((s, p) => s + (p.percentage || 0), 0);
    if (Math.abs(sum - 100) > 0.02) {
      throw new Error(`Percentages must sum to 100, got ${sum}`);
    }
    const splits = participants.map((p, i) => {
      const pct = p.percentage || 0;
      const amount =
        i === participants.length - 1
          ? roundMoney(
              total -
                participants
                  .slice(0, -1)
                  .reduce(
                    (s, x) => s + roundMoney(total * ((x.percentage || 0) / 100)),
                    0
                  )
            )
          : roundMoney(total * (pct / 100));
      return { userId: p.userId, amount, percentage: pct };
    });
    return splits;
  }

  if (splitType === "SHARES") {
    const totalShares = participants.reduce((s, p) => s + (p.shares || 0), 0);
    if (totalShares <= 0) throw new Error("Total shares must be positive");
    const splits = participants.map((p, i) => {
      const shares = p.shares || 0;
      const amount =
        i === participants.length - 1
          ? roundMoney(
              total -
                participants
                  .slice(0, -1)
                  .reduce(
                    (s, x) =>
                      s + roundMoney(total * ((x.shares || 0) / totalShares)),
                    0
                  )
            )
          : roundMoney(total * (shares / totalShares));
      return { userId: p.userId, amount, shares };
    });
    return splits;
  }

  throw new Error("Invalid split type");
}
