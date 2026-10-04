import { NextResponse } from "next/server";
import { z } from "zod";
import { outreachMailStatus, sendOutreachMail } from "@/server/outreach/mailer";
import { getActiveProfile, getOutreachDraft, getVacancyDetail, saveOutreachDraft, setOutreachStatus, updateApplicationStatus } from "@/server/repository";

const fieldsSchema = z.object({
  recipient: z.union([z.literal(""), z.string().email("Укажите корректный email получателя")]),
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(20).max(20_000),
});

function publicDraft(draft: NonNullable<ReturnType<typeof getOutreachDraft>>) {
  return { id: draft.id, recipient: draft.recipient, subject: draft.subject, body: draft.body, resumeName: draft.resumeName, status: draft.status, error: draft.error, approvedAt: draft.approvedAt?.toISOString() ?? null, sentAt: draft.sentAt?.toISOString() ?? null };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = await getActiveProfile();
  if (!profile) return NextResponse.json({ error: "No active profile" }, { status: 400 });
  const draft = getOutreachDraft(id, profile.id);
  return NextResponse.json({ draft: draft ? publicDraft(draft) : null, mail: outreachMailStatus() });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const profile = await getActiveProfile();
    if (!profile) throw new Error("No active profile");
    const vacancy = await getVacancyDetail(id, profile.id);
    if (!vacancy) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
    const form = await request.formData();
    const action = String(form.get("action") || "save");
    const previous = getOutreachDraft(id, profile.id);
    if (action === "send" && previous?.status === "sent") return NextResponse.json({ error: "Это письмо уже отправлено. Сначала сохраните изменённый черновик, если действительно нужен повтор." }, { status: 409 });
    const fields = fieldsSchema.parse({ recipient: form.get("recipient"), subject: form.get("subject"), body: form.get("body") });
    const resume = form.get("resume");
    if (resume instanceof File && resume.size > 5_000_000) throw new Error("Резюме должно быть не больше 5 MB");
    if (resume instanceof File && resume.size && !/^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/.test(resume.type)) throw new Error("Поддерживаются PDF и DOCX");
    const draft = saveOutreachDraft({
      vacancyId: id,
      candidateProfileId: profile.id,
      ...fields,
      ...(resume instanceof File && resume.size ? { resumeName: resume.name, resumeType: resume.type, resumeData: Buffer.from(await resume.arrayBuffer()) } : {}),
    });
    if (action === "save") return NextResponse.json({ ok: true, draft: publicDraft(draft), mail: outreachMailStatus() });
    if (action !== "send" || form.get("confirmation") !== "reviewed") return NextResponse.json({ error: "Перед отправкой подтвердите проверку адреса и текста" }, { status: 400 });
    if (!z.string().email().safeParse(draft.recipient).success) return NextResponse.json({ error: "Укажите корректный email получателя" }, { status: 400 });
    if (!draft.resumeData) return NextResponse.json({ error: "Прикрепите резюме перед отправкой" }, { status: 400 });
    setOutreachStatus(draft.id, "approved", { approvedAt: new Date(), error: null });
    try {
      const messageId = await sendOutreachMail(draft);
      const sent = setOutreachStatus(draft.id, "sent", { providerMessageId: messageId, sentAt: new Date(), error: null });
      try { await updateApplicationStatus(id, profile.id, "APPLIED", { outreachDraftId: draft.id, messageId, recipient: draft.recipient }); }
      catch { /* The email is already sent; never mark it failed or invite a duplicate send. */ }
      return NextResponse.json({ ok: true, draft: sent ? publicDraft(sent) : null, mail: outreachMailStatus() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить письмо";
      const failed = setOutreachStatus(draft.id, "failed", { error: message });
      return NextResponse.json({ error: message, draft: failed ? publicDraft(failed) : null, mail: outreachMailStatus() }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось сохранить письмо" }, { status: 400 });
  }
}
