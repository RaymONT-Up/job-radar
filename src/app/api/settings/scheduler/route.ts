import { NextResponse } from "next/server";
import { installScheduler, schedulerStatus, uninstallScheduler } from "@/server/jobs/scheduler-service";

export async function GET() {
  return NextResponse.json(schedulerStatus());
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as { action?: unknown };
    const status = input.action === "install" ? installScheduler() : input.action === "uninstall" ? uninstallScheduler() : schedulerStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scheduler action failed" }, { status: 400 });
  }
}
