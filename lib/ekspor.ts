import ExcelJS from "exceljs";
import type { RowObj } from "./laporan";

export type Kolom = { key: string; head: string; num?: boolean; width?: number };

export type SheetPaket = {
  nama: string;
  kolom: Kolom[];
  rows: RowObj[];
  judul: string;
  sub?: string;
  total?: (string | number)[];
};

function sel(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV ramah Excel Indonesia: BOM + delimiter ';' agar angka/tanggal langsung benar.
export function keCSV(kolom: Kolom[], rows: RowObj[]): string {
  const head = kolom.map((k) => sel(k.head)).join(";");
  const lines = rows.map((r) => kolom.map((k) => sel(r[k.key])).join(";"));
  return "﻿" + [head, ...lines].join("\r\n") + "\r\n";
}

export async function keXLSX(
  kolom: Kolom[],
  rows: RowObj[],
  opts: { judul: string; sub?: string; total?: (string | number)[] }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bank Miska";
  isiSheet(wb.addWorksheet("Laporan", { properties: { defaultRowHeight: 18 } }), {
    nama: "Laporan",
    kolom,
    rows,
    judul: opts.judul,
    sub: opts.sub,
    total: opts.total,
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Workbook paket periode: beberapa sheet (Jurnal + Neraca Lajur + Laba Rugi + Daftar Saldo).
export async function kePaketPeriodeXLSX(sheets: SheetPaket[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bank Miska";
  for (const s of sheets) {
    const aman = s.nama.replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "Sheet";
    isiSheet(wb.addWorksheet(aman, { properties: { defaultRowHeight: 18 } }), s);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function isiSheet(ws: ExcelJS.Worksheet, opts: SheetPaket) {
  const kolom = opts.kolom;
  const rows = opts.rows;
  ws.addRow([opts.judul]);
  ws.mergeCells(1, 1, 1, kolom.length);
  const t = ws.getRow(1);
  t.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  if (opts.sub) {
    ws.addRow([opts.sub]);
    ws.mergeCells(2, 1, 2, kolom.length);
    ws.getRow(2).font = { size: 10, color: { argb: "FF64748B" } };
  }
  ws.addRow([]);
  const headIdx = ws.rowCount + 1;
  ws.addRow(kolom.map((k) => k.head));
  const head = ws.getRow(headIdx);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.alignment = { vertical: "middle" };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    c.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  for (const r of rows) {
    ws.addRow(
      kolom.map((k) => {
        const v = r[k.key];
        if (k.num) {
          const n = Number(v);
          return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
        }
        return v === null || v === undefined ? "" : String(v);
      })
    );
  }
  const first = headIdx + 1;
  const last = ws.rowCount;
  if (last >= first) {
    ws.autoFilter = { from: { row: headIdx, column: 1 }, to: { row: last, column: kolom.length } };
    ws.views = [{ state: "frozen", ySplit: headIdx }];
    for (let i = first; i <= last; i++) {
      ws.getRow(i).eachCell((c, n) => {
        if (kolom[n - 1]?.num) c.numFmt = "#,##0";
        c.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    }
  }
  if (opts.total) {
    const tr = ws.addRow(opts.total);
    tr.font = { bold: true };
  }
  kolom.forEach((k, i) => {
    const col = ws.getColumn(i + 1);
    let w = k.width ?? 16;
    if (!k.width) {
      for (const r of rows.slice(0, 200)) {
        w = Math.max(w, Math.min(42, String(r[k.key] ?? "").length + 3));
      }
    }
    col.width = w;
  });
}

export function namaFile(laporan: string, suffix: string, ext: "csv" | "xlsx"): string {
  const aman = `${laporan}-${suffix}`.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `${aman}.${ext}`;
}

// =====================================================================
// PAKET SEKOLAH — workbook gaya contoh (kop + tabel berbingkai + JUMLAH)
// Nol tampil "-" namun tetap numerik via format #,##0;-#,##0;"-".
// =====================================================================

export const KOP_SEKOLAH = "BANK MISKA SMK NEGERI 9 SEMARANG";

const NAMA_BULAN_ID = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

/** "2026-10" → "BULAN OKTOBER 2026" ala contoh. */
export function judulBulan(bulan: string): string {
  const m = bulan.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) return bulan;
  return `BULAN ${NAMA_BULAN_ID[Number(m[2]) - 1]} ${m[1]}`;
}

const FILL_KUNING = "FFFFFF00";
const FILL_HIJAU = "FF92D050";
const FMT_RP = '#,##0;-#,##0;"-"';
const GARIS_HITAM = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
} as const;

export type HeadDef = { text: string; fill?: string };

/** 3 baris kop (nama sekolah + judul + bulan), merge selebar tabel. */
function tulisKop(ws: ExcelJS.Worksheet, judul: string, bulan: string, nKol: number) {
  const kop = [KOP_SEKOLAH, judul, judulBulan(bulan)];
  kop.forEach((t, i) => {
    const r = ws.getRow(i + 1);
    r.getCell(1).value = t;
    r.getCell(1).font = { bold: true, size: i === 0 ? 12 : 11 };
    if (nKol > 1) ws.mergeCells(i + 1, 1, i + 1, nKol);
  });
}

function bingkai(cell: ExcelJS.Cell) {
  cell.border = { ...GARIS_HITAM };
}

/** Tabel berbingkai ala contoh. numIdx = indeks kolom numerik (format Rp/-). */
function tulisTabel(
  ws: ExcelJS.Worksheet,
  mulaiBaris: number,
  heads: HeadDef[],
  rows: (string | number)[][],
  opts: { numIdx?: number[]; total?: (string | number)[]; merah?: boolean } = {}
): number {
  let r = mulaiBaris;
  const hr = ws.getRow(r);
  heads.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h.text;
    c.font = { bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
    if (h.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: h.fill } };
    bingkai(c);
  });
  r++;
  for (const row of rows) {
    const wr = ws.getRow(r);
    row.forEach((v, i) => {
      const c = wr.getCell(i + 1);
      c.value = v === null || v === undefined ? "" : v;
      if (opts.numIdx?.includes(i)) c.numFmt = FMT_RP;
      if (opts.merah) c.font = { color: { argb: "FFFF0000" } };
      bingkai(c);
    });
    r++;
  }
  if (opts.total) {
    const tr = ws.getRow(r);
    opts.total.forEach((v, i) => {
      const c = tr.getCell(i + 1);
      c.value = v === null || v === undefined ? "" : v;
      c.font = { bold: true };
      if (opts.numIdx?.includes(i)) c.numFmt = FMT_RP;
      bingkai(c);
    });
    r++;
  }
  return r;
}

/** Baris info "Label : nilai" (kop BB / BB pembantu). */
function tulisInfo(ws: ExcelJS.Worksheet, baris: number, kiri: [string, string | number][], kanan?: [string, string | number][], kolKanan = 6) {
  const r = ws.getRow(baris);
  r.getCell(1).value = kiri[0]?.[0] ?? "";
  r.getCell(1).font = { bold: true };
  if (kiri[0] !== undefined) r.getCell(3).value = kiri[0][1];
  if (kanan?.[0] !== undefined) {
    r.getCell(kolKanan).value = kanan[0][0];
    r.getCell(kolKanan).font = { bold: true };
    r.getCell(kolKanan + 1).value = kanan[0][1];
  }
}

function namaSheetAman(nama: string): string {
  return nama.replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "Sheet";
}

export type BBRow = { no: number; tanggal: unknown; no_bukti: unknown; keterangan: unknown; debet: number; kredit: number; saldo: number };

export type PaketSekolah = {
  bulan: string;
  jurnal: { rows: RowObj[]; totDb: number; totKr: number; balance: boolean };
  akun: { rows: RowObj[]; totD: number; totK: number };
  nl: { rows: RowObj[]; nsD: number; nsK: number; neD: number; neK: number; laba: number };
  laba: { pend: RowObj[]; biaya: RowObj[]; totPend: number; totBiaya: number; laba: number };
  penutup: { rows: RowObj[]; totDb: number; totKr: number };
  nsp: { rows: RowObj[]; totD: number; totK: number };
  debitur: { rows: RowObj[]; total: number };
  saldoTab: { rows: RowObj[]; total: number };
  kode: { rows: RowObj[] };
  bbAkun: { kode: string; nama: string; pos: string; opening: number; rows: BBRow[]; closing: number }[];
  bbPem: { kode: string; nama: string; pos: string; opening: number; rows: BBRow[]; closing: number }[];
};

export async function kePaketSekolahXLSX(p: PaketSekolah): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bank Miska";
  const JB = p.bulan;

  // ---- Jurnal ----
  {
    const ws = wb.addWorksheet("Jurnal");
    const heads: HeadDef[] = [
      { text: "TANGGAL" }, { text: "BUKTI" }, { text: "KETERANGAN" },
      { text: "KODE AKUN" }, { text: "KODE BANTU" },
      { text: "DEBET", fill: FILL_KUNING }, { text: "KREDIT", fill: FILL_HIJAU },
    ];
    tulisKop(ws, "JURNAL UMUM", JB, heads.length);
    const rows = p.jurnal.rows.map((r) => [
      String(r.tanggal ?? ""), String(r.no_bukti ?? ""), String(r.keterangan ?? ""),
      String(r.kode_akun ?? ""), String(r.kode_bantu ?? ""),
      Number(r.debet), Number(r.kredit),
    ]);
    tulisTabel(ws, 5, heads, rows, {
      numIdx: [5, 6],
      total: ["", "", "", "", `JUMLAH (${rows.length} baris)`, p.jurnal.totDb, p.jurnal.totKr],
    });
    ws.columns = [{ width: 13 }, { width: 10 }, { width: 36 }, { width: 11 }, { width: 11 }, { width: 18 }, { width: 18 }];
  }

  // ---- Akun (master COA + saldo awal) ----
  {
    const ws = wb.addWorksheet("akun");
    const heads: HeadDef[] = [
      { text: "Kode Akun", fill: FILL_KUNING }, { text: "Nama Akun", fill: FILL_KUNING },
      { text: "Pos Saldo", fill: FILL_KUNING }, { text: "Pos Laporan", fill: FILL_KUNING },
      { text: "Saldo Awal Debet", fill: FILL_KUNING }, { text: "Saldo Awal Kredit", fill: FILL_KUNING },
    ];
    tulisKop(ws, "DAFTAR AKUN", JB, heads.length);
    const rows = p.akun.rows.map((r) => [
      String(r.kode_akun), String(r.nama), String(r.pos_saldo), String(r.pos_laporan),
      Number(r.buka_debet), Number(r.buka_kredit),
    ]);
    tulisTabel(ws, 5, heads, rows, {
      numIdx: [4, 5], merah: true,
      total: ["", "JUMLAH", "", "", p.akun.totD, p.akun.totK],
    });
    ws.columns = [{ width: 12 }, { width: 36 }, { width: 11 }, { width: 13 }, { width: 18 }, { width: 18 }];
  }

  // ---- Neraca Lajur 10 kolom ----
  {
    const ws = wb.addWorksheet("NL");
    tulisKop(ws, "NERACA LAJUR", JB, 10);
    const heads: HeadDef[] = [
      { text: "Kode Akun" }, { text: "Nama Akun" }, { text: "Pos Saldo" },
      { text: "NS Debet" }, { text: "NS Kredit" }, { text: "Pos Laporan" },
      { text: "LR Debet" }, { text: "LR Kredit" }, { text: "Neraca Debet" }, { text: "Neraca Kredit" },
    ];
    const rows = p.nl.rows.map((r) => [
      String(r.kode_akun), String(r.nama), String(r.pos_saldo),
      Number(r.ns_debet), Number(r.ns_kredit), String(r.pos_laporan),
      Number(r.lr_debet), Number(r.lr_kredit), Number(r.ne_debet), Number(r.ne_kredit),
    ]);
    tulisTabel(ws, 5, heads, rows, {
      numIdx: [3, 4, 6, 7, 8, 9],
      total: ["", "", "JUMLAH", p.nl.nsD, p.nl.nsK, "", 0, 0, p.nl.neD, p.nl.neK],
    });
    ws.columns = [{ width: 12 }, { width: 34 }, { width: 10 }, { width: 16 }, { width: 16 }, { width: 11 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 16 }];
  }

  // ---- Laba Rugi berseksi ----
  {
    const ws = wb.addWorksheet("laba R");
    tulisKop(ws, "LAPORAN LABA RUGI", JB, 3);
    const heads: HeadDef[] = [{ text: "KODE AKUN" }, { text: "Nama Akun" }, { text: "Saldo" }];
    const rows: (string | number)[][] = [["PENDAPATAN", "", ""]];
    p.laba.pend.forEach((r) => rows.push([String(r.kode_akun), String(r.nama), Number(r.saldo)]));
    rows.push(["", "Jumlah Pendapatan", p.laba.totPend]);
    rows.push(["BIAYA", "", ""]);
    p.laba.biaya.forEach((r) => rows.push([String(r.kode_akun), String(r.nama), Number(r.saldo)]));
    rows.push(["", "Jumlah Biaya", p.laba.totBiaya]);
    rows.push(["", "Jumlah Laba bersih/Rugi bersih", p.laba.laba]);
    tulisTabel(ws, 5, heads, rows, { numIdx: [2] });
    ws.columns = [{ width: 12 }, { width: 40 }, { width: 20 }];
  }

  // ---- Jurnal Penutup ----
  {
    const ws = wb.addWorksheet("Penutup");
    tulisKop(ws, "JURNAL PENUTUP", JB, 7);
    const heads: HeadDef[] = [
      { text: "Tanggal" }, { text: "Bukti" }, { text: "Keterangan" },
      { text: "KodeAkun" }, { text: "Kode Bantu" }, { text: "Debet" }, { text: "Kredit" },
    ];
    const rows = p.penutup.rows.map((r) => [
      String(r.tanggal ?? ""), String(r.no_bukti ?? ""), String(r.keterangan ?? ""),
      String(r.kode_akun ?? ""), String(r.kode_bantu ?? ""),
      Number(r.debet), Number(r.kredit),
    ]);
    if (rows.length === 0) {
      const nr = ws.getRow(5);
      nr.getCell(1).value = "Belum ada jurnal penutup bulan ini.";
      ws.mergeCells(5, 1, 5, heads.length);
    } else {
      tulisTabel(ws, 5, heads, rows, {
        numIdx: [5, 6],
        total: ["", "", "", "", "JUMLAH", p.penutup.totDb, p.penutup.totKr],
      });
    }
    ws.columns = [{ width: 13 }, { width: 10 }, { width: 36 }, { width: 11 }, { width: 11 }, { width: 18 }, { width: 18 }];
  }

  // ---- Neraca Setelah Penutup ----
  {
    const ws = wb.addWorksheet("Neraca S PNTUP");
    tulisKop(ws, "NERACA SETELAH PENUTUP", JB, 5);
    const heads: HeadDef[] = [
      { text: "Kode Akun" }, { text: "Nama Akun" }, { text: "Pos Saldo" },
      { text: "Debet" }, { text: "Kredit" },
    ];
    const rows = p.nsp.rows.map((r) => [
      String(r.kode_akun), String(r.nama), String(r.pos_saldo),
      Number(r.debet), Number(r.kredit),
    ]);
    tulisTabel(ws, 5, heads, rows, {
      numIdx: [3, 4],
      total: ["", "JUMLAH", "", p.nsp.totD, p.nsp.totK],
    });
    ws.columns = [{ width: 12 }, { width: 36 }, { width: 11 }, { width: 18 }, { width: 18 }];
  }

  // ---- Daftar saldo (Debitur + Saldo Tab) & kode pembantu ----
  const tulisDaftar = (
    nama: string, judul: string,
    rows: RowObj[], total: number, awalNotAkhir: boolean
  ) => {
    const ws = wb.addWorksheet(namaSheetAman(nama));
    tulisKop(ws, judul, JB, 7);
    const heads: HeadDef[] = [
      { text: "Kode" }, { text: "Nama" }, { text: "Pos" }, { text: "NO REK" },
      { text: "Status" }, { text: "Rp" }, { text: awalNotAkhir ? "Saldo Awal" : "Saldo" },
    ];
    const key = awalNotAkhir ? "saldo_awal_hit" : "saldo_akhir";
    const body = rows.map((r) => [
      String(r.kode), String(r.nama), String(r.pos ?? (r.status === "PIUTANG" ? "Db" : "Kr")),
      String(r.no_rek ?? ""), String(r.status), "Rp", Number(r[key] ?? 0),
    ]);
    tulisTabel(ws, 5, heads, body, {
      numIdx: [6],
      total: ["", "", "", "", "", "Rp", total],
    });
    ws.columns = [{ width: 10 }, { width: 34 }, { width: 7 }, { width: 12 }, { width: 11 }, { width: 5 }, { width: 20 }];
  };
  tulisDaftar("Debitur", "DAFTAR DEBITUR PEMBANTU", p.debitur.rows, p.debitur.total, false);
  tulisDaftar("Saldo Tab", "DAFTAR SALDO TABUNGAN NASABAH", p.saldoTab.rows, p.saldoTab.total, false);
  tulisDaftar("kode-SA", "DAFTAR KODE PEMBANTU", p.kode.rows, p.kode.rows.reduce((a, r) => a + Number((r as RowObj).saldo_awal_hit ?? 0), 0), true);

  // ---- BB per akun ----
  for (const bb of p.bbAkun) {
    const ws = wb.addWorksheet(namaSheetAman(`BB ${bb.kode}`));
    tulisKop(ws, "BUKU BESAR", JB, 7);
    tulisInfo(ws, 5, [["Kode Akun :", bb.kode]], [["Pos Saldo :", bb.pos]], 6);
    tulisInfo(ws, 6, [["Nama Akun :", bb.nama]], [["Saldo Awal :", bb.opening]], 6);
    const heads: HeadDef[] = [
      { text: "No" }, { text: "Tanggal" }, { text: "Bukti" }, { text: "Keterangan" },
      { text: "Debet" }, { text: "Kredit" }, { text: "Saldo" },
    ];
    const rows = bb.rows.map((r) => [
      r.no, String(r.tanggal ?? ""), String(r.no_bukti ?? ""), String(r.keterangan ?? ""),
      r.debet, r.kredit, r.saldo,
    ]);
    tulisTabel(ws, 8, heads, rows, { numIdx: [4, 5, 6] });
    ws.columns = [{ width: 6 }, { width: 13 }, { width: 10 }, { width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }];
  }

  // ---- BB per nasabah ----
  for (const bb of p.bbPem) {
    const ws = wb.addWorksheet(namaSheetAman(`BB ${bb.kode}`));
    tulisKop(ws, "BUKU BESAR PEMBANTU", JB, 7);
    tulisInfo(ws, 5, [["Kode Pembantu :", bb.kode]], [["Pos Saldo :", bb.pos]], 6);
    tulisInfo(ws, 6, [["Nama Relasi :", bb.nama]], [["Saldo Awal :", bb.opening]], 6);
    const heads: HeadDef[] = [
      { text: "No" }, { text: "Tanggal" }, { text: "Bukti" }, { text: "Keterangan" },
      { text: "Debet" }, { text: "Kredit" }, { text: "Saldo" },
    ];
    const rows = bb.rows.map((r) => [
      r.no, String(r.tanggal ?? ""), String(r.no_bukti ?? ""), String(r.keterangan ?? ""),
      r.debet, r.kredit, r.saldo,
    ]);
    tulisTabel(ws, 8, heads, rows, { numIdx: [4, 5, 6] });
    ws.columns = [{ width: 6 }, { width: 13 }, { width: 10 }, { width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
