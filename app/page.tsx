"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, StatCard, Skeleton, Card } from "./components/ui";
import { rupiah } from "@/lib/format";
import { useToast } from "./components/Toast";

const MASTER = [
  { href: "/riwayat", judul: "Riwayat", desc: "Nasabah: mutasi + saldo milik sendiri. Teller: cek milik nasabah di loket.", icon: "📜", roles: ["teller", "admin", "nasabah"] },
  { href: "/coa", judul: "Master COA", desc: "Daftar akun 1-110 Kas, 1-130 Piutang, 3-200 Tabungan.", icon: "🗂️", roles: ["admin"] },
  { href: "/nasabah", judul: "Master Pembantu", desc: "Kode Hxxx tabungan & Pxxx piutang + saldo akhir.", icon: "👥", roles: ["teller", "admin"] },
  { href: "/jurnal", judul: "Jurnal Setoran & Tarik", desc: "Bukti 1 setoran, bukti 2 penarikan, Db = Kr.", icon: "✍️", roles: ["teller", "admin"] },
  { href: "/pinjaman", judul: "Pencairan Pinjaman", desc: "Db 1-130 / Kr 1-110 + generate angsuran.", icon: "💰", roles: ["teller", "admin"] },
  { href: "/angsuran", judul: "Bayar Angsuran", desc: "Db Kas / Kr Piutang + Kr Bunga 4-100.", icon: "🧾", roles: ["teller", "admin"] },
  { href: "/merchant", judul: "Merchant Kantin", desc: "Buat QR bayar per transaksi (5 menit).", icon: "🏪", roles: ["teller", "admin"] },
  { href: "/bayar", judul: "Bayar RFID/QR", desc: "Tap kartu / scan QR, potong 3-200.", icon: "💳", roles: ["teller", "admin"] },
];

const LAPORAN = [
  { href: "/buku-besar", judul: "Buku Besar", desc: "Mutasi + saldo berjalan per akun.", icon: "📖", roles: ["teller", "admin"] },
  { href: "/bb-pembantu", judul: "BB Pembantu", desc: "Rincian per nasabah Hxxx / Pxxx.", icon: "📒", roles: ["teller", "admin"] },
  { href: "/daftar-saldo", judul: "Daftar Saldo", desc: "Total tabungan & piutang.", icon: "📋", roles: ["teller", "admin", "nasabah"] },
  { href: "/neraca-lajur", judul: "Neraca Lajur", desc: "Neraca saldo per bulan + cek balance.", icon: "⚖️", roles: ["teller", "admin"] },
  { href: "/laba-rugi", judul: "Laba Rugi", desc: "Pendapatan vs biaya + laba bersih.", icon: "📈", roles: ["teller", "admin"] },
  { href: "/penutup", judul: "Jurnal Penutup", desc: "Tutup LR ke 4-300 + kunci periode.", icon: "🔒", roles: ["admin"] },
];

function Kartu({ href, judul, desc, icon }: { href: string; judul: string; desc: string; icon: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-100 hover:shadow-lg"
    >
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">{icon}</div>
      <h3 className="font-semibold text-ink">{judul}</h3>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <span className="mt-3 inline-block text-sm font-semibold text-brand-600 transition group-hover:translate-x-1">
        Buka →
      </span>
    </Link>
  );
}

export default function Home() {
  const toast = useToast();
  const [stats, setStats] = useState<{ kas: number; tabungan: number; piutang: number } | null>(null);
  const [role, setRole] = useState("");
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await fetch("/api/me").then((r) => r.json());
        if (!m.sukses) return; // tamu: tidak tampilkan menu/angka (fail-closed)
        const r = String(m.user.role);
        setRole(r);
        if (r !== "teller" && r !== "admin") return; // ringkasan kas hanya staf
        const [bb, tab, piu] = await Promise.all([
          fetch("/api/buku-besar?kode=1-110").then((x) => x.json()),
          fetch("/api/daftar-saldo?tipe=TABUNGAN").then((x) => x.json()),
          fetch("/api/daftar-saldo?tipe=PIUTANG").then((x) => x.json()),
        ]);
        if (!bb.sukses || !tab.sukses || !piu.sukses) return;
        const last = bb.rows[bb.rows.length - 1];
        setStats({ kas: last ? last.saldo : 0, tabungan: tab.total, piutang: piu.total });
      } catch {
        toast("Gagal memuat ringkasan.", true);
      } finally {
        setSiap(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Sistem Bank Miska" sub="Praktik merchant sekolah: tabungan, pinjaman, dan akuntansi." />
      {!siap ? (
        <Skeleton rows={2} />
      ) : !role ? (
        <Card>
          <p className="text-sm text-muted">Silakan masuk untuk memakai aplikasi.</p>
          <div className="mt-3">
            <a href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              Masuk
            </a>
          </div>
        </Card>
      ) : (
        <>
          {role !== "nasabah" &&
            (!stats ? (
              <Skeleton rows={2} />
            ) : (
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Kas (1-110)" value={rupiah(stats.kas)} />
                <StatCard label="Total Tabungan" value={rupiah(stats.tabungan)} accent="bg-emerald-500" />
                <StatCard label="Total Piutang" value={rupiah(stats.piutang)} accent="bg-amber-500" />
              </div>
            ))}
      <h2 className="mb-3 font-bold text-ink">Master & Transaksi</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MASTER.filter((m) => role && (m.roles as string[]).includes(role)).map((m) => (
          <Kartu key={m.href} {...m} />
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-bold text-ink">Laporan</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LAPORAN.filter((m) => role && (m.roles as string[]).includes(role)).map((m) => (
          <Kartu key={m.href} {...m} />
        ))}
      </div>
        </>
      )}
    </div>
  );
}
