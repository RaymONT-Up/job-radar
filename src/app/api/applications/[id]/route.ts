import { NextResponse } from "next/server";
import { z } from "zod";
import { markFollowedUp, updateApplicationDetails } from "@/server/repository";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("followed-up") }),
  z.object({ action: z.literal("update"), contactName: z.string().nullable().optional(), contactRole: z.string().nullable().optional(), contactUrl: z.string().nullable().optional(), notes: z.string().nullable().optional(), followUpAt: z.string().datetime().nullable().optional(), rejectionReason: z.string().nullable().optional(), applicationMethod: z.enum(["tailored", "direct_outreach", "referral", "quick_apply"]).optional() }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const value = schema.parse(await request.json());
    if (value.action === "followed-up") await markFollowedUp(id);
    else {
      const { action: _action, ...details } = value;
      void _action;
      const { followUpAt, ...rest } = details;
      await updateApplicationDetails(id, { ...rest, followUpAt: followUpAt == null ? followUpAt : new Date(followUpAt) });
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 }); }
}
