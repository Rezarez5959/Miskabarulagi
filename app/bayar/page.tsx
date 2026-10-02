"use client";

import { useRef, useState } from "react";
import { PageHeader, Card, Btn, Field, inputCls } from "../components/ui";
import RoleGuard from "../components/RoleGuard";
import { rupiah } from "@/lib/format";
import { useToast } from "../components/Toast";

type Preview = { kode: string; nama: string; status: string; saldo_akhir: number } | null;

function BayarPageInner() {
  const toast = useToast();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState("");
  const [kodeQr, setKodeQr] = useState("");
  const [uid, setUid] = useState("");
  const [kode, setKode] = useState("");
  const [preview, setPreview] = useState<Preview>(null);
  const [busy, setBusy] = useState(false);

  function fokus() {
    setTimeout(() => scanRef.current?.focus(), 50);
  }

  /** USB wedge: tempelan kartu (UID) atau scan QR (MISKA:...) masuk ke satu kolom. */
  function onScanEnter(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    const v = scan.trim();
    if (!v) return;
    if (v.toUpperCase().startsWith("MISKA:")) {
      const part = v.split(":");
      if (part[1]) {
        setKodeQr(part[1].toUpperCase());
        toast("QR terbaca: " + part[1].toUpperCase());
      }
    } else if (/^[A-Z0-9]{4,}$/i.test(v) && !kodeQr) {
      // heuristik: UID kartu langsung tanpa QR — isi UID
      setUid(v);
      lookupUid(v);
    } else {
      setUid(v);
      lookupUid(v);
    }
    setScan("");
    fokus();
  }

  async function lookupUid(u: string) {
    const v = (u || uid).trim();
    if (!v) return;
    try {
      const r = await fetch(`/api/pembantu-by-uid?uid=${encodeURIComponent(v)}`);
      const data = await r.json();
      if (!data.sukses) {
        setPreview(null);
        return toast(data.pesan, true);
      }
      setPreview(data.data);
      setKode(String(data.data.kode));
    } catch (e) {
      toast("Gagal lookup: " + (e as Error).message, true);
    }
  }

  async function bayar() {
    if (!kodeQr.trim()) return toast("Kode QR wajib diisi (scan QR dulu).", true);
    if (!uid.trim() && !kode.trim()) return toast("Tempel kartu atau isi kode Hxxx.", true);
    setBusy(true);
    try {
      const r = await fetch("/api/bayar-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode_qr: kodeQr.trim().toUpperCase(),
          uid_kartu: uid.trim() || undefined,
          kode_bantu: uid.trim() ? undefined : kode.trim().toUpperCase(),
        }),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast(`Lunas! Jurnal #${data.id_jurnal} — ${data.merchant}, sisa ${rupiah(data.sisa ?? 0)}`);
      setKodeQr("");
      setUid("");
      setKode("");
      setPreview(null);
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setBusy(false);
      fokus();
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Bayar Kantin" sub="Tempel kartu RFID (USB reader) atau scan QR transaksi, lalu Bayar. Potong saldo tabungan Db 3-200." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-ink">1. Scan / Tap</h3>
          <div className="mt-3 space-y-3">
            <Field label="Kolom scan (autofocus — tempel kartu / scan QR di sini, Enter)">
              <input
                ref={scanRef}
                className={inputCls}
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={onScanEnter}
                placeholder="Tempel kartu / scan QR…"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kode QR">
                <input className={inputCls} value={kodeQr} onChange={(e) => setKodeQr(e.target.value.toUpperCase())} placeholder="A9F3…" />
              </Field>
              <Field label="UID Kartu">
                <input
                  className={inputCls}
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  onBlur={() => uid.trim() && lookupUid(uid)}
                  placeholder="0067305985"
                />
              </Field>
            </div>
            <Field label="atau Kode Hxxx manual">
              <input className={inputCls} value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} placeholder="H2478" />
            </Field>
            {preview && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <strong>{preview.kode}</strong> — {preview.nama} • {preview.status} • saldo{" "}
                <strong className="num">{rupiah(preview.saldo_akhir)}</strong>
              </div>
            )}
            <Btn onClick={bayar} disabled={busy}>
              {busy ? "Memproses..." : "Bayar Sekarang"}
            </Btn>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-ink">Alur kasir</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Buat QR di halaman Merchant (nominal belanja, berlaku 5 menit).</li>
            <li>Di halaman ini: scan QR (kolom scan) → kode QR terisi.</li>
            <li>Tempel kartu RFID siswa di kolom yang sama → nama & saldo muncul.</li>
            <li>Klik Bayar — saldo 3-200 terpotong, jurnal BAYAR-MERCHANT tercatat.</li>
            <li>QR yang sama di-scan 2x ditolak (anti double-bayar).</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default function BayarPage() {
  return (
    <RoleGuard allow={["teller", "admin"]}>
      <BayarPageInner />
    </RoleGuard>
  );
}
