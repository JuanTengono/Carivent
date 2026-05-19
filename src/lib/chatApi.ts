function getChatUrl(): string {
  const url = (import.meta.env.VITE_CHAT_API_URL as string | undefined) ?? "";
  return url.replace(/\/$/, "") || "/api/chat";
}

export async function sendChatMessage(message: string): Promise<string> {
  const res = await fetch(getChatUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) throw new Error(`Error ${res.status}`);

  const json = (await res.json()) as Record<string, unknown>;

  // Soporta { status: "success", data: { reply } } y { success: true, data: { reply } }
  const data = json.data as Record<string, unknown> | undefined;
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.message === "string") return data.message;
  if (typeof json?.reply === "string") return json.reply;
  if (typeof json?.message === "string") return json.message;

  return "No se pudo obtener una respuesta.";
}
