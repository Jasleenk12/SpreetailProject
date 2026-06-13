import { computeGroupBalances } from "@/lib/balances";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();

    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.id },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
            expenses: { include: { splits: true } },
            settlements: true,
          },
        },
      },
    });

    let totalOwed = 0;
    let totalOwing = 0;
    const groupSummaries = [];

    for (const m of memberships) {
      const balances = computeGroupBalances(m.group.expenses, m.group.settlements);
      const myBalance = balances[session.id] || 0;
      if (myBalance > 0) totalOwed += myBalance;
      else if (myBalance < 0) totalOwing += Math.abs(myBalance);

      groupSummaries.push({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        memberCount: m.group.members.length,
        myBalance: Math.round(myBalance * 100) / 100,
        inviteCode: m.group.inviteCode,
      });
    }

    return jsonResponse({
      user: session,
      summary: {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwing: Math.round(totalOwing * 100) / 100,
        netBalance: Math.round((totalOwed - totalOwing) * 100) / 100,
      },
      groups: groupSummaries,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to load dashboard", 500);
  }
}
