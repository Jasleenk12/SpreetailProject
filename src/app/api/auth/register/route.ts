import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await parseBody<{
      email: string;
      password: string;
      name: string;
    }>(request);

    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse("Email already registered", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    await setAuthCookie(token);

    return jsonResponse({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return errorResponse("Registration failed", 500);
  }
}
