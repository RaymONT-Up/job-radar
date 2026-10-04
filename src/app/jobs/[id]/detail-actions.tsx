"use client";

import { Archive, CalendarClock, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

interface Props {
  vacancyId: string;
  applicationId: string | null;
  initial: { contactName: string; contactRole: string; contactUrl: string; notes: string; followUpAt: string; rejectionReason?: string; applicationMethod: string };
}

export function DetailActions({ vacancyId, applicationId, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({ rejectionReason: "", ...initial });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!applicationId) { setMessage("Choose an application status first, then add process details."); return; }
    setPending(true);
    const response = await fetch(`/api/applications/${applicationId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update", ...values, followUpAt: values.followUpAt ? new Date(values.followUpAt).toISOString() : null }) });
    setPending(false); setMessage(response.ok ? "Application details saved." : "Could not save details."); router.refresh();
  }
  async function archive() {
    setPending(true);
    await fetch(`/api/vacancies/${vacancyId}/archive`, { method: "POST" });
    router.push("/inbox"); router.refresh();
  }

  return <div className="space-y-5">
    <section className="panel p-5">
      <h2 className="font-black">Process details</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-bold">Contact name</span><input value={values.contactName} onChange={(event) => set("contactName", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" /></label>
        <label><span className="mb-1 block text-sm font-bold">Contact role</span><input value={values.contactRole} onChange={(event) => set("contactRole", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" /></label>
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-bold">Contact URL</span><input value={values.contactUrl} onChange={(event) => set("contactUrl", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="LinkedIn profile or email context" /></label>
        <label><span className="mb-1 block text-sm font-bold">Тактика отклика</span><select value={values.applicationMethod} onChange={(event) => set("applicationMethod", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3"><option value="tailored">Точечное резюме</option><option value="direct_outreach">Прямой контакт</option><option value="referral">Реферал</option><option value="quick_apply">Быстрый отклик</option></select></label>
        <label><span className="mb-1 flex items-center gap-1 text-sm font-bold"><CalendarClock size={15} /> Follow up</span><input type="date" value={values.followUpAt} onChange={(event) => set("followUpAt", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" /></label>
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-bold">Rejection reason</span><input value={values.rejectionReason} onChange={(event) => set("rejectionReason", event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder="Optional" /></label>
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-bold">Notes</span><textarea value={values.notes} onChange={(event) => set("notes", event.target.value)} className="focus-ring min-h-28 w-full rounded-md border bg-[var(--panel)] p-3" /></label>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{message}</p>}
      <Button className="mt-4" variant="primary" onClick={save} disabled={pending}><Save size={16} /> Save details</Button>
    </section>
    <section className="panel p-5"><h2 className="font-black">Vacancy actions</h2><p className="mt-1 text-sm text-[var(--muted)]">Archiving hides this vacancy from Inbox but keeps its data in the local database.</p><Button variant="danger" className="mt-4" onClick={archive} disabled={pending}><Archive size={16} /> Archive vacancy</Button></section>
  </div>;
}
