"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Btn, EmptyState, Skeleton, TableShell } from "../components/ui";
import RoleGuard from "../components/RoleGuard";
import { useToast } from "../components/Toast";

type Coa = { kode_akun: string; nama: string; pos_saldo: string; pos_laporan: string };

function CoaPageInner() {
  const toast = useToast();
  const [rows, setRows] = useState<Coa[]>([]);
  const [loading, setLoading] = useState(true);

  async function muat() {
    setLoading(true);
    try {
      const r = await fetch("/api/coa");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      if (!data.sukses) throw new Error(data.pesan);
      setRows(data.data);
    } catch (e) {
      toast("Gagal memuat COA: " + (e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/coa");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json();
        if (!data.sukses) throw new Error(data.pesan);
        if (!cancelled) setRows(data.data);
      } catch (e) {
        if (!cancelled) toast("Gagal memuat COA: " + (e as Error).message, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Master COA" sub="Dari tabel tb_coa via GET /api/coa." />
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">{rows.length} akun</span>
          <Btn variant="secondary" onClick={muat}>
            Muat Ulang
          </Btn>
        </div>
        {loading ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          <EmptyState text="Belum ada COA. Import docs/database.sql." />
        ) : (
          <TableShell head={["Kode", "Nama Akun", "Pos Saldo", "Pos Laporan"]}>
            {rows.map((r) => (
              <tr key={r.kode_akun}>
                <td className="px-3 py-2.5">
                  <strong>{r.kode_akun}</strong>
                </td>
                <td className="px-3 py-2.5">{r.nama}</td>
                <td className="px-3 py-2.5">
                  {r.pos_saldo === "-" ? <span className="text-muted">—</span> : <Badge value={r.pos_saldo} />}
                </td>
                <td className="px-3 py-2.5">{r.pos_laporan}</td>
              </tr>
            ))}
          </TableShell>
        )}
      </Card>
    </div>
  );
}

export default function CoaPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <CoaPageInner />
    </RoleGuard>
  );
}
