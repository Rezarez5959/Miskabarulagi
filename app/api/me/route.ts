import { ok, fail } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/me — info sesi saat ini
export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return fail("Belum login", 401);
  return ok({ user });
}
