import { env } from "cloudflare:workers";
import { getCurrentUser } from "../lib/auth";
import { getAllLogs, getUserById } from "../lib/db";
import type { Route } from "./+types/home";
import { motion } from "framer-motion";
import { toWIB } from "../lib/date-utils";

export function meta({ data }: Route.MetaArgs) {
  const targetName = (data as any)?.targetUser?.name || "PILOT";
  return [{ title: `${targetName} | Logbook Magang` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await getCurrentUser(request, env as any);
  const targetUser = await getUserById(params.userId);
  if (!targetUser) throw new Response("Not Found", { status: 404 });

  const logs = await getAllLogs(params.userId);

  let holidays: Record<string, string> = {};
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://api-hari-libur.vercel.app/api?year=2026", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.status === "success" && Array.isArray(json.data)) {
        json.data.forEach((h: any) => {
          holidays[h.date] = h.description;
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch holidays:", err);
    // Fallback: Tahun Baru Islam 1448 H on June 16, 2026
    holidays["2026-06-16"] = "Tahun Baru Islam 1448 Hijriyah";
  }

  return {
    currentUser: session?.user || null,
    targetUser,
    logs: logs || [],
    holidays,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { currentUser, targetUser, logs, holidays } = loaderData;
  const isOwner = currentUser?.id === targetUser.id;

  const kpDates: string[] = [];
  let current = toWIB("2026-06-15");
  const end = toWIB("2026-07-24");

  while (current.isBefore(end) || current.isSame(end, "day")) {
    kpDates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  const today = toWIB().startOf("day");
  const endDate = toWIB("2026-07-24").startOf("day");
  const remainingDays = Math.max(0, endDate.diff(today, "day"));

  return (
    <div className="p-4 md:p-10 lg:p-20 font-mono">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 lg:mb-20 border-b-2 border-mission-border pb-8 lg:pb-12">
        <div>
          <h2 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase mb-2 md:mb-4 leading-none text-zinc-100">Mission Timeline</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
            <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Node: PT Microdata Indonesia</span>
            <span className="hidden md:inline text-white/10 text-2xl">•</span>
            <span className="terminal-label text-[10px] md:text-sm text-zinc-300">Space: {targetUser.name}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16">
          <div className="md:text-right border-l-2 md:border-l-0 md:border-r-2 border-mission-border pl-6 md:pl-0 md:pr-10">
            <div className="terminal-label text-[10px] md:text-[12px] mb-2 md:mb-3 opacity-50 uppercase">T-Minus / Remaining</div>
            <div className="flex items-baseline md:justify-end gap-2">
              <span className="text-white font-black text-5xl md:text-6xl tracking-tighter animate-pulse">{remainingDays}</span>
              <span className="text-zinc-500 font-black text-xs md:text-sm uppercase tracking-widest">Days</span>
            </div>
          </div>

          <div className="md:text-right border-l-2 md:border-l-0 md:border-r-2 border-mission-border pl-6 md:pl-0 md:pr-10">
            <div className="terminal-label text-[10px] md:text-[12px] mb-2 md:mb-3 opacity-50 uppercase">{isOwner ? "Pilot Identification" : "Target Terminal"}</div>
            <div className="flex items-center md:justify-end gap-4 md:gap-6">
              <span className="text-white font-black text-sm md:text-lg tracking-[0.1em]">{targetUser.name}</span>
              <img src={targetUser.avatar || ""} className="w-10 h-10 md:w-12 md:h-12 grayscale border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" alt="" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {kpDates.map((date, index) => {
          const log = (logs as any[]).find((l) => l.date === date);
          const d = toWIB(date);
          const dayName = d.format("dddd").toUpperCase();
          const dayNum = d.date();
          const monthName = d.format("MMM").toUpperCase();

          const holidayName = holidays[date];
          const isHoliday = !!holidayName;
          const isWeekend = d.day() === 0 || d.day() === 6;
          const isOffDuty = isWeekend || isHoliday;
          const isToday = date === today.format("YYYY-MM-DD");

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              className={`console-panel group transition-all duration-300 border-2 relative overflow-hidden ${
                isToday
                  ? log
                    ? "border-white bg-white/[0.08] shadow-[0_0_35px_rgba(255,255,255,0.15)] text-zinc-100 ring-2 ring-white/10"
                    : "border-white bg-white/[0.04] shadow-[0_0_30px_rgba(255,255,255,0.1)] text-zinc-200 ring-1 ring-white/10"
                  : log
                    ? isOffDuty
                      ? "border-zinc-500 bg-white/[0.02] text-zinc-300 shadow-[0_0_15px_rgba(255,255,255,0.01)]"
                      : "border-white bg-white/[0.05] shadow-[0_0_30px_rgba(255,255,255,0.05)] text-zinc-200"
                    : isOffDuty
                      ? "opacity-20 border-dashed border-zinc-800 bg-black/40 hover:opacity-60 hover:border-zinc-700 text-zinc-600"
                      : "opacity-30 border-mission-border hover:opacity-100 hover:border-zinc-500 text-zinc-500"
              }`}
            >
              {isToday && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  {/* Subtle grid background only for today */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                  {/* A vertical scanning laser bar */}
                  <motion.div
                    className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    animate={{
                      top: ["0%", "100%"],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ position: "absolute", left: 0 }}
                  />
                </div>
              )}

              <div className="console-header relative z-10 py-2 md:py-3 bg-transparent border-b border-white/5 h-10 md:h-12 px-4 md:px-5 text-zinc-400 uppercase">
                <span className="text-[10px] md:text-[11px] font-black tracking-[0.3em] group-hover:text-zinc-300 transition-colors flex items-center gap-2">
                  IDX {String(index + 1).padStart(2, "0")}
                  {isToday && (
                    <span className="inline-flex items-center gap-1 text-[8px] tracking-widest px-1.5 py-0.5 border border-white text-white bg-white/10 animate-pulse font-black">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      LIVE
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] md:text-[11px] font-black tracking-tighter px-2 md:px-3 py-0.5 md:py-1 ${
                    isToday
                      ? "bg-white text-black ring-2 ring-white/30"
                      : log
                        ? isOffDuty
                          ? "bg-zinc-700 text-zinc-100"
                          : "bg-white text-black"
                        : isOffDuty
                          ? "bg-zinc-900 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300"
                          : "bg-mission-border text-zinc-500 group-hover:bg-zinc-700 group-hover:text-white"
                  }`}
                >
                  {date}
                </span>
              </div>

              <div className="p-6 md:p-8 flex flex-col min-h-[300px] md:min-h-[350px] relative z-10">
                <div className="mb-4 md:mb-6">
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-[10px] md:text-[12px] text-zinc-500 font-black tracking-[0.2em] group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                      {monthName} {dayNum}
                      {isToday && (
                        <span className="text-[8px] text-white font-black px-1.5 py-0.5 bg-white/10 border border-white/20 uppercase tracking-widest animate-pulse">
                          TODAY
                        </span>
                      )}
                    </div>
                    {isOffDuty && (
                      <span className={`text-[8px] md:text-[9px] font-black tracking-widest px-1.5 py-0.5 border ${
                        log
                          ? "border-zinc-500 text-zinc-400 bg-zinc-950"
                          : "border-zinc-800 text-zinc-600 bg-zinc-900/40"
                      }`}>
                        {isHoliday ? "HOLIDAY" : "REST DAY"}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tighter leading-none ${isToday ? "text-white" : isOffDuty && !log ? "text-zinc-500" : "text-white"}`}>{dayName}</h3>
                  {isHoliday && log && (
                    <div className="text-[8px] md:text-[9px] mt-1 text-zinc-500 uppercase font-bold tracking-tight line-clamp-1">
                      {holidayName}
                    </div>
                  )}
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
                                <div
                                  key={att.id || i}
                                  className="aspect-square border border-white/20 bg-black overflow-hidden flex items-center justify-center group-hover:border-white/50 transition-colors"
                                >
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                      alt=""
                                    />
                                  ) : (
                                    <span className="text-[7px] md:text-[9px] text-zinc-500 font-black uppercase tracking-tighter">{att.mimeType?.split("/")[1] || "DATA"}</span>
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
                  ) : isOffDuty ? (
                    <div className="h-full min-h-[100px] md:min-h-[120px] flex flex-col items-center justify-center border border-dashed border-zinc-800/80 group-hover:border-zinc-700 transition-colors p-3 text-center">
                      <span className="text-[10px] md:text-[11px] text-zinc-600 group-hover:text-zinc-400 tracking-[0.2em] font-black uppercase">
                        {isWeekend ? "REST DAY" : "OFF DUTY"}
                      </span>
                      {isHoliday && (
                        <span className="text-[8px] md:text-[9px] text-zinc-600 group-hover:text-zinc-500 mt-1 uppercase font-bold tracking-tight max-w-[150px] line-clamp-2">
                          {holidayName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={`h-full min-h-[100px] md:min-h-[120px] flex flex-col items-center justify-center border-2 border-dashed transition-colors ${
                      isToday 
                        ? "border-white bg-white/[0.02]" 
                        : "border-mission-border group-hover:border-zinc-700"
                    }`}>
                      <span className={`text-[10px] md:text-[11px] tracking-[0.3em] font-black uppercase ${
                        isToday ? "text-white animate-pulse" : "text-zinc-700 group-hover:text-zinc-500 italic"
                      }`}>
                        {isToday ? "AWAITING TELEMETRY" : "WAITING DATA"}
                      </span>
                      {isToday && (
                        <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                          SYSTEM READY FOR INPUT
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 md:pt-6 border-t-2 border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-0.5 md:mb-1 group-hover:text-zinc-400 transition-colors">
                      Reporter
                    </span>
                    <span className="text-[10px] md:text-[12px] text-zinc-400 truncate font-black tracking-tight group-hover:text-white transition-colors uppercase">
                      {log ? log.editor_name : "N/A"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {log && (
                      <a
                        href={`/u/${targetUser.id}/view/${date}`}
                        className="mission-btn py-2 md:py-2.5 px-4 text-[10px] md:text-[11px] font-black border-2 border-white/20 w-full text-center transition-all hover:bg-white hover:text-black"
                      >
                        VIEW DATA
                      </a>
                    )}

                    {isOwner && (
                      <a
                        href={`/u/${targetUser.id}/edit/${date}`}
                        className={`mission-btn py-2 md:py-2.5 px-4 text-[10px] md:text-[11px] font-black border-2 w-full text-center transition-all ${
                          isToday && !log
                            ? "border-white bg-white text-black hover:bg-black hover:text-white hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            : log
                              ? "border-white/10 opacity-50 hover:opacity-100 hover:border-white"
                              : isOffDuty
                                ? "border-zinc-800 text-zinc-600 hover:border-zinc-500 hover:text-white"
                                : "border-white/10 group-hover:border-white group-hover:bg-white group-hover:text-black"
                        }`}
                      >
                        {log ? "EDIT DATA" : isToday ? "SUBMIT TELEMETRY" : isOffDuty ? "LOG OVERTIME" : "ACCESS DATA"}
                      </a>
                    )}

                    {!log && !isOwner && (
                      <div className="mission-btn py-2 md:py-2.5 px-4 text-[10px] md:text-[11px] font-black border-2 border-mission-border w-full text-center opacity-20 cursor-not-allowed">
                        READ ONLY
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
