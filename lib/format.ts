// Pengganti assets/app.js — dipakai Client Components.

export function rupiah(n: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return "-";
  return String(text).replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[m];
  });
}

export function isTanggalYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isBulanYm(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}
