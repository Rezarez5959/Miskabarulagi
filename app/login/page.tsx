"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Card, Btn, Field, inputCls } from "../components/ui";
import { useToast } from "../components/Toast";

function LoginForm() {
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [busy, setBusy] = useState(false);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return toast("Username dan password wajib diisi.", true);
    setBusy(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast(`Masuk sebagai ${data.username} (${data.role})`);
      router.push(sp.get("next") || "/");
      router.refresh();
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Masuk" sub="Teller siswa, admin guru, atau nasabah. Demo: admin/admin123, teller/teller123, siswa/siswa123." />
      <Card>
        <form onSubmit={masuk} className="space-y-3">
          <Field label="Username">
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <input
                className={inputCls}
                type={lihat ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
              <Btn variant="secondary" onClick={() => setLihat(!lihat)}>
                {lihat ? "🙈" : "👁️"}
              </Btn>
            </div>
          </Field>
          <Btn type="submit" disabled={busy}>
            {busy ? "Memeriksa..." : "Masuk"}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
