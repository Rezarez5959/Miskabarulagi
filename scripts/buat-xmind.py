"""Generate docs/konsep-desain.xmind (format XMind Zen: ZIP berisi content.json)."""
import json
import uuid
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "docs" / "konsep-desain.xmind"


def topic(title, children=None):
    t = {"id": uuid.uuid4().hex, "title": title, "modifiedTime": 0}
    if children:
        t["children"] = {"attached": [topic(c[0], c[1] if len(c) > 1 else None) if isinstance(c, tuple) else topic(c) for c in children]}
    return t


CABANG = [
    ("Pengguna", [
        "Teller siswa (input loket)",
        "Admin guru (otorisasi + tutup buku)",
        "Nasabah Hxxx tabungan / Pxxx piutang (baca sendiri)",
    ]),
    ("Transaksi", [
        "Setoran (Db Kas / Kr Tabungan)",
        "Penarikan (Db Tabungan / Kr Kas)",
        "Pinjaman cair + generate angsuran",
        "Angsuran (pokok + bunga 4-100)",
        "Merchant kantin (RFID / QR 5-menit)",
        "Transfer antar-nasabah (roadmap Q1)",
    ]),
    ("Akuntansi", [
        "Jurnal berpasangan otomatis",
        "Buku Besar + BB Pembantu",
        "Neraca Lajur 10-kolom",
        "Laba Rugi berseksi",
        "Jurnal Penutup + kunci periode",
        "Arsip paket Excel 17-sheet",
    ]),
    ("Teknologi", [
        ("UI", ["Next.js 16 + React 19 + Tailwind", "18 halaman responsif"]),
        ("Backend", ["Route Handlers TypeScript", "Transaksi DB atomik", "~30 API"]),
        ("Database", ["MySQL skema tunggal", "tb_jurnal(+detail), piutang, angsuran, periode"]),
    ]),
    ("Keamanan", [
        "L1 Autentikasi (bcrypt + sesi HttpOnly)",
        "L2 Otorisasi role per API",
        "L3 Validasi saldo (anti-overdraft, anti-Kas-negatif)",
        "L4 Kunci periode + buka terbaru",
        "L5 Keterlacakan rupiah ke jurnal",
        "Risiko: rate-limit, audit log, PIN (roadmap)",
    ]),
    ("Operasional", [
        "Panel admin: pengguna, merchant, periode, arsip",
        "Maintenance: VPS, SSL, backup, RFID, SLA, retainer",
        "Basis: 1 SMK 10.000 pengguna",
    ]),
    ("Roadmap", [
        "Q1 Transfer satu sekolah",
        "Q2 Hardening (rate-limit, audit log, PIN)",
        "Q3 Snapshot arsip + dashboard",
        "Q4 Multitenant + super-admin",
    ]),
]

sheet = {
    "id": uuid.uuid4().hex,
    "title": "Konsep Desain",
    "topicPositioning": "tree-right",
    "rootTopic": topic("Bank Miska Cashless", [(c[0], c[1]) for c in CABANG]),
    "modifiedTime": 0,
}
content = json.dumps([sheet], ensure_ascii=False)
meta = json.dumps({"creator": {"name": "Bank Miska", "version": "1.0"}}, ensure_ascii=False)

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("content.json", content)
    z.writestr("metadata.json", meta)
print("OK:", OUT, OUT.stat().st_size, "bytes")
