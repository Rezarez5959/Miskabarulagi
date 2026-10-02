import { NextRequest } from "next/server";
import pool, { ok, fail } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";

// GET /api/daftar-saldo?tipe=PIUTANG — butuh login (semua role)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return fail("Belum login", 401);
  const tipe = (req.nextUrl.searchParams.get("tipe") ?? "").toUpperCase();
  if (tipe !== "TABUNGAN" && tipe !== "PIUTANG") return fail("tipe harus TABUNGAN atau PIUTANG");

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.kode, p.nama, p.no_rek, p.status, p.saldo_awal,
        (p.saldo_awal + COALESCE((SELECT SUM(
          CASE WHEN c.pos_saldo = 'Db' THEN (d.debet - d.kredit) ELSE (d.kredit - d.debet) END
        ) FROM tb_jurnal_detail d JOIN tb_coa c ON c.kode_akun = d.kode_akun WHERE d.kode_bantu = p.kode), 0)) AS saldo_akhir
       FROM tb_pembantu p WHERE p.status = ? ORDER BY p.nama ASC`,
      [tipe]
    );
    const list = rows as Record<string, unknown>[];
    const total = Math.round(list.reduce((a, r) => a + Number(r.saldo_akhir), 0) * 100) / 100;
    return ok({ tipe, total, rows: list });
  } catch (e) {
    return fail("Gagal baca daftar saldo: " + (e as Error).message, 500);
  }
}
