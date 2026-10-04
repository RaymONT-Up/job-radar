"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Mail, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

type Draft = { id: string; recipient: string; subject: string; body: string; resumeName: string | null; status: string; error: string | null; sentAt: string | null };

export function OutreachApprovalCard({ vacancyId, initialDraft, defaults, mailConfigured }: { vacancyId: string; initialDraft: Draft | null; defaults: { recipient: string; subject: string; body: string }; mailConfigured: boolean }) {
  const [recipient, setRecipient] = useState(initialDraft?.recipient ?? defaults.recipient);
  const [subject, setSubject] = useState(initialDraft?.subject ?? defaults.subject);
  const [body, setBody] = useState(initialDraft?.body ?? defaults.body);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState(initialDraft?.resumeName ?? "");
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState(initialDraft?.status ?? "draft");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(initialDraft?.error ?? "");

  async function submit(action: "save" | "send") {
    setPending(true); setMessage("");
    const form = new FormData();
    form.set("action", action); form.set("recipient", recipient); form.set("subject", subject); form.set("body", body);
    if (resume) form.set("resume", resume);
    if (reviewed) form.set("confirmation", "reviewed");
    try {
      const response = await fetch(`/api/jobs/${vacancyId}/outreach`, { method: "POST", body: form });
      const result = await response.json() as { draft?: Draft; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось выполнить действие");
      if (result.draft) { setStatus(result.draft.status); setResumeName(result.draft.resumeName ?? resumeName); }
      setMessage(action === "send" ? "Письмо отправлено. Отклик отмечен как APPLIED." : "Черновик сохранён локально. Ничего не отправлено.");
      if (action === "send") setReviewed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось выполнить действие"); }
    finally { setPending(false); }
  }

  return <section className="panel overflow-hidden">
    <div className="flex flex-col gap-3 border-b bg-[var(--panel-2)] p-5 md:flex-row md:items-start">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Mail size={19} /></div>
      <div className="flex-1"><h2 className="font-black">Email outreach · approval required</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Job Radar готовит письмо и прикладывает резюме, но отправляет только после твоей проверки и нажатия Approve & Send.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${status === "sent" ? "bg-[var(--good-soft)] text-[var(--good)]" : status === "failed" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>{status}</span>
    </div>
    <div className="space-y-4 p-5">
      <label className="block"><span className="mb-1 block text-sm font-bold">Recipient · only a public or manually verified company email</span><input type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="focus-ring h-11 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="jobs@company.com" /></label>
      <label className="block"><span className="mb-1 block text-sm font-bold">Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className="focus-ring h-11 w-full rounded-md border bg-[var(--panel)] px-3" /></label>
      <label className="block"><span className="mb-1 block text-sm font-bold">Message</span><textarea value={body} onChange={(event) => setBody(event.target.value)} className="focus-ring min-h-52 w-full rounded-md border bg-[var(--panel)] p-3 leading-6" /></label>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 hover:bg-[var(--panel-2)]"><FileText size={18} className="text-[var(--accent)]" /><span className="flex-1 text-sm"><b>{resume?.name || resumeName || "Attach resume"}</b><span className="block text-xs text-[var(--muted)]">PDF or DOCX, up to 5 MB. Stored only in local SQLite.</span></span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => { const file = event.target.files?.[0] ?? null; setResume(file); if (file) setResumeName(file.name); }} /></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-[var(--warn-soft)] p-3 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 size-4" /><span><b>Я проверил получателя, текст и резюме.</b><span className="block text-[var(--muted)]">Без этой галочки отправка невозможна.</span></span></label>
      {!mailConfigured && <div className="rounded-md bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">SMTP пока не настроен. Черновик можно сохранить, но отправить нельзя. <Link href="/settings" className="font-bold underline">Открыть Settings</Link></div>}
      {message && <div className={`rounded-md p-3 text-sm font-semibold ${status === "sent" || message.includes("сохранён") ? "bg-[var(--good-soft)] text-[var(--good)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{message}</div>}
      <div className="flex flex-wrap items-center gap-3"><Button onClick={() => submit("save")} disabled={pending}><ShieldCheck size={16} /> Save draft</Button><Button variant="primary" onClick={() => submit("send")} disabled={pending || !mailConfigured || !reviewed || !recipient || (!resume && !resumeName)}><Send size={16} /> Approve & Send</Button>{status === "sent" && <span className="flex items-center gap-1 text-sm font-bold text-[var(--good)]"><CheckCircle2 size={16} /> Sent</span>}</div>
    </div>
  </section>;
}
