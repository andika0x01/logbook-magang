import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function meta() {
  return [{ title: "Logbook Magang | PT. Microdata Indonesia" }, { name: "description", content: "Industrial Telemetry Logbook - PT. Microdata Indonesia" }];
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap",
  },
  { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/@fontsource/geist-mono/index.css",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="relative min-h-screen selection:bg-white selection:text-black font-mono">
        <div className="scanline"></div>
        <div className="crt-glow"></div>

        <header className="border-b border-mission-border px-4 md:px-10 h-16 md:h-20 flex justify-between items-center bg-black/90 backdrop-blur-md sticky top-0 z-[100]">
          <div className="flex items-center gap-4 md:gap-10">
            <a href="/" className="flex items-center gap-3 group">
              <h1 className="text-[14px] md:text-[18px] font-black tracking-[0.2em] md:tracking-[0.3em] text-white uppercase group-hover:text-white transition-colors">
                LOGBOOK MAGANG
              </h1>
            </a>
            <div className="hidden lg:block h-6 w-[1px] bg-mission-border"></div>
            <div className="hidden lg:flex gap-8 items-center">
              <span className="terminal-label">Uplink: Stable</span>
              <span className="terminal-label">Auth: Verified</span>
            </div>
          </div>

          <nav className="flex items-center gap-4 md:gap-12">
            <a href="/" className="text-[11px] md:text-[14px] font-black uppercase tracking-[0.1em] md:tracking-[0.25em] text-zinc-400 hover:text-white transition-colors">
              Console
            </a>
            <a
              href="/logout"
              className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.1em] md:tracking-[0.25em] px-3 py-1.5 md:px-6 md:py-2 border border-mission-border text-zinc-400 hover:border-white hover:text-white transition-all"
            >
              Logout
            </a>
          </nav>
        </header>

        <main className="relative z-10 min-h-[calc(100vh-140px)] font-mono">{children}</main>

        <footer className="border-t border-mission-border h-auto md:h-14 py-4 md:py-0 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-black text-[10px] md:text-[11px] font-black tracking-[0.15em] text-zinc-600 gap-2 md:gap-0 font-mono">
          <div className="flex gap-4 md:gap-8">
            <span>STATUS: NOMINAL</span>
            <span className="text-white/10">|</span>
            <span>FEED: ENCRYPTED</span>
          </div>
          <div className="flex gap-4 md:gap-8 uppercase opacity-50 md:opacity-100">
            <span>LOC: SBY_STATION</span>
            <span>BUILD: PROD_STABLE</span>
          </div>
        </footer>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "CRITICAL SYSTEM FAILURE";
  let details = "Unexpected interrupt in data stream.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "NODE NOT FOUND" : "STREAM ERROR";
    details = error.status === 404 ? "Target coordinate does not exist in local space." : error.statusText;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-6 md:p-12 text-center bg-black font-mono">
      <div className="console-panel max-w-3xl w-full border-red-900/50">
        <div className="console-header bg-red-950/20 border-red-900/30 h-auto py-2">
          <span className="text-red-500 font-black tracking-widest text-[10px] md:text-[12px]"># EXCEPTION HANDLER</span>
        </div>
        <div className="p-8 md:p-16">
          <h1 className="text-red-500 text-3xl md:text-5xl font-black mb-4 md:mb-8 uppercase tracking-tighter">{message}</h1>
          <p className="text-red-400/60 mb-8 md:mb-12 font-mono text-sm md:text-lg leading-relaxed uppercase">{details}</p>
          {stack && (
            <pre className="p-4 md:p-8 bg-red-950/20 border border-red-900/30 overflow-x-auto text-[10px] md:text-[12px] text-red-500/40 mb-8 md:mb-12 font-mono text-left">
              <code>{stack}</code>
            </pre>
          )}
          <a href="/" className="mission-btn border-red-900 text-red-500 hover:bg-red-500 hover:text-black hover:border-red-500 px-8 md:px-12 py-3 md:py-5 text-sm md:text-base">
            Reboot System
          </a>
        </div>
      </div>
    </main>
  );
}
