import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const expenseId = params.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { groupId: true },
    });
    if (!expense) return errorResponse("Expense not found", 404);
    if (!(await isGroupMember(expense.groupId, session.id))) {
      return errorResponse("Not authorized", 403);
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const messages = await prisma.expenseMessage.findMany({
      where: {
        expenseId,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse({ messages });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to load messages", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const expenseId = params.id;
    const { content } = await parseBody<{ content: string }>(request);

    if (!content?.trim()) return errorResponse("Message content is required");

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { groupId: true },
    });
    if (!expense) return errorResponse("Expense not found", 404);
    if (!(await isGroupMember(expense.groupId, session.id))) {
      return errorResponse("Not authorized", 403);
    }

    const message = await prisma.expenseMessage.create({
      data: {
        expenseId,
        userId: session.id,
        content: content.trim(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return jsonResponse({ message }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to send message", 500);
  }
}
