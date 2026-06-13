import { prisma } from "@/lib/prisma";
import { isGroupMember, requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const { id: groupId } = params;

    if (!(await isGroupMember(groupId, session.id))) {
      return errorResponse("Not a member of this group", 403);
    }

    const { email } = await parseBody<{ email: string }>(request);
    if (!email?.trim()) return errorResponse("Email is required");

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return errorResponse("User not found. They must register first.", 404);

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) return errorResponse("User is already in this group", 409);

    const member = await prisma.groupMember.create({
      data: { groupId, userId: user.id, role: "member" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return jsonResponse({ member }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to add member", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const { id: groupId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) return errorResponse("userId is required");

    const myMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.id } },
    });
    if (!myMembership || myMembership.role !== "admin") {
      if (userId !== session.id) {
        return errorResponse("Only admins can remove other members", 403);
      }
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    return jsonResponse({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to remove member", 500);
  }
}
