type Props = {
  role: "user" | "bot";
  text: string;
};

export function ChatBubble({ role, text }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          C
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm bg-brand text-white"
            : "rounded-bl-sm border border-white/10 bg-surface-elevated text-zinc-200"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
