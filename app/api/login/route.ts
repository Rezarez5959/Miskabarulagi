import bcrypt from "bcryptjs";
import pool, { ok, fail } from "@/lib/db";
import { createSession, sessionCookieHeader } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";

// POST /api/login {username, password}
export async function POST(req: Request) {
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return fail("Body JSON tidak valid");
  }
  const username = String(input.username ?? "").trim();
  const password = String(input.password ?? "");
  if (!username || !password) return fail("Username dan password wajib diisi");

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, username, password_hash, role, kode_bantu, aktif FROM tb_user WHERE username = ? LIMIT 1",
      [username]
    );
    if (rows.length === 0) {
      console.warn(`[login] user tidak ada: ${username}`);
      return fail("Username/password salah", 401);
    }
    const u = rows[0] as unknown as {
      id: number; username: string; password_hash: string; role: string; kode_bantu: string | null; aktif: number;
    };
    if (!u.aktif) return fail("Akun dinonaktifkan, hubungi admin", 403);
    if (!u.password_hash || u.password_hash.length < 50) {
      console.error(`[login] hash rusak untuk ${username} (len=${u.password_hash?.length ?? 0}), jalankan: npm run db:migrate`);
      return fail("Username/password salah", 401);
    }
    const cocok = await bcrypt.compare(password, u.password_hash);
    if (!cocok) {
      console.warn(`[login] password salah untuk: ${username}`);
      return fail("Username/password salah", 401);
    }
    const { token } = await createSession(u.id);
    const res = ok({ username: u.username, role: u.role, kode_bantu: u.kode_bantu });
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch (e) {
    return fail("Gagal login: " + (e as Error).message, 500);
  }
}
