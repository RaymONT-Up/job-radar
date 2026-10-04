"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, BriefcaseBusiness, CalendarCheck2, CircleUserRound, DatabaseZap, Inbox, Moon, Plus, Radar, Settings, Sun, Upload } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

const nav = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: CalendarCheck2 },
  { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/sources/hh", label: "Sources", icon: DatabaseZap },
  { href: "/profiles", label: "Profiles", icon: CircleUserRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "How to use", icon: BookOpen },
];

function ThemeButton() {
  useEffect(() => {
    const saved = localStorage.getItem("job-radar-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("job-radar-theme", dark ? "dark" : "light");
  };
  return <button className="focus-ring rounded-md p-2 text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]" onClick={toggle} aria-label="Toggle color theme">
    <Sun size={18} className="hidden dark:block" /><Moon size={18} className="dark:hidden" />
  </button>;
}

export function AppShell({ children, profileName = "Default Profile", profiles = [] }: { children: ReactNode; profileName?: string; profiles?: Array<{ id: string; name: string; active: boolean }> }) {
  const pathname = usePathname();
  const router = useRouter();
  async function changeProfile(id: string) {
    await fetch("/api/profiles", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }
  return <>
    <aside className="desktop-sidebar fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-[var(--sidebar)] text-slate-300">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5 text-white">
        <div className="grid size-8 place-items-center rounded-lg bg-blue-600"><Radar size={20} /></div>
        <div><div className="text-sm font-black tracking-wide">JOB RADAR</div><div className="text-xs text-slate-500">Local workspace</div></div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={cn("focus-ring flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition", active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white")}>
            <item.icon size={18} />{item.label}
          </Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/capture" className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-white/5"><Upload size={17} /> Capture setup</Link>
      </div>
    </aside>
    <div className="app-main min-h-screen md:ml-56">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[color:var(--panel)]/95 px-4 backdrop-blur md:px-7">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Active profile</div>
          {profiles.length ? <select aria-label="Active candidate profile" value={profiles.find((profile) => profile.active)?.id ?? profiles[0].id} onChange={(event) => changeProfile(event.target.value)} className="focus-ring -ml-1 max-w-52 rounded border-0 bg-transparent px-1 text-sm font-bold">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select> : <div className="truncate text-sm font-bold">{profileName}</div>}
        </div>
        <ThemeButton />
        <button onClick={() => router.push("/import")} className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-bold text-white"><Plus size={17} /> <span className="hidden sm:inline">Import vacancy</span></button>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 pb-24 md:p-7">{children}</main>
    </div>
    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-50 hidden justify-around border-t bg-[var(--panel)] px-1 py-2">
      {nav.slice(0, 5).map((item) => <Link key={item.href} href={item.href} className={cn("flex min-w-14 flex-col items-center gap-1 rounded p-1 text-xs", pathname.startsWith(item.href) ? "text-[var(--accent)]" : "text-[var(--muted)]")}><item.icon size={19} />{item.label}</Link>)}
    </nav>
  </>;
}
