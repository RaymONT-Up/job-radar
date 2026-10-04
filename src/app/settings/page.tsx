import { SettingsClient } from "./settings-client";
export default function SettingsPage() { return <div className="space-y-5"><div><h1 className="text-2xl font-black md:text-3xl">Settings</h1><p className="mt-1 text-[var(--muted)]">Local-first data controls and portable exports.</p></div><SettingsClient /></div>; }
