"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function FollowUpButton({ applicationId }: { applicationId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function mark() {
    setPending(true);
    await fetch(`/api/applications/${applicationId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "followed-up" }) });
    setPending(false); router.refresh();
  }
  return <Button size="sm" variant="primary" onClick={mark} disabled={pending}><Send size={15} />{pending ? "Saving…" : "Mark followed up"}</Button>;
}
