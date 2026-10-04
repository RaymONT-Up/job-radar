import nodemailer from "nodemailer";
import { getSourceCredential } from "@/server/credentials";

function setting(key: "host" | "port" | "user" | "password" | "from") {
  const environment = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  }[key];
  return getSourceCredential("mail", key) ?? environment ?? "";
}

export function outreachMailStatus() {
  const host = setting("host");
  const user = setting("user");
  const password = setting("password");
  const from = setting("from") || user;
  return { configured: Boolean(host && user && password && from), from: from || null };
}

export async function sendOutreachMail(input: { recipient: string; subject: string; body: string; resumeName?: string | null; resumeType?: string | null; resumeData?: Buffer | null }) {
  const host = setting("host");
  const port = Number(setting("port") || 587);
  const user = setting("user");
  const password = setting("password");
  const from = setting("from") || user;
  if (!host || !user || !password || !from) throw new Error("SMTP не настроен. Добавьте SMTP host, user, app password и From в Settings.");
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password }, connectionTimeout: 15_000, socketTimeout: 25_000 });
  const result = await transport.sendMail({
    from,
    to: input.recipient,
    subject: input.subject,
    text: input.body,
    attachments: input.resumeData && input.resumeName ? [{ filename: input.resumeName, content: input.resumeData, contentType: input.resumeType || undefined }] : [],
  });
  return result.messageId;
}
