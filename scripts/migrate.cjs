/* eslint-disable @typescript-eslint/no-require-imports */
// npm run db:migrate — jalankan migrasi tanpa mysql CLI.
// Menjalankan docs/migrasi-merchant.sql + docs/migrasi-pengguna.sql via mysql2
// (multipleStatements), kemudian memperbaiki seed yang rusak
// (mis. hash terpotong akibat import lama) via upsert.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  const f = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}

// password: admin123 / teller123 / siswa123 (bcrypt cost 10)
const SEED_USER = [
  ["admin", "$2b$10$M8lVd7Awcg9elIeumnGw4OgCwT3inxS9W8FZrB9QfayY6Szbif76G", "admin", null],
  ["teller", "$2b$10$r79LVwZEn4zEyw7/5VQIYuHv0LHNRcVW70IEW2ENT5VUXNfWcfgpa", "teller", null],
  ["siswa", "$2b$10$GxlJTq.BXfkEWsXmGsOh0eMms1vgeg3ja7XQphFrgPNdPkIc7Xzsq", "nasabah", "H2478"],
];

(async () => {
  loadEnv();
  const db = process.env.DB_NAME || "db_ukkcashless";
  const useSsl = process.env.DB_SSL === "true";
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    multipleStatements: true,
    connectTimeout: 15000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4`);
  await conn.changeUser({ database: db });
  const docsDir = path.join(__dirname, "..", "..", "docs");
  for (const f of ["migrasi-merchant.sql", "migrasi-pengguna.sql"]) {
    const sqlFile = path.join(docsDir, f);
    if (!fs.existsSync(sqlFile)) continue;
    await conn.query(fs.readFileSync(sqlFile, "utf8"));
    console.log("OK:", f);
  }
  // Upsert seed user agar hash yang rusak ikut sembuh saat migrasi diulang
  for (const [u, h, r, k] of SEED_USER) {
    await conn.execute(
      `INSERT INTO tb_user (username, password_hash, role, kode_bantu) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE password_hash = IF(CHAR_LENGTH(password_hash) < 50, VALUES(password_hash), password_hash)`,
      [u, h, r, k]
    );
  }
  const [users] = await conn.execute("SELECT username, role, aktif, CHAR_LENGTH(password_hash) AS hlen FROM tb_user");
  console.log("OK migrasi selesai. tb_user:", JSON.stringify(users));
  await conn.end();
})().catch((e) => {
  console.error("MIGRATE GAGAL: " + e.message);
  process.exit(1);
});
