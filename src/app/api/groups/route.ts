import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();

    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: session.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return jsonResponse({ groups });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to load groups", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { name, description } = await parseBody<{
      name: string;
      description?: string;
    }>(request);

    if (!name?.trim()) return errorResponse("Group name is required");

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        createdById: session.id,
        members: {
          create: { userId: session.id, role: "admin" },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    return jsonResponse({ group }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Failed to create group", 500);
  }
}
