import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "miska_session";

// Halaman yang wajib login (API menegakkan role detail via requireRole).
const PROTECTED = [
  "/coa",
  "/nasabah",
  "/pengguna",
  "/jurnal",
  "/pinjaman",
  "/angsuran",
  "/buku-besar",
  "/bb-pembantu",
  "/daftar-saldo",
  "/neraca-lajur",
  "/laba-rugi",
  "/penutup",
  "/merchant",
  "/bayar",
  "/riwayat",
  "/ubah-password",
];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const perluLogin = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!perluLogin) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/login|api/logout|api/me).*)"],
};
