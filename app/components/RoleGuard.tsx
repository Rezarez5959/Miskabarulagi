"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Btn } from "./ui";

type Role = "teller" | "admin" | "nasabah";

// Pembatas halaman per role. Ambil role sekali via /api/me;
// yang tidak berhak melihat pesan + tautan aman (bukan halaman kosong).
export default function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const [state, setState] = useState<"cek" | "ok" | "tolak">("cek");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.sukses && allow.includes(d.user.role as Role)) setState("ok");
        else setState("tolak");
      })
      .catch(() => setState("tolak"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "cek") {
    return (
      <Card>
        <p className="text-sm text-muted">Memeriksa akses...</p>
      </Card>
    );
  }
  if (state === "tolak") {
    return (
      <Card>
        <h3 className="font-semibold text-ink">Akses ditolak 🔒</h3>
        <p className="mt-1 text-sm text-muted">
          Halaman ini hanya untuk {allow.join(" / ")}. Kembali ke halaman yang sesuai role Anda.
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/riwayat">
            <Btn>Riwayat Saya</Btn>
          </Link>
          <Link href="/">
            <Btn variant="secondary">Menu</Btn>
          </Link>
        </div>
      </Card>
    );
  }
  return <>{children}</>;
}
