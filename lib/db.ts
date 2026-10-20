import mysql from "mysql2/promise";

// Pool tunggal untuk semua Route Handlers.
// Pengganti koneksi.php (mysqli_connect + mysqli_set_charset utf8mb4).
// Kompatibel Vercel serverless + MySQL cloud (Aiven/TiDB):
// - DB_SSL=true mengaktifkan TLS (wajib di Aiven)
// - connectionLimit kecil agar hemat koneksi free-tier
const useSsl = process.env.DB_SSL === "true";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASS ?? "",
  database: process.env.DB_NAME ?? "db_ukkcashless",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL ?? 3),
  queueLimit: 20,
  enableKeepAlive: true,
  connectTimeout: 10000,
  charset: "utf8mb4",
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

export default pool;

export function ok<T extends Record<string, unknown>>(extra: T) {
  return Response.json({ sukses: true, ...extra });
}

export function fail(pesan: string, status = 400) {
  return Response.json({ sukses: false, pesan }, { status });
}

/**
 * Respons 500 yang aman: detail error hanya dicatat server-side
 * (console.error) agar struktur DB tidak bocor ke client.
 * Pakai ini di SEMUA blok catch yang tak terduga.
 */
export function gagal(pesan: string, e: unknown): Response {
  console.error(`[api] ${pesan}:`, e);
  return fail(`${pesan.replace(/[:\s]+$/, "")}, coba lagi`, 500);
}

/**
 * Catch transaksi yang JUGA menampung validasi bisnis via `throw new Error`
 * (pesan aman, mis. "Bayar melebihi sisa"). Pembedanya: error driver MySQL
 * selalu membawa `.code` diawali "ER_" → disamarkan (500); selain itu
 * dianggap pesan validasi disengaja → diteruskan apa adanya (400).
 */
export function tangkap(pesan: string, e: unknown): Response {
  const code = (e as { code?: unknown })?.code;
  if (typeof code === "string" && code.startsWith("ER_")) {
    console.error(`[api] ${pesan} (DB ${code}):`, e);
    return fail(`${pesan}, coba lagi`, 500);
  }
  return fail((e as Error).message, 400);
}

/**
 * Escape karakter khusus LIKE (%, _, \) dari input user.
 * Wajib dipakai tiap membangun pola `%...%` agar penyerang tak bisa
 * mengubah arti pencarian (mis. `%` saja = cocok semua + lambat).
 * ATURAN ANTI-INJECTION: nilai user HANYA boleh masuk query lewat
 * placeholder `?` (atau whitelist literal tetap seperti ORDER BY).
 * Jangan pernah interpolasi string user ke SQL.
 */
export function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function periodeTertutup(
  conn: mysql.PoolConnection | mysql.Pool,
  tanggalYmd: string
): Promise<boolean> {
  const bulan = tanggalYmd.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(bulan)) return false;
  const [rows] = await conn.execute("SELECT 1 FROM tb_periode_tutup WHERE bulan = ?", [bulan]);
  return (rows as unknown[]).length > 0;
}
