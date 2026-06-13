import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";
import { toNumber } from "@/lib/balances";

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

    const { payerId, receiverId, amount, note } = await parseBody<{
      payerId: string;
      receiverId: string;
      amount: number;
      note?: string;
    }>(request);

    if (!payerId || !receiverId) {
      return errorResponse("Payer and receiver are required");
    }
    if (payerId === receiverId) {
      return errorResponse("Payer and receiver must be different");
    }
    if (!amount || amount <= 0) {
      return errorResponse("Valid amount is required");
    }

    for (const uid of [payerId, receiverId]) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: uid } },
      });
      if (!member) return errorResponse("Both users must be group members");
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        receiverId,
        amount,
        note: note?.trim(),
      },
      include: {
        payer: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    return jsonResponse(
      {
        settlement: { ...settlement, amount: toNumber(settlement.amount) },
      },
      201
    );
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to record settlement", 500);
  }
}
