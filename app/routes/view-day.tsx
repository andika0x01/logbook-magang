import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { env } from "cloudflare:workers";
import { getCurrentUser } from "../lib/auth";
import { getLogByDate } from "../lib/db";
import { redirect } from "react-router";
import type { Route } from "./+types/view-day";
import { motion, AnimatePresence } from "framer-motion";
import { toWIB } from "../lib/date-utils";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Telemetry ${params.date} | KP Microdata` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await getCurrentUser(request, env as any);
  // View is public but we still check session for consistent layout if needed,
  // though anyone should be able to view a log if they have the link/userId.

  const log = await getLogByDate(params.date, params.userId);
  if (!log) return redirect(`/u/${params.userId}`);

  return { user: session?.user || null, log: log as any, date: params.date, userId: params.userId };
}

export default function ViewDay({ loaderData }: Route.ComponentProps) {
  const { log, date } = loaderData;
  const d = toWIB(date);
  const dayName = d.format("dddd").toUpperCase();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (previewUrl) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewUrl]);

  let attachments: Array<{ id: string; name: string; url: string; gdrive_id?: string; thumbnail?: string; mimeType?: string }> = [];
  try {
    if (log?.media_url) attachments = JSON.parse(log.media_url);
  } catch (e) {
    if (log?.media_url && typeof log.media_url === "string" && log.media_url.startsWith("http")) {
      attachments = [{ id: "legacy-attachment", name: "Legacy Attachment", url: log.media_url }];
    }
  }

  const modalContent = (
    <AnimatePresence>
      {previewUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999, backgroundColor: "rgba(0,0,0,0.98)", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              height: "64px",
              padding: "0 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
              backgroundColor: "#000",
              borderBottom: "1px solid #27272a",
            }}
          >
            <span className="text-white uppercase tracking-[0.3em] text-[10px] font-black flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]"></div>
              Telemetry Viewer | {date}
            </span>
            <button type="button" onClick={() => setPreviewUrl(null)} className="mission-btn py-1.5 px-6 border-white text-white hover:bg-white hover:text-black">
              Close Viewer [X]
            </button>
          </div>
          <div style={{ flex: 1, width: "100%", position: "relative", backgroundColor: "#000" }}>
            <iframe src={previewUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {mounted && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}

      <div className="p-6 md:p-12 max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-10 gap-4 border-b border-mission-border pb-6">
          <div>
            <h2 className="text-white text-4xl font-black uppercase tracking-tighter italic">Telemetry {date}</h2>
            <p className="terminal-label mt-1">{dayName} | DATA STREAM VIEW</p>
          </div>
          <a href={`/u/${loaderData.userId}`} className="mission-btn text-[10px] py-1 border-white/10 hover:border-white hover:text-black">
            Return to Console
          </a>
        </div>

        <div className="space-y-10">
          <div className="console-panel p-1">
            <div className="console-header">
              <span className="terminal-label"># LOG DATA DECODED</span>
            </div>
            <div className="w-full bg-black p-6 text-white text-[15px] leading-relaxed font-mono whitespace-pre-wrap min-h-[200px]">{log?.content || "NO DATA RECOVERED"}</div>
          </div>

          <div className="console-panel p-1">
            <div className="console-header">
              <span className="terminal-label"># PACKET INVENTORY [{attachments.length}]</span>
            </div>
            <div className="p-6">
              {attachments.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-mission-border/30">
                  <span className="terminal-label opacity-20 italic">No Packets Detected</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {attachments.map((att) => {
                    const thumbUrl = att.thumbnail || (att.gdrive_id ? `https://drive.google.com/thumbnail?id=${att.gdrive_id}&sz=w400` : null);
                    return (
                      <div
                        key={att.id}
                        className="console-panel border-white/5 group hover:border-white/20 transition-all cursor-pointer relative overflow-hidden aspect-square"
                        onClick={() => setPreviewUrl(att.url.replace(/\/view.*$/, "/preview"))}
                      >
                        <div className="absolute inset-0 bg-black">
                          {thumbUrl ? (
                            <img src={thumbUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-500" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                              <span className="text-[11px] text-terminal-gray font-black tracking-widest">{att.mimeType?.split("/")[1] || "FILE"}</span>
                            </div>
                          )}
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

                        <div className="absolute bottom-3 left-3 right-3 z-10">
                          <div className="text-[9px] text-white font-bold tracking-tight truncate group-hover:text-white transition-colors uppercase">{att.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="console-panel p-6 bg-white/[0.01] border-dashed flex justify-between items-center">
            <h4 className="terminal-label text-[10px] font-black">System Telemetry</h4>
            <div className="flex gap-8">
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="text-terminal-gray uppercase tracking-widest">Latency:</span>
                <span className="text-white">8MS</span>
              </div>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="text-terminal-gray uppercase tracking-widest">D1 Database:</span>
                <span className="text-white">READ_ONLY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
