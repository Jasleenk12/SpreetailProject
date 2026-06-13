import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";
import { toNumber } from "@/lib/balances";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!expense) return errorResponse("Expense not found", 404);
    if (!(await isGroupMember(expense.groupId, session.id))) {
      return errorResponse("Not authorized", 403);
    }

    return jsonResponse({
      expense: {
        ...expense,
        amount: toNumber(expense.amount),
        splits: expense.splits.map((s) => ({
          ...s,
          amount: toNumber(s.amount),
        })),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to load expense", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const expense = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!expense) return errorResponse("Expense not found", 404);
    if (!(await isGroupMember(expense.groupId, session.id))) {
      return errorResponse("Not authorized", 403);
    }

    await prisma.expense.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to delete expense", 500);
  }
}
