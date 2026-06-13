import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";
import {
  computeGroupBalances,
  simplifyDebts,
  toNumber,
} from "@/lib/balances";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const { id } = params;

    if (!(await isGroupMember(id, session.id))) {
      return errorResponse("Not a member of this group", 403);
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
            _count: { select: { messages: true } },
          },
          orderBy: { expenseDate: "desc" },
        },
        settlements: {
          include: {
            payer: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
          },
          orderBy: { settledAt: "desc" },
        },
      },
    });

    if (!group) return errorResponse("Group not found", 404);

    const balances = computeGroupBalances(group.expenses, group.settlements);
    const simplifiedDebts = simplifyDebts(balances);

    const balanceDetails = group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      balance: balances[m.user.id] || 0,
    }));

    const debtsWithNames = simplifiedDebts.map((d) => ({
      ...d,
      fromName: group.members.find((m) => m.user.id === d.fromUserId)?.user.name,
      toName: group.members.find((m) => m.user.id === d.toUserId)?.user.name,
    }));

    return jsonResponse({
      group: {
        ...group,
        expenses: group.expenses.map((e) => ({
          ...e,
          amount: toNumber(e.amount),
          splits: e.splits.map((s) => ({ ...s, amount: toNumber(s.amount) })),
        })),
        settlements: group.settlements.map((s) => ({
          ...s,
          amount: toNumber(s.amount),
        })),
      },
      balances: balanceDetails,
      simplifiedDebts: debtsWithNames,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to load group", 500);
  }
}
