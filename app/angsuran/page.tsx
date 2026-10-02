"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn, Field, inputCls } from "../components/ui";
import RoleGuard from "../components/RoleGuard";
import { rupiah } from "@/lib/format";
import { useToast } from "../components/Toast";

type Piutang = { id: number; kode_bantu: string; nama: string; sisa: number; tenor: number; status: string; lunas_ke: number; total_angsuran: number };

function AngsuranPageInner() {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [daftar, setDaftar] = useState<Piutang[]>([]);
  const [id, setId] = useState("");
  const [bayar, setBayar] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState("");

  const pilih = daftar.find((d) => String(d.id) === id);

  async function muat() {
    try {
      const r = await fetch("/api/piutang?status=berjalan");
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      setDaftar(data.data);
      if (data.data.length > 0 && !id) {
        setId(String(data.data[0].id));
        setBayar(String(data.data[0].sisa));
      }
    } catch (e) {
      toast("Gagal muat piutang: " + (e as Error).message, true);
    }
  }

  useEffect(() => {
    (async () => {
      await muat();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bayarAngsuran() {
    const body = { tanggal, id_piutang: parseInt(id, 10) || 0, bayar: parseFloat(bayar) || 0 };
    if (!body.tanggal || body.id_piutang <= 0 || body.bayar <= 0)
      return toast("Tanggal, ID piutang, dan bayar > 0 wajib diisi.", true);
    setBusy(true);
    try {
      const r = await fetch("/api/angsuran-bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast(`Tersimpan. Jurnal #${data.id_jurnal}`);
      setHasil(`Pokok ${rupiah(data.pokok)} — Bunga ${rupiah(data.bunga)} — Sisa ${rupiah(data.sisa)} (${data.status})`);
      setBayar("");
      muat();
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Bayar Angsuran" sub="Db 1-110 Kas lawan Kr 1-130 pokok + Kr 4-100 bunga." />
      <Card>
        <div className="space-y-3">
          <Field label="Tanggal Bayar">
            <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Piutang Berjalan">
            <select
              className={inputCls}
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                const p = daftar.find((d) => String(d.id) === e.target.value);
                if (p) setBayar(String(p.sisa));
              }}
            >
              <option value="">— pilih piutang —</option>
              {daftar.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} {d.kode_bantu} {d.nama} — sisa {rupiah(d.sisa)} ({d.lunas_ke}/{d.total_angsuran} lunas)
                </option>
              ))}
            </select>
          </Field>
          {pilih && (
            <p className="text-xs text-muted">
              Cicilan ke-{pilih.lunas_ke + 1} dari {pilih.total_angsuran} • tenor {pilih.tenor} bln
            </p>
          )}
          <Field label="Jumlah Bayar (Rp)">
            <input className={inputCls} type="number" min={1} value={bayar} onChange={(e) => setBayar(e.target.value)} placeholder="808000" />
          </Field>
          <Btn onClick={bayarAngsuran} disabled={busy}>
            {busy ? "Memproses..." : "Simpan Pembayaran"}
          </Btn>
          {hasil && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{hasil}</div>}
        </div>
      </Card>
    </div>
  );
}

export default function AngsuranPage() {
  return (
    <RoleGuard allow={["teller", "admin"]}>
      <AngsuranPageInner />
    </RoleGuard>
  );
}
