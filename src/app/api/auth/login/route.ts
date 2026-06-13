import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";
import { errorResponse, jsonResponse, parseBody } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await parseBody<{
      email: string;
      password: string;
    }>(request);

    if (!email || !password) {
      return errorResponse("Email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return errorResponse("Invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return errorResponse("Invalid credentials", 401);

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
    return errorResponse("Login failed", 500);
  }
}
