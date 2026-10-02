"use client";

import { useState } from "react";
import { PageHeader, Card, Btn, inputCls, EmptyState, Skeleton, TableShell } from "../components/ui";
import ExportButtons from "../components/ExportButtons";
import RoleGuard from "../components/RoleGuard";
import { useToast } from "../components/Toast";

type NLRow = { kode_akun: string; nama: string; pos_saldo: string; ns_debet: number; ns_kredit: number };

function NeracaLajurPageInner() {
  const toast = useToast();
  const [bulan, setBulan] = useState("");
  const [rows, setRows] = useState<NLRow[]>([]);
  const [tD, setTD] = useState(0);
  const [tK, setTK] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function muat() {
    if (!/^\d{4}-\d{2}$/.test(bulan)) return toast("Bulan harus format YYYY-MM.", true);
    setLoading(true);
    setSearched(true);
    try {
      const r = await fetch(`/api/neraca-lajur?bulan=${encodeURIComponent(bulan)}`);
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      setRows(data.rows);
      setTD(data.total_ns_debet);
      setTK(data.total_ns_kredit);
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  const balance = Math.abs(tD - tK) < 0.01;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Neraca Lajur" sub="Neraca saldo per bulan." />
      <Card>
        <div className="mb-4 flex max-w-xl flex-wrap gap-2">
          <input className={inputCls} placeholder="2019-12" value={bulan} onChange={(e) => setBulan(e.target.value)} />
          <Btn onClick={muat}>Tampilkan</Btn>
          <ExportButtons
            href={`/api/ekspor?laporan=neraca-lajur&bulan=${encodeURIComponent(bulan)}`}
            disabled={loading || rows.length === 0}
          />
        </div>
        <p className="mb-4 text-xs text-muted">
          Periode yang sudah ditutup bersifat arsip (read-only) — angka per bulan murni dan tidak berubah oleh
          transaksi bulan berikutnya. Unduh via CSV / Excel di atas.
        </p>
        {loading ? (
          <Skeleton />
        ) : !searched ? (
          <EmptyState text="Isi bulan lalu Tampilkan." />
        ) : (
          <>
            <TableShell head={["Kode", "Nama", "Pos", "NS Debet", "NS Kredit"]}>
              {rows.map((r) => (
                <tr key={r.kode_akun}>
                  <td className="px-3 py-2.5">
                    <strong>{r.kode_akun}</strong>
                  </td>
                  <td className="px-3 py-2.5">{r.nama}</td>
                  <td className="px-3 py-2.5">{r.pos_saldo}</td>
                  <td className="num px-3 py-2.5">{Number(r.ns_debet).toLocaleString("id-ID")}</td>
                  <td className="num px-3 py-2.5">{Number(r.ns_kredit).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </TableShell>
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${balance ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
              TOTAL Debet {tD.toLocaleString("id-ID")} = Kredit {tK.toLocaleString("id-ID")}
              {balance ? " — BALANCE ✓" : " — TIDAK BALANCE!"}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function NeracaLajurPage() {
  return (
    <RoleGuard allow={["teller", "admin"]}>
      <NeracaLajurPageInner />
    </RoleGuard>
  );
}
