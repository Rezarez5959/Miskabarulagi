import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import pool from "./db";
import type { RowDataPacket } from "mysql2/promise";

export const SESSION_COOKIE = "miska_session";
const SESSION_DAYS = 7;

/** Normalisasi UID RFID: trim + uppercase. Return null jika kosong. */
export function normalisasiUid(v: unknown): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "" ? null : s;
}

/** Validasi format UID: 4-50 char alfanumerik. Return pesan error atau null jika OK. */
export function validasiUid(uid: string | null): string | null {
  if (uid === null) return null; // opsional
  if (uid.length < 4) return "UID kartu minimal 4 karakter";
  if (uid.length > 50) return "UID kartu maksimal 50 karakter";
  if (!/^[A-Z0-9]+$/.test(uid)) return "UID kartu hanya boleh huruf/angka (A-Z, 0-9)";
  return null;
}

export type SessionUser = {
  id: number;
  username: string;
  role: "teller" | "admin" | "nasabah";
  kode_bantu: string | null;
  aktif: number;
};

function readTokenFromHeader(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)miska_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function readSessionToken(req?: Request): Promise<string | null> {
  if (req) return readTokenFromHeader(req);
  try {
    const jar = await cookies();
    return jar.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  const token = await readSessionToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.username, u.role, u.kode_bantu, u.aktif FROM tb_session s
       JOIN tb_user u ON u.id = s.id_user
       WHERE s.token = ? AND s.berakhir > NOW() AND u.aktif = 1 LIMIT 1`,
      [token]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as SessionUser;
  } catch {
    return null;
  }
}

/** Pakai di Route Handler: return null jika lolos, return Response jika ditolak. */
export async function requireRole(
  req: Request,
  roles: SessionUser["role"][],
  fail: (pesan: string, status?: number) => Response
): Promise<{ user: SessionUser } | Response> {
  const user = await getSessionUser(req);
  if (!user) return fail("Belum login", 401);
  if (!roles.includes(user.role)) return fail("Akses ditolak untuk role " + user.role, 403);
  return { user };
}

export async function createSession(idUser: number): Promise<{ token: string; berakhir: Date }> {
  const token = randomBytes(32).toString("hex");
  const berakhir = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  const ymd = berakhir.toISOString().slice(0, 19).replace("T", " ");
  await pool.execute("INSERT INTO tb_session (token, id_user, berakhir) VALUES (?,?,?)", [
    token,
    idUser,
    ymd,
  ]);
  return { token, berakhir };
}

export function sessionCookieHeader(token: string): string {
  // Flag Secure hanya saat production/https — di localhost http cookie tanpa
  // Secure tetap terkirim; di production wajib agar tak bocor via http.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_DAYS * 24 * 3600}`;
}

/** Hapus sesi kedaluwarsa milik satu user (dipanggil tiap login sukses). */
export async function bersihkanSesiKedaluarsa(idUser: number): Promise<void> {
  try {
    await pool.execute("DELETE FROM tb_session WHERE id_user = ? AND berakhir < NOW()", [idUser]);
  } catch {
    /* abaikan — pembersihan oportunistik, bukan bagian transaksi login */
  }
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Batas panjang string sesuai kolom DB. Return pesan error atau null jika OK. */
export function batas(v: string, maks: number, nama: string): string | null {
  if (v.length > maks) return `${nama} maksimal ${maks} karakter`;
  return null;
}

/** Batas nominal sesuai DECIMAL(14,2). */
export function batasNominal(n: number, nama = "Nominal"): string | null {
  if (!Number.isFinite(n) || n <= 0) return `${nama} harus > 0`;
  if (n > 999999999999) return `${nama} terlalu besar`;
  return null;
}
/** Tanggal hari ini (waktu lokal server) format YYYY-MM-DD. */
export function tanggalHariIni(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Saldo akhir satu pembantu (rumus kanonis sama seperti /api/pembantu). */
export async function saldoAkhir(
  conn: { execute: typeof pool.execute },
  kode: string
): Promise<{ saldo: number; status: string; nama: string } | null> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT p.nama, p.status, (p.saldo_awal + COALESCE((SELECT SUM(
        CASE WHEN c.pos_saldo = 'Db' THEN (d.debet - d.kredit) ELSE (d.kredit - d.debet) END
      ) FROM tb_jurnal_detail d JOIN tb_coa c ON c.kode_akun = d.kode_akun WHERE d.kode_bantu = p.kode), 0)) AS saldo_akhir
     FROM tb_pembantu p WHERE p.kode = ? LIMIT 1`,
    [kode]
  );
  if (rows.length === 0) return null;
  const r = rows[0] as unknown as { nama: string; status: string; saldo_akhir: string | number };
  return { saldo: Number(r.saldo_akhir), status: r.status, nama: r.nama };
}
