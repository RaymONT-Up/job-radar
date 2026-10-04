"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus } from "@/entities/types";
import { Button } from "@/shared/ui/button";

export function StatusActions({ vacancyId, currentStatus = "FOUND", compact = false }: { vacancyId: string; currentStatus?: ApplicationStatus; compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<ApplicationStatus | null>(null);
  async function update(status: ApplicationStatus) {
    setPending(status);
    try {
      const response = await fetch("/api/applications/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vacancyId, status }) });
      if (!response.ok) throw new Error("Status update failed");
      router.refresh();
    } finally { setPending(null); }
  }
  if (compact) return <select value={currentStatus} onChange={(event) => update(event.target.value as ApplicationStatus)} disabled={Boolean(pending)} className="focus-ring h-8 rounded-md border bg-[var(--panel)] px-2 text-sm font-semibold">
    {["FOUND", "SHORTLISTED", "APPLIED", "REPLIED", "HR", "TECH", "FINAL", "OFFER", "REJECTED", "WITHDRAWN"].map((status) => <option key={status}>{status}</option>)}
  </select>;
  return <div className="flex flex-wrap gap-2">
    {currentStatus === "FOUND" && <Button size="sm" onClick={() => update("SHORTLISTED")} disabled={Boolean(pending)}>Shortlist</Button>}
    {!["APPLIED", "REPLIED", "HR", "TECH", "FINAL", "OFFER"].includes(currentStatus) && <Button size="sm" variant="primary" onClick={() => update("APPLIED")} disabled={Boolean(pending)}>{pending === "APPLIED" ? "Saving…" : "Mark applied"}</Button>}
    <Button size="sm" variant="ghost" onClick={() => update("WITHDRAWN")} disabled={Boolean(pending)}>Skip</Button>
  </div>;
}
