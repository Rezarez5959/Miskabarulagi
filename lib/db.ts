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

export async function periodeTertutup(
  conn: mysql.PoolConnection | mysql.Pool,
  tanggalYmd: string
): Promise<boolean> {
  const bulan = tanggalYmd.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(bulan)) return false;
  const [rows] = await conn.execute("SELECT 1 FROM tb_periode_tutup WHERE bulan = ?", [bulan]);
  return (rows as unknown[]).length > 0;
}
