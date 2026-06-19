import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { env } from "cloudflare:workers";
import { getCurrentUser } from "../lib/auth";
import { getLogByDate, upsertLog, deleteLog } from "../lib/db";
import { uploadFileToGDrive, deleteFileFromGDrive } from "../lib/gdrive";
import { redirect } from "react-router";
import type { Route } from "./+types/edit-day";
import { motion, AnimatePresence } from "framer-motion";
import { toWIB } from "../lib/date-utils";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Uplink ${params.date} | Logbook Magang` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await getCurrentUser(request, env as any);
  if (!session) return redirect("/");

  if (session.user.id !== params.userId) {
    return redirect(`/u/${params.userId}`);
  }

  const log = await getLogByDate(params.date, params.userId);
  return { user: session.user, log: log as any, date: params.date, userId: params.userId };
}

export async function action({ params, request }: Route.ActionArgs) {
  const session = await getCurrentUser(request, env as any);
  if (!session || session.user.id !== params.userId) return redirect("/");

  const formData = await request.formData();
  const content = formData.get("content") as string;
  const existingMediaStr = formData.get("existing_media_url") as string;
  let attachments: Array<{ id: string; name: string; url: string; gdrive_id?: string; thumbnail?: string; mimeType?: string }> = [];

  try {
    if (existingMediaStr) attachments = JSON.parse(existingMediaStr);
  } catch (e) {}

  const deleteId = formData.get("delete_media_id") as string;
  if (deleteId) {
    const target = attachments.find((a) => a.id === deleteId);
    if (target?.gdrive_id) {
      await deleteFileFromGDrive(target.gdrive_id, session.accessToken);
    }
    attachments = attachments.filter((a) => a.id !== deleteId);
    const newMediaUrl = attachments.length > 0 ? JSON.stringify(attachments) : null;
    await upsertLog(params.date, content, newMediaUrl, session.user.id, params.userId);
    return null;
  }

  const intent = formData.get("intent") as string;
  if (intent === "delete_log") {
    for (const att of attachments) {
      if (att.gdrive_id) {
        try {
          await deleteFileFromGDrive(att.gdrive_id, session.accessToken);
        } catch (e) {
          console.error("GDrive delete failed for file:", att.gdrive_id, e);
        }
      }
    }
    await deleteLog(params.date, params.userId);
    return redirect(`/u/${params.userId}`);
  }

  const mediaFiles = formData.getAll("media") as File[];
  let maxIndex = 0;
  for (const att of attachments) {
    const match = att.name.match(/_(\d{3})(?:\.|$)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (idx > maxIndex) maxIndex = idx;
    }
  }

  let nextIndex = maxIndex;
  for (const mediaFile of mediaFiles) {
    if (mediaFile && mediaFile.size > 0) {
      nextIndex++;
      try {
        const uploadResult: any = await uploadFileToGDrive(mediaFile, session.accessToken, params.date as string, nextIndex);
        const ext = mediaFile.name.includes(".") ? "." + mediaFile.name.split(".").pop() : "";
        const customName = `KP_${params.date}_${String(nextIndex).padStart(3, "0")}${ext}`;

        attachments.push({
          id: crypto.randomUUID(),
          name: customName,
          url: uploadResult.webViewLink,
          gdrive_id: uploadResult.id,
          thumbnail: uploadResult.thumbnailLink,
          mimeType: uploadResult.mimeType,
        });
      } catch (e) {
        console.error("GDrive Upload Failed:", e);
      }
    }
  }

  await upsertLog(params.date, content, JSON.stringify(attachments), session.user.id, params.userId);
  return redirect(`/u/${params.userId}`);
}

export default function EditDay({ loaderData }: Route.ComponentProps) {
  const { log, date } = loaderData;
  const d = toWIB(date);
  const dayName = d.format("dddd").toUpperCase();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    setMounted(true);
    if (previewUrl) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

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
            <h2 className="text-white text-4xl font-black uppercase tracking-tighter italic">Uplink {date}</h2>
            <p className="terminal-label mt-1">{dayName} | DATA STREAM ENTRY</p>
          </div>
          <a href={`/u/${loaderData.userId}`} className="mission-btn text-[10px] py-1 border-white/10 hover:border-white hover:text-black">
            Abort Mission
          </a>
        </div>

        <div className="space-y-10">
          <form method="post" encType="multipart/form-data" className="space-y-10">
            <input type="hidden" name="existing_media_url" value={JSON.stringify(attachments)} />

            <div className="console-panel p-1">
              <div className="console-header">
                <span className="terminal-label"># LOG INPUT BUFFER</span>
                <span className="text-[8px] text-terminal-gray">GeistMono v1.3</span>
              </div>
              <textarea
                name="content"
                required
                defaultValue={log?.content || ""}
                rows={12}
                className="w-full bg-black p-6 text-white focus:outline-none text-[15px] leading-relaxed font-mono placeholder:text-white/10"
                placeholder="Initiate data sequence... Describe mission outcomes."
              />
            </div>

            <div className="console-panel p-1">
              <div className="console-header">
                <span className="terminal-label"># MEDIA ATTACHMENT UPLINK</span>
              </div>
              <div className="p-8 bg-mission-gray/20">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative flex-1 w-full">
                    <input
                      type="file"
                      name="media"
                      id="media-upload"
                      multiple
                      className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleFileChange}
                    />
                    <div className="flex items-center justify-center gap-3 border-2 border-dashed border-mission-border bg-black/40 py-8 px-4 transition-all peer-hover:border-white peer-hover:bg-white/5">
                      <div className="mission-btn py-1.5 px-4 pointer-events-none">Choose Files</div>
                      <span className="text-[11px] text-terminal-gray uppercase tracking-widest font-bold">or drag and drop here</span>
                    </div>
                  </div>
                  <div className="flex-none text-center md:text-left">
                    <p className="text-[10px] text-terminal-gray/60 uppercase tracking-widest font-bold leading-relaxed">
                      Auto-Sync to Google Drive established.
                      <br />
                      Supported formats: JPG, PNG, MP4, PDF.
                    </p>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-8 border-t border-mission-border/30 pt-6 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="terminal-label text-yellow-400 text-[9px]">PENDING UPLINK QUEUE</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="bg-black/40 border border-white/5 p-3 flex items-center justify-between group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-white/5 flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] font-black text-terminal-gray">{String(idx + 1).padStart(2, "0")}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-white font-bold truncate uppercase tracking-tight">{file.name}</div>
                              <div className="text-[8px] text-terminal-gray font-medium">{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                          </div>
                          <div className="text-[8px] text-white/20 font-black group-hover:text-yellow-400/50 transition-colors">READY</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

                          <div className="absolute top-2 right-2 z-20">
                            <button
                              type="submit"
                              name="delete_media_id"
                              value={att.id}
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 flex items-center justify-center bg-black border border-white/20 text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-xl"
                            >
                              <span className="text-[11px] font-black">X</span>
                            </button>
                          </div>

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

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button type="submit" className="mission-btn flex-1 py-6 text-xl border-white hover:text-black">
                Transmit Data Packets
              </button>
              {log && (
                <button
                  type="submit"
                  name="intent"
                  value="delete_log"
                  onClick={(e) => {
                    if (
                      !confirm(
                        "WARNING: Proceeding will purge all log data and media packets for this cycle. Confirm purge?"
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="mission-btn border-red-500/30 text-red-500/70 hover:border-red-500 hover:bg-red-950/20 hover:text-red-400 py-6 text-xl transition-all font-black"
                >
                  DESTRUCT LOG DATA
                </button>
              )}
            </div>
          </form>

          <div className="console-panel p-6 bg-white/[0.01] border-dashed flex justify-between items-center">
            <h4 className="terminal-label text-[10px] font-black">System Telemetry</h4>
            <div className="flex gap-8">
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="text-terminal-gray uppercase tracking-widest">Latency:</span>
                <span className="text-white">12MS</span>
              </div>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="text-terminal-gray uppercase tracking-widest">D1 Database:</span>
                <span className="text-white">CONNECTED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
