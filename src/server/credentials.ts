import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sourceCredentials } from "@/server/db/schema";

export const CREDENTIAL_DEFINITIONS = [
  { source: "adzuna", label: "Adzuna", description: "Поиск по Adzuna", fields: [{ key: "appId", label: "App ID", secret: false }, { key: "appKey", label: "App key", secret: true }] },
  { source: "superjob", label: "SuperJob", description: "Поиск по SuperJob", fields: [{ key: "appId", label: "Application ID / secret", secret: true }] },
  { source: "jooble", label: "Jooble", description: "Официальный региональный REST API Jooble", fields: [{ key: "apiKey", label: "API key", secret: true }, { key: "domain", label: "Региональный домен, например jooble.org", secret: false }, { key: "location", label: "Локация поиска, например Remote или Europe", secret: false }] },
  { source: "telegram", label: "Telegram sources", description: "Публичные каналы вакансий через t.me/s, без аккаунта", fields: [{ key: "channels", label: "Каналы через запятую, например @frontend_jobs", secret: false }] },
  { source: "career", label: "Company career watchlist", description: "ATS boards и публичные career pages для фонового обхода", fields: [{ key: "boards", label: "Greenhouse / Lever / Ashby board URLs", secret: false }, { key: "pages", label: "Другие публичные career pages", secret: false }] },
  { source: "mail", label: "SMTP outreach", description: "Отправка письма с резюме только после ручного Approve", fields: [{ key: "host", label: "SMTP host", secret: false }, { key: "port", label: "SMTP port", secret: false }, { key: "user", label: "SMTP user / email", secret: false }, { key: "password", label: "SMTP password / app password", secret: true }, { key: "from", label: "From address", secret: false }] },
  { source: "ai", label: "OpenAI — AI-пакет отклика", description: "Опциональная генерация по кнопке внутри вакансии", fields: [{ key: "apiKey", label: "OpenAI API key", secret: true }, { key: "model", label: "Model (по умолчанию gpt-5-mini)", secret: false }] },
] as const;

function keyMaterial() {
  const configured = process.env.SOURCE_CREDENTIALS_KEY;
  if (configured) {
    const raw = Buffer.from(configured, "base64");
    if (raw.length === 32) return raw;
    return crypto.createHash("sha256").update(configured).digest();
  }
  const file = process.env.SOURCE_CREDENTIALS_KEY_FILE ?? path.join(process.cwd(), "data", ".credentials.key");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    const existing = fs.readFileSync(file);
    if (existing.length === 32) return existing;
  } catch { /* Generate the local-only key below. */ }
  const generated = crypto.randomBytes(32);
  fs.writeFileSync(file, generated, { mode: 0o600 });
  return generated;
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

function decrypt(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
}

function definition(source: string) {
  return CREDENTIAL_DEFINITIONS.find((item) => item.source === source);
}

export function getSourceCredential(source: string, credentialKey: string) {
  const row = db.select().from(sourceCredentials).where(and(eq(sourceCredentials.source, source), eq(sourceCredentials.credentialKey, credentialKey))).get();
  if (!row) return null;
  try { return decrypt(row.encryptedValue); }
  catch { return null; }
}

export function setSourceCredentials(source: string, values: Record<string, string>) {
  const item = definition(source);
  if (!item) throw new Error("Unknown credential source");
  const allowed = new Set<string>(item.fields.map((field) => field.key));
  const now = new Date();
  db.transaction((tx) => {
    for (const [credentialKey, rawValue] of Object.entries(values)) {
      if (!allowed.has(credentialKey)) continue;
      const value = rawValue.trim();
      const existing = tx.select().from(sourceCredentials).where(and(eq(sourceCredentials.source, source), eq(sourceCredentials.credentialKey, credentialKey))).get();
      if (!value) {
        continue;
      } else if (existing) {
        tx.update(sourceCredentials).set({ encryptedValue: encrypt(value), updatedAt: now }).where(eq(sourceCredentials.id, existing.id)).run();
      } else {
        tx.insert(sourceCredentials).values({ id: crypto.randomUUID(), source, credentialKey, encryptedValue: encrypt(value), createdAt: now, updatedAt: now }).run();
      }
    }
  });
}

export function credentialStatus() {
  return CREDENTIAL_DEFINITIONS.map((item) => ({ source: item.source, label: item.label, description: item.description, fields: item.fields.map((field) => ({ key: field.key, label: field.label, secret: field.secret, configured: Boolean(getSourceCredential(item.source, field.key)) })) }));
}
