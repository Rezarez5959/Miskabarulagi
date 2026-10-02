import pool, { ok } from "@/lib/db";
import { clearSessionCookieHeader, readSessionToken } from "@/lib/auth";

// POST /api/logout — hapus sesi + cookie
export async function POST(req: Request) {
  const token = await readSessionToken(req);
  if (token) {
    try {
      await pool.execute("DELETE FROM tb_session WHERE token = ?", [token]);
    } catch {
      /* abaikan */
    }
  }
  const res = ok({});
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
