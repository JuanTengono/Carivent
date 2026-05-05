export function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatTimeRange(start: string, end: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" });
    return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
  } catch {
    return `${start} – ${end}`;
  }
}
