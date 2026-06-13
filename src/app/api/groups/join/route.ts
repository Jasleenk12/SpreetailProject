import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { inviteCode } = await request.json();

    if (!inviteCode) return errorResponse("Invite code is required");

    const group = await prisma.group.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!group) return errorResponse("Invalid invite code", 404);

    const existing = group.members.find((m) => m.userId === session.id);
    if (existing) return errorResponse("You are already in this group", 409);

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: session.id, role: "member" },
    });

    return jsonResponse({ groupId: group.id, groupName: group.name });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to join group", 500);
  }
}
