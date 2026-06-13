import { clearAuthCookie, getSession } from "@/lib/auth";
import { jsonResponse } from "@/lib/api";

export async function POST() {
  await clearAuthCookie();
  return jsonResponse({ success: true });
}

export async function GET() {
  const session = await getSession();
  return jsonResponse({ user: session });
}
