/** ISO string → value for `<input type="datetime-local" />` in local TZ */
export function toDatetimeLocalValue(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function fromDatetimeLocalToIso(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}
