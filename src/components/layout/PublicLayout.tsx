import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { ChatWidget } from "../chat/ChatWidget";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
        Carivent · Descubre eventos increíbles
      </footer>
      <ChatWidget />
    </div>
  );
}
