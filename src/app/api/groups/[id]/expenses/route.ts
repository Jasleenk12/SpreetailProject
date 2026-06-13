import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";
import { calculateSplits, toNumber } from "@/lib/balances";

interface CreateExpenseBody {
  description: string;
  amount: number;
  paidById: string;
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
  expenseDate?: string;
  participants: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
}

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

    const body = await parseBody<CreateExpenseBody>(request);
    const { description, amount, paidById, splitType, expenseDate, participants } = body;

    if (!description?.trim()) return errorResponse("Description is required");
    if (!amount || amount <= 0) return errorResponse("Valid amount is required");
    if (!paidById) return errorResponse("Payer is required");
    if (!participants?.length) return errorResponse("At least one participant required");

    const payerMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: paidById } },
    });
    if (!payerMember) return errorResponse("Payer must be a group member");

    for (const p of participants) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: p.userId } },
      });
      if (!member) return errorResponse(`User ${p.userId} is not a group member`);
    }

    const splits = calculateSplits(amount, splitType, participants);

    const expense = await prisma.expense.create({
      data: {
        groupId,
        paidById,
        description: description.trim(),
        amount,
        splitType,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        splits: {
          create: splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return jsonResponse(
      {
        expense: {
          ...expense,
          amount: toNumber(expense.amount),
          splits: expense.splits.map((s) => ({
            ...s,
            amount: toNumber(s.amount),
          })),
        },
      },
      201
    );
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Unauthorized") return errorResponse("Unauthorized", 401);
      return errorResponse(e.message);
    }
    return errorResponse("Failed to create expense", 500);
  }
}
