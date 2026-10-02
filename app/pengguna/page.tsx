"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn, Field, inputCls, Badge, EmptyState, Skeleton, TableShell } from "../components/ui";
import RoleGuard from "../components/RoleGuard";
import { useToast } from "../components/Toast";

type User = { id: number; username: string; role: string; kode_bantu: string | null; aktif: number; nama_nasabah: string | null };

function PenggunaPageInner() {
  const toast = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [roleSaya, setRoleSaya] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "nasabah", kode_bantu: "" });

  const isAdmin = roleSaya === "admin";

  async function muat() {
    setLoading(true);
    try {
      const r = await fetch("/api/pengguna");
      const data = await r.json();
      if (!data.sukses) {
        toast(data.pesan, true);
        return;
      }
      setRows(data.data);
      setRoleSaya(String(data.role_saya));
      if (data.role_saya !== "admin") setForm((f) => ({ ...f, role: "nasabah" }));
    } catch (e) {
      toast("Gagal memuat: " + (e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await muat();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/pengguna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast("User tersimpan: " + data.username);
      setForm({ username: "", password: "", role: "nasabah", kode_bantu: "" });
      muat();
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: number, body: Record<string, unknown>, tanya: string) {
    if (!confirm(tanya)) return;
    try {
      const r = await fetch("/api/pengguna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast("Tersimpan.");
      muat();
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    }
  }

  function resetPw(u: User) {
    const pw = prompt(`Password baru untuk ${u.username} (min 6 karakter):`);
    if (pw === null) return;
    patch(u.id, { password: pw }, `Reset password ${u.username}?`);
  }

  function ubahTaut(u: User) {
    const k = prompt(`Tautkan ${u.username} ke kode (Hxxx/Pxxx, kosongkan untuk lepas):`, u.kode_bantu || "");
    if (k === null) return;
    patch(u.id, { kode_bantu: k }, `Ubah tautan ${u.username} ke ${k || "-"}?`);
  }

  async function hapus(u: User) {
    if (!confirm(`Hapus permanen ${u.username}? (lebih aman: Nonaktifkan)`)) return;
    try {
      const r = await fetch("/api/pengguna", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await r.json();
      if (!data.sukses) return toast(data.pesan, true);
      toast("Terhapus: " + u.username);
      muat();
    } catch (e) {
      toast("Gagal: " + (e as Error).message, true);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kelola Pengguna"
        sub={isAdmin ? "Admin: CRUD semua role + reset password + aktif/nonaktif." : "Teller: buat/lihat user nasabah + reset password nasabah."}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h3 className="font-semibold text-ink">Tambah User</h3>
          <form onSubmit={tambah} className="mt-3 space-y-3">
            <Field label="Username">
              <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="siswa2" />
            </Field>
            <Field label="Password (min 6)">
              <input className={inputCls} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
            </Field>
            <Field label="Role">
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={!isAdmin}
              >
                <option value="nasabah">Nasabah (siswa)</option>
                {isAdmin && <option value="teller">Teller (petugas)</option>}
                {isAdmin && <option value="admin">Admin (guru)</option>}
              </select>
            </Field>
            <Field label="Taut ke kode (Hxxx/Pxxx, wajib untuk nasabah)">
              <input
                className={inputCls}
                value={form.kode_bantu}
                onChange={(e) => setForm({ ...form, kode_bantu: e.target.value.toUpperCase() })}
                placeholder="H2412"
              />
            </Field>
            <Btn type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Btn>
          </form>
        </Card>
        <Card>
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <TableShell head={["User", "Role", "Tautan", "Aktif", "Aksi"]}>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2.5">
                    <strong>{u.username}</strong>
                    <div className="text-xs text-muted">#{u.id}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge value={u.role} />
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {u.kode_bantu ? (
                      <>
                        <strong>{u.kode_bantu}</strong> {u.nama_nasabah || ""}
                      </>
                    ) : (
                      "-"
                    )}
                    {isAdmin && (
                      <button onClick={() => ubahTaut(u)} className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-bold hover:bg-slate-200">
                        Ubah
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        u.aktif ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u.aktif ? "aktif" : "nonaktif"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => resetPw(u)} className="rounded-md bg-slate-100 px-2 py-0.5 font-bold hover:bg-slate-200">
                        Reset PW
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            patch(u.id, { aktif: u.aktif ? 0 : 1 }, `${u.aktif ? "Nonaktifkan" : "Aktifkan"} ${u.username}?`)
                          }
                          className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-800 hover:bg-amber-200"
                        >
                          {u.aktif ? "Nonaktif" : "Aktifkan"}
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => hapus(u)} className="rounded-md bg-red-100 px-2 py-0.5 font-bold text-red-700 hover:bg-red-200">
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function PenggunaPage() {
  return (
    <RoleGuard allow={["teller", "admin"]}>
      <PenggunaPageInner />
    </RoleGuard>
  );
}
