import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return jsonResponse({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.id } },
          {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });

    return jsonResponse({ users });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse("Search failed", 500);
  }
}
