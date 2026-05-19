import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChatBubble } from "./ChatBubble";
import { sendChatMessage } from "../../lib/chatApi";

type Message = { id: number; role: "user" | "bot"; text: string };

const WELCOME: Message = {
  id: -1,
  role: "bot",
  text: "¡Hola! Soy el asistente de Carivent. ¿En qué puedo ayudarte hoy?",
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const openPanel = () => {
    setPanelVisible(true);
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    if (!panelRef.current || reducedMotion()) {
      setPanelVisible(false);
      return;
    }
    gsap.to(panelRef.current, {
      scale: 0,
      opacity: 0,
      transformOrigin: "bottom right",
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => setPanelVisible(false),
    });
  };

  useEffect(() => {
    if (!panelVisible || !panelRef.current) return;
    if (reducedMotion()) {
      inputRef.current?.focus();
      return;
    }
    gsap.fromTo(
      panelRef.current,
      { scale: 0, opacity: 0, transformOrigin: "bottom right" },
      {
        scale: 1,
        opacity: 1,
        duration: 0.38,
        ease: "back.out(1.4)",
        onComplete: () => inputRef.current?.focus(),
      }
    );
  }, [panelVisible]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [...prev, { id: nextId.current++, role: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "bot",
          text: "Lo siento, ocurrió un error al conectarme. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {panelVisible && (
        <div
          ref={panelRef}
          className="flex w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-card"
          style={{ maxHeight: "480px" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-surface-elevated px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-[0_0_12px_rgba(131,12,196,0.4)]">
                C
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Carivent Bot</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-xs text-zinc-500">En línea</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: 0 }}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
            ))}

            {loading && (
              <div className="flex items-end justify-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  C
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-surface-elevated px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe tu pregunta…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-brand disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 rotate-90"
                >
                  <path d="M3.105 3.105a.75.75 0 0 1 .814-.153l13.5 6a.75.75 0 0 1 0 1.096l-13.5 6a.75.75 0 0 1-1.05-.832l1.5-5.25a.75.75 0 0 1 .585-.586L9.75 9.085a.75.75 0 0 0 0-1.17L4.954 6.72a.75.75 0 0 1-.585-.586l-1.5-5.25a.75.75 0 0 1 .236-.779Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={open ? closePanel : openPanel}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl shadow-[0_0_28px_rgba(131,12,196,0.55)] transition-transform duration-200 hover:scale-110 active:scale-95"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
      >
        {open ? (
          <span className="text-sm font-bold text-white">✕</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-white"
          >
            <path
              fillRule="evenodd"
              d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v3.878c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
