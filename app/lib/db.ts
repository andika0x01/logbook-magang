import { env } from "cloudflare:workers";
import type { User, Env } from "./auth";

export async function getUserByGoogleId(googleId: string) {
  const db = (env as unknown as Env).DB;
  return await db.prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleId)
    .first<User>();
}

export async function createUser(data: { id: string, googleId: string, email: string, name: string, avatar: string }) {
  const db = (env as unknown as Env).DB;
  await db.prepare(
    "INSERT INTO users (id, google_id, email, name, avatar) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(data.id, data.googleId, data.email, data.name, data.avatar)
    .run();
}

export async function getAllLogs() {
  const db = (env as unknown as Env).DB;
  const result = await db.prepare(`
    SELECT l.*, u.name as editor_name
    FROM logs l
    JOIN users u ON u.id = l.last_editor_id
  `).all();
  return result.results;
}

export async function getLogByDate(date: string) {
  const db = (env as unknown as Env).DB;
  return await db.prepare(`
    SELECT l.*, u.name as editor_name 
    FROM logs l 
    JOIN users u ON u.id = l.last_editor_id 
    WHERE l.date = ?
  `).bind(date).first();
}

export async function upsertLog(date: string, content: string, mediaUrl: string | null, editorId: string) {
  const db = (env as unknown as Env).DB;
  await db.prepare(`
    INSERT INTO logs (date, content, media_url, last_editor_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(date) DO UPDATE SET
      content = excluded.content,
      media_url = excluded.media_url,
      last_editor_id = excluded.last_editor_id,
      updated_at = CURRENT_TIMESTAMP
  `).bind(date, content, mediaUrl, editorId).run();
}
