import { env } from "cloudflare:workers";
import { getCurrentUser } from "../lib/auth";
import { getSpaces } from "../lib/db";
import type { Route } from "./+types/spaces";
import { motion } from "framer-motion";

export function meta() {
  return [{ title: "DIRECTORY // PILOT TERMINALS" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getCurrentUser(request, env as any);
  const spaces = await getSpaces();
  
  return { 
    user: session?.user || null, 
    spaces: spaces || [],
  };
}

export default function Spaces({ loaderData }: Route.ComponentProps) {
  const { user, spaces } = loaderData;

  if (!user) {
    return (
      <main className="flex items-center justify-center min-h-[85vh] p-4 md:p-10 font-mono text-zinc-400 uppercase">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="console-panel max-w-xl w-full border-2 border-mission-border"
        >
          <div className="console-header h-12 md:h-14 px-4 md:px-6 bg-mission-gray">
            <span className="terminal-label text-[11px] md:text-[13px]"># SYSTEM AUTH GATEWAY</span>
          </div>
          <div className="p-8 md:p-16 text-center">
            <h2 className="text-white text-2xl md:text-4xl font-black mb-4 md:mb-6 tracking-tighter">Access Required</h2>
            <p className="text-zinc-400 text-sm md:text-base mb-8 md:mb-12 leading-relaxed uppercase tracking-wider font-bold">Secure terminal link requires pilot identification.</p>
            <a href="/login/google" className="mission-btn w-full py-4 md:py-6 text-[14px] md:text-[18px] text-white border-2 border-white/10 hover:border-white hover:text-black shadow-[0_0_50px_rgba(255,255,255,0.05)] font-black">
              Login with Google
            </a>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="p-4 md:p-10 lg:p-20 font-mono">
      <div className="mb-12 lg:mb-20 border-b-2 border-mission-border pb-8 lg:pb-12">
        <h2 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase mb-2 md:mb-4 leading-none text-zinc-100">Pilot Terminals</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Active Nodes: {spaces.length}</span>
          <span className="hidden md:inline text-white/10 text-2xl">•</span>
          <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Select terminal to view log stream</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space: any, index: number) => (
          <motion.a 
            key={space.id}
            href={`/u/${space.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="console-panel group hover:border-white transition-all block"
          >
            <div className="console-header py-2 px-4 bg-mission-gray border-b border-mission-border flex justify-between items-center group-hover:bg-white group-hover:text-black transition-colors">
              <span className="terminal-label group-hover:text-black">TERMINAL_{String(index + 1).padStart(2, '0')}</span>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
            <div className="p-8 flex items-center gap-6">
              <img src={space.avatar} className="w-16 h-16 grayscale group-hover:grayscale-0 border-2 border-mission-border group-hover:border-white transition-all shadow-xl" alt="" />
              <div className="min-w-0">
                <h3 className="text-white text-xl font-black uppercase tracking-tighter group-hover:text-white truncate">{space.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-1 truncate">{space.email}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 border border-mission-border group-hover:border-white/20 group-hover:bg-white/5 transition-all">
                    <span className="text-[9px] font-black text-zinc-400 group-hover:text-white">LINK ESTABLISHED</span>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
