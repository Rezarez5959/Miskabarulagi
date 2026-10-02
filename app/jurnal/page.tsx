"use client";

import { useRef, useState } from "react";
import { PageHeader, Card, Btn, Field, inputCls } from "../components/ui";
import RoleGuard from "../components/RoleGuard";
import { rupiah } from "@/lib/format";
import { useToast } from "../components/Toast";

type Rincian = { kode: string; jumlah: string };
type SaldoInfo = { nama: string; saldo: number };
type StrukItem = { kode: string; nama: string; jumlah: number; sisa: number };
type Struk = { id: number; tanggal: string; total: number; items: StrukItem[] };

function JurnalPageInner() {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [sTanggal, setSTanggal] = useState(today);
  const [sBukti, setSBukti] = useState("1");
  const [rincian, setRincian] = useState<Rincian[]>([{ kode: "", jumlah: "" }]);
  const [busySetor, setBusySetor] = useState(false);
  const [scanS, setScanS] = useState("");
  const [saldoMap, setSaldoMap] = useState<Record<string, SaldoInfo>>({});
  const [struk, setStruk] = useState<Struk | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [tTanggal, setTTanggal] = useState(today);
  const [tBukti, setTBukti] = useState("2");
  const [tKode, setTKode] = useState("");
  const [tJumlah, setTJumlah] = useState("");
  const [busyTarik, setBusyTarik] = useState(false);

  const total = rincian.reduce((a, r) => a + (parseFloat(r.jumlah) || 0), 0);

  async function kirimSetoran() {
    const bersih = rincian
      .map((r) => ({ kode_bantu: r.kode.trim().toUpperCase(), jumlah: parseFloat(r.jumlah) || 0 }))
      .filter((r) => r.kode_bantu && r.jumlah > 0);
    if (!sTanggal) return toast("Tanggal wajib diisi.", true);
    if (bersih.length === 0) return toast("Tambah minimal 1 rincian valid.", true);
    setBusySetor(true);
    try {
      const r = await fetch("/api/jurnal-setoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal: sTanggal, bukti: sBukti || "1", rincian: bersih }),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast(`Setoran tersimpan. ID jurnal #${data.id_jurnal}, total ${rupiah(data.total)}`);
      // Susun struk: ambil sisa saldo tiap nasabah
      const items: StrukItem[] = [];
      for (const b of bersih) {
        try {
          const rr = await fetch(`/api/riwayat?kode=${encodeURIComponent(b.kode_bantu)}`);
          const dd = await rr.json();
          items.push({
            kode: b.kode_bantu,
            nama: dd.sukses ? String(dd.pembantu.nama) : saldoMap[b.kode_bantu]?.nama || "-",
            jumlah: b.jumlah,
            sisa: dd.sukses ? Number(dd.saldo_akhir) : 0,
          });
        } catch {
          items.push({ kode: b.kode_bantu, nama: saldoMap[b.kode_bantu]?.nama || "-", jumlah: b.jumlah, sisa: 0 });
        }
      }
      setStruk({ id: data.id_jurnal, tanggal: sTanggal, total: data.total, items });
      setRincian([{ kode: "", jumlah: "" }]);
      setSaldoMap({});
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setBusySetor(false);
    }
  }

  // Tap kartu RFID di form setoran: isi baris + tampilkan saldo buku vs sistem
  async function tapSetoran(uidMentah: string) {
    const uid = uidMentah.trim();
    if (!uid) return;
    try {
      const r = await fetch(`/api/pembantu-by-uid?uid=${encodeURIComponent(uid)}`);
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      const kode = String(data.data.kode);
      setSaldoMap((m) => ({ ...m, [kode]: { nama: String(data.data.nama), saldo: Number(data.data.saldo_akhir) } }));
      setRincian((rs) => {
        const idx = rs.findIndex((x) => !x.kode.trim());
        if (idx >= 0) return rs.map((x, j) => (j === idx ? { ...x, kode } : x));
        return [...rs, { kode, jumlah: "" }];
      });
      toast(`${kode} ${data.data.nama} — saldo ${rupiah(data.data.saldo_akhir)}`);
    } catch (e) {
      toast("Gagal lookup: " + (e as Error).message, true);
    } finally {
      setScanS("");
      setTimeout(() => scanRef.current?.focus(), 50);
    }
  }

  async function kirimPenarikan() {
    const body = { tanggal: tTanggal, bukti: tBukti || "2", kode_bantu: tKode.trim().toUpperCase(), jumlah: parseFloat(tJumlah) || 0 };
    if (!body.tanggal || !body.kode_bantu || body.jumlah <= 0)
      return toast("Tanggal, kode, dan jumlah > 0 wajib diisi.", true);
    setBusyTarik(true);
    try {
      const r = await fetch("/api/jurnal-penarikan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast(`Penarikan tersimpan. ID jurnal #${data.id_jurnal}`);
      setTKode("");
      setTJumlah("");
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setBusyTarik(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Jurnal" sub="Setoran (Bukti 1): Db 1-110 / Kr 3-200. Penarikan (Bukti 2): Db 3-200 / Kr 1-110." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-ink">Setoran (Bukti 1)</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={sTanggal} onChange={(e) => setSTanggal(e.target.value)} />
            </Field>
            <Field label="No Bukti">
              <input className={inputCls} value={sBukti} onChange={(e) => setSBukti(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Tap kartu RFID (cocokkan saldo buku tabungan — Enter)">
              <input
                ref={scanRef}
                className={inputCls}
                value={scanS}
                onChange={(e) => setScanS(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") tapSetoran(scanS);
                }}
                placeholder="Tempel kartu siswa di sini…"
              />
            </Field>
          </div>
          {rincian.map((r, i) => (
            <div key={i} className="mt-2 flex gap-2">
              <input
                className={inputCls}
                placeholder="Kode Hxxx"
                value={r.kode}
                onChange={(e) => setRincian(rincian.map((x, j) => (j === i ? { ...x, kode: e.target.value } : x)))}
              />
              <input
                className={inputCls}
                type="number"
                min={1}
                placeholder="Jumlah"
                value={r.jumlah}
                onChange={(e) => setRincian(rincian.map((x, j) => (j === i ? { ...x, jumlah: e.target.value } : x)))}
              />
              <Btn variant="secondary" onClick={() => setRincian(rincian.filter((_, j) => j !== i))}>
                ×
              </Btn>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between">
            <Btn variant="ghost" onClick={() => setRincian([...rincian, { kode: "", jumlah: "" }])}>
              + Tambah Nasabah
            </Btn>
            <span className="text-sm text-muted">
              Total: <strong className="num text-ink">{rupiah(total)}</strong>
            </span>
          </div>
          {Object.keys(saldoMap).length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              {Object.entries(saldoMap).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>
                    <strong>{k}</strong> {v.nama}
                  </span>
                  <span className="num font-semibold">saldo {rupiah(v.saldo)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Btn onClick={kirimSetoran} disabled={busySetor}>
              {busySetor ? "Menyimpan..." : "Simpan Setoran"}
            </Btn>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-ink">Penarikan (Bukti 2)</h3>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal">
                <input type="date" className={inputCls} value={tTanggal} onChange={(e) => setTTanggal(e.target.value)} />
              </Field>
              <Field label="No Bukti">
                <input className={inputCls} value={tBukti} onChange={(e) => setTBukti(e.target.value)} />
              </Field>
            </div>
            <Field label="Kode Pembantu (Hxxx)">
              <input className={inputCls} value={tKode} onChange={(e) => setTKode(e.target.value)} placeholder="H2412" />
            </Field>
            <Field label="Jumlah">
              <input className={inputCls} type="number" min={1} value={tJumlah} onChange={(e) => setTJumlah(e.target.value)} placeholder="200000" />
            </Field>
            <Btn onClick={kirimPenarikan} disabled={busyTarik}>
              {busyTarik ? "Menyimpan..." : "Simpan Penarikan"}
            </Btn>
          </div>
        </Card>
      </div>
      {struk && (
        <Card className="mt-5">
          <h3 className="font-semibold text-ink">Bukti Setoran #{struk.id}</h3>
          <p className="mt-1 text-sm text-muted">
            Bank Miska • {struk.tanggal} • tempel ke buku tabungan
          </p>
          <div className="mt-3 space-y-1 text-sm">
            {struk.items.map((it) => (
              <div key={it.kode} className="flex justify-between border-b border-dashed border-slate-200 py-1">
                <span>
                  <strong>{it.kode}</strong> {it.nama} — setor {rupiah(it.jumlah)}
                </span>
                <span className="num font-semibold">sisa {rupiah(it.sisa)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-bold">
              <span>Total</span>
              <span className="num">{rupiah(struk.total)}</span>
            </div>
          </div>
          <div className="no-print mt-3 flex gap-2">
            <Btn variant="secondary" onClick={() => window.print()}>
              🖨️ Cetak
            </Btn>
            <Btn variant="ghost" onClick={() => setStruk(null)}>
              Tutup
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function JurnalPage() {
  return (
    <RoleGuard allow={["teller", "admin"]}>
      <JurnalPageInner />
    </RoleGuard>
  );
}
