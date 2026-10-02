"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, EmptyState, Skeleton, TableShell } from "../components/ui";
import ExportButtons from "../components/ExportButtons";
import { rupiah } from "@/lib/format";
import { useToast } from "../components/Toast";

type SaldoRow = { kode: string; nama: string; no_rek: string | null; saldo_akhir: number };

export default function DaftarSaldoPage() {
  const toast = useToast();
  const [tipe, setTipe] = useState("TABUNGAN");
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function muat(t: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/daftar-saldo?tipe=${encodeURIComponent(t)}`);
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/daftar-saldo?tipe=TABUNGAN");
        const data = await r.json();
        if (!data.sukses) throw new Error(data.pesan);
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
      } catch (e) {
        if (!cancelled) toast("Gagal: " + (e as Error).message, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setT(t: string) {
    setTipe(t);
    muat(t);
  }

  const tab = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Daftar Saldo" sub="Total per rekening pengganti SUM Excel." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button className={tab(tipe === "TABUNGAN")} onClick={() => setT("TABUNGAN")}>
              Tabungan (H)
            </button>
            <button className={tab(tipe === "PIUTANG")} onClick={() => setT("PIUTANG")}>
              Piutang (P)
            </button>
          </div>
          <ExportButtons
            href={`/api/ekspor?laporan=daftar-saldo&tipe=${encodeURIComponent(tipe)}`}
            disabled={loading || rows.length === 0}
          />
        </div>
        <p className="mb-4 text-xs text-muted">
          Menampilkan posisi kini, bukan snapshot per periode — cetak ulang bulan tutup akan memakai angka terbaru.
        </p>
        {loading ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <TableShell head={["Kode", "Nama", "No Rek", "Saldo Akhir"]}>
              {rows.map((r) => (
                <tr key={r.kode}>
                  <td className="px-3 py-2.5">
                    <strong>{r.kode}</strong>
                  </td>
                  <td className="px-3 py-2.5">{r.nama}</td>
                  <td className="px-3 py-2.5">{r.no_rek ?? "-"}</td>
                  <td className="num px-3 py-2.5">{Number(r.saldo_akhir).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </TableShell>
            <div className="mt-3 flex justify-end rounded-xl bg-slate-50 px-4 py-3 text-sm">
              TOTAL&nbsp;<strong className="num">{rupiah(total)}</strong>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
