import { env } from "cloudflare:workers";
import { getCurrentUser } from "../lib/auth";
import { getAllLogs } from "../lib/db";
import type { Route } from "./+types/home";
import { motion } from "framer-motion";

export function meta() {
  return [{ title: "CONSOLE // LOGBOOK MAGANG" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getCurrentUser(request, env as any);
  const logs = session?.user ? await getAllLogs() : [];
  
  return { 
    user: session?.user || null, 
    logs: logs || [],
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user, logs } = loaderData;

  const kpDates: string[] = [];
  const start = new Date("2026-06-12");
  const end = new Date("2026-07-17");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    kpDates.push(d.toISOString().split('T')[0]);
  }

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
            <a href="/login/google" className="mission-btn w-full py-4 md:py-6 text-[14px] md:text-[18px] text-white border-2 border-white/10 hover:border-white shadow-[0_0_50px_rgba(255,255,255,0.05)] font-black">
              Authorize Google OS
            </a>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="p-4 md:p-10 lg:p-20 font-mono">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 lg:mb-20 border-b-2 border-mission-border pb-8 lg:pb-12">
        <div>
          <h2 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase mb-2 md:mb-4 leading-none text-zinc-100">Mission Timeline</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
            <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Node: PT Microdata Indonesia</span>
            <span className="hidden md:inline text-white/10 text-2xl">•</span>
            <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Log Stream: Active v1.0</span>
          </div>
        </div>
        <div className="md:text-right border-l-2 md:border-l-0 md:border-r-2 border-mission-border pl-6 md:pl-0 md:pr-10">
          <div className="terminal-label text-[10px] md:text-[12px] mb-2 md:mb-3 opacity-50 uppercase">Authorized Pilot</div>
          <div className="flex items-center md:justify-end gap-4 md:gap-6">
            <span className="text-white font-black text-sm md:text-lg tracking-[0.1em]">{user.name}</span>
            <img src={user.avatar} className="w-10 h-10 md:w-12 md:h-12 grayscale border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" alt="" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {kpDates.map((date, index) => {
          const log = (logs as any[]).find(l => l.date === date);
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
          const dayNum = dateObj.getDate();
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          
          return (
            <motion.div 
              key={date}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              className={`console-panel group transition-all duration-300 border-2 ${log ? 'border-white bg-white/[0.05] shadow-[0_0_30px_rgba(255,255,255,0.05)] text-zinc-200' : 'opacity-30 border-mission-border hover:opacity-100 hover:border-zinc-500 text-zinc-500'}`}
            >
              <div className="console-header py-2 md:py-3 bg-transparent border-b border-white/5 h-10 md:h-12 px-4 md:px-5 text-zinc-400 uppercase">
                <span className="text-[10px] md:text-[11px] font-black tracking-[0.3em] group-hover:text-zinc-300 transition-colors">IDX {String(index + 1).padStart(2, '0')}</span>
                <span className={`text-[10px] md:text-[11px] font-black tracking-tighter px-2 md:px-3 py-0.5 md:py-1 ${log ? 'bg-white text-black shadow-[0_0_15px_#fff]' : 'bg-mission-border text-zinc-500 group-hover:bg-zinc-700 group-hover:text-white'}`}>
                  {date}
                </span>
              </div>
              
              <div className="p-6 md:p-8 flex flex-col min-h-[300px] md:min-h-[350px]">
                <div className="mb-4 md:mb-6">
                  <div className="text-[10px] md:text-[12px] text-zinc-500 font-black mb-0.5 md:mb-1 tracking-[0.2em] group-hover:text-zinc-300 transition-colors">{monthName} {dayNum}</div>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none">{dayName}</h3>
                </div>

                <div className="flex-1 overflow-hidden">
                  {log ? (
                    <>
                      {(() => {
                        let attachments: any[] = [];
                        if (log?.media_url) {
                          try {
                            const parsed = JSON.parse(log.media_url);
                            if (Array.isArray(parsed)) attachments = parsed;
                          } catch (e) {}
                        }
                        if (attachments.length === 0) return null;
                        return (
                          <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4">
                            {attachments.slice(0, 4).map((att, i) => {
                              const thumbUrl = att.thumbnail || (att.gdrive_id ? `https://drive.google.com/thumbnail?id=${att.gdrive_id}&sz=w220` : null);
                              return (
                                <div key={att.id || i} className="aspect-square border border-white/20 bg-black overflow-hidden flex items-center justify-center group-hover:border-white/50 transition-colors">
                                  {thumbUrl ? (
                                    <img src={thumbUrl} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="" />
                                  ) : (
                                    <span className="text-[7px] md:text-[9px] text-zinc-500 font-black uppercase tracking-tighter">{att.mimeType?.split('/')[1] || 'DATA'}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <p className="text-[12px] md:text-[13px] leading-[1.6] text-zinc-400 group-hover:text-white line-clamp-3 md:line-clamp-4 transition-colors font-bold tracking-tight uppercase">
                        {log.content}
                      </p>
                    </>
                  ) : (
                    <div className="h-full min-h-[100px] md:min-h-[120px] flex items-center justify-center border-2 border-dashed border-mission-border group-hover:border-zinc-700 transition-colors">
                      <span className="text-[10px] md:text-[11px] text-zinc-700 group-hover:text-zinc-500 tracking-[0.4em] font-black italic">WAITING DATA</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 md:pt-6 border-t-2 border-white/5 flex flex-col gap-4 md:gap-5">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-0.5 md:mb-1 group-hover:text-zinc-400 transition-colors">Reporter</span>
                    <span className="text-[10px] md:text-[12px] text-zinc-400 truncate font-black tracking-tight group-hover:text-white transition-colors uppercase">{log ? log.editor_name : "N/A"}</span>
                  </div>
                  <a 
                    href={`/edit/${date}`}
                    className="mission-btn py-2 md:py-3 px-4 md:px-5 text-[10px] md:text-[12px] font-black border-2 border-white/10 group-hover:border-white group-hover:bg-white group-hover:text-black transition-all shadow-[0_0_20px_rgba(255,255,255,0)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] w-full text-center"
                  >
                    ACCESS DATA
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
