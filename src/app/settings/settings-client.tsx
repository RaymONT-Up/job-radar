"use client";

import { Clock3, DatabaseBackup, Download, FileDown, KeyRound, Pause, Play, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { HelpTooltip } from "@/shared/ui/help-tooltip";

type CredentialField = { key: string; label: string; secret: boolean; configured: boolean };
type CredentialDefinition = { source: string; label: string; description: string; fields: CredentialField[] };
type SchedulerState = { supported: boolean; installed: boolean; intervalHours: number; logPath: string; error?: string };

function SchedulerPanel() {
  const [status, setStatus] = useState<SchedulerState | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/settings/scheduler").then((response) => response.json()).then(setStatus).catch(() => setMessage("Не удалось проверить локальное расписание")); }, []);
  async function update(action: "install" | "uninstall") {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/settings/scheduler", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json() as SchedulerState;
      if (!response.ok) throw new Error(result.error || "Не удалось изменить расписание");
      setStatus(result); setMessage(action === "install" ? "Фоновый сбор включён: сейчас и затем каждые 6 часов." : "Фоновый сбор выключен.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось изменить расписание"); }
    finally { setPending(false); }
  }
  return <section className="panel p-5 md:p-6"><div className="flex items-start gap-3"><Clock3 className="text-[var(--accent)]" /><div><h2 className="font-black">Фоновый поиск</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Локальный сборщик проверяет адаптеры, Telegram и career watchlist каждые 6 часов. Письма он не отправляет.</p></div></div><div className="mt-5 flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${status?.installed ? "bg-[var(--good-soft)] text-[var(--good)]" : "bg-[var(--panel-2)] text-[var(--muted)]"}`}>{status?.installed ? "ВКЛЮЧЁН" : "ВЫКЛЮЧЕН"}</span>{status?.installed ? <Button onClick={() => update("uninstall")} disabled={pending}><Pause size={16} /> Выключить</Button> : <Button variant="primary" onClick={() => update("install")} disabled={pending || status?.supported === false}><Play size={16} /> Включить каждые 6 часов</Button>}</div>{status?.supported === false && <p className="mt-3 text-sm text-[var(--warn)]">Автоустановка из интерфейса доступна на macOS. Для Linux используй cron-команду из README.</p>}{status?.logPath && <p className="mt-3 break-all text-xs text-[var(--muted)]">Лог: {status.logPath}</p>}{message && <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{message}</p>}</section>;
}

function SourceCredentialsPanel() {
  const [definitions, setDefinitions] = useState<CredentialDefinition[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { fetch("/api/settings/credentials").then((response) => response.json()).then((result: { credentials: CredentialDefinition[] }) => setDefinitions(result.credentials)).catch(() => setMessage("Не удалось загрузить статус ключей")); }, []);
  function setValue(source: string, key: string, value: string) { setValues((current) => ({ ...current, [source]: { ...current[source], [key]: value } })); }
  async function save(source: string) {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/settings/credentials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, values: values[source] ?? {} }) });
      const result = await response.json() as { credentials?: CredentialDefinition[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить ключи");
      setDefinitions(result.credentials ?? definitions); setValues((current) => ({ ...current, [source]: {} })); setMessage("Ключ сохранён локально. Перезапусти поиск источников, чтобы проверить соединение.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось сохранить ключи"); }
    finally { setPending(false); }
  }
  return <section className="panel p-5 md:p-6 lg:col-span-2"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 text-[var(--accent)]" /><div><h2 className="flex items-center gap-2 font-black">Интеграции и ключи <HelpTooltip text="Здесь настраиваются платные API, публичные Telegram-каналы, карьерные ATS-доски, AI и SMTP для подтверждённой отправки писем." /></h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">Можно хранить значения в `.env.local` или ввести здесь. В интерфейсе показывается только статус, сами секреты не возвращаются. Значения шифруются локальным ключом и остаются в твоём SQLite.</p></div><ShieldCheck className="ml-auto shrink-0 text-[var(--good)]" /></div><div className="mt-5 grid gap-4 md:grid-cols-2">{definitions.map((definition) => <div key={definition.source} className="rounded-lg border bg-[var(--panel-2)] p-4"><div className="flex items-center gap-2 font-black">{definition.label}<HelpTooltip text={definition.source === "ai" ? "Используется только после нажатия «Сгенерировать с AI» в вакансии. Автоматических расходов нет." : definition.source === "mail" ? "Письмо отправляется только после проверки, галочки подтверждения и нажатия Approve & Send." : "Настройка используется сервером только выбранной интеграцией."} /></div><div className="mt-1 text-sm text-[var(--muted)]">{definition.description}</div><div className="mt-4 space-y-3">{definition.fields.map((field) => <label key={field.key} className="block"><span className="mb-1 flex items-center gap-1 text-xs font-bold">{field.label} {field.configured && <span className="font-normal text-[var(--good)]">· настроено</span>}<HelpTooltip text={field.secret ? "Секрет шифруется локально и никогда не показывается после сохранения." : "Несекретная настройка интеграции; её можно изменить в любой момент."} /></span><input type={field.secret ? "password" : "text"} value={values[definition.source]?.[field.key] ?? ""} onChange={(event) => setValue(definition.source, field.key, event.target.value)} className="focus-ring h-10 w-full rounded-md border bg-[var(--panel)] px-3" placeholder={field.configured ? "Оставь пустым, чтобы не менять" : "Вставь значение"} autoComplete="off" /></label>)}</div><Button className="mt-4" onClick={() => save(definition.source)} disabled={pending}>Сохранить</Button></div>)}</div>{message && <p className="mt-4 text-sm font-semibold text-[var(--accent)]">{message}</p>}<p className="mt-4 text-xs leading-5 text-[var(--muted)]">Не вставляй ключи в README, Notion, скриншоты или `NEXT_PUBLIC_*`. Для cloud/SaaS позже понадобится отдельный secrets manager.</p></section>;
}

export function SettingsClient() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function importFile(file?: File) {
    if (!file) return;
    setPending(true); setMessage("");
    try { const response = await fetch("/api/settings/import", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error); setMessage("Backup restored successfully."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not import backup"); }
    finally { setPending(false); }
  }
  async function clearData() {
    if (!window.confirm("Удалить все вакансии и историю откликов? Профиль и API-ключи сохранятся. Перед удалением можно сделать backup.")) return;
    setPending(true); const response = await fetch("/api/settings/reset", { method: "POST" }); setPending(false); setMessage(response.ok ? "Вакансии и история откликов удалены." : "Не удалось очистить данные."); router.refresh();
  }
  return <div className="grid gap-5 lg:grid-cols-2"><section className="panel p-5 md:p-6"><div className="flex items-center gap-3"><DatabaseBackup className="text-[var(--accent)]" /><div><h2 className="flex items-center gap-2 font-black">Backup & ownership <HelpTooltip text="Backup содержит профили, вакансии, scoring, outreach drafts и историю откликов. Секретные API-ключи намеренно не экспортируются." /></h2><p className="text-sm text-[var(--muted)]">Everything stays in your local SQLite database.</p></div></div><div className="mt-6 space-y-3"><a href="/api/settings/export" download><Button className="w-full justify-start"><Download size={16} /> Export full JSON backup</Button></a><button onClick={() => input.current?.click()} className="focus-ring flex h-10 w-full items-center gap-2 rounded-md border bg-[var(--panel)] px-4 text-sm font-semibold hover:bg-[var(--panel-2)]" disabled={pending}><Upload size={16} /> Import JSON backup</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={(event) => importFile(event.target.files?.[0])} /><a href="/api/settings/applications.csv" download><Button className="w-full justify-start"><FileDown size={16} /> Export applications CSV</Button></a></div></section><section className="panel p-5 md:p-6"><div className="flex items-center gap-3"><Trash2 className="text-[var(--warn)]" /><div><h2 className="flex items-center gap-2 font-black">Очистить данные <HelpTooltip text="Удаляет вакансии, scoring и историю откликов. Профили и зашифрованные API-ключи сохраняются." /></h2><p className="text-sm text-[var(--muted)]">Начать поиск с пустого списка вакансий.</p></div></div><p className="mt-6 text-sm leading-6 text-[var(--muted)]">Действие необратимо без backup. Профиль и API-ключи останутся на месте.</p><Button variant="danger" className="mt-4" onClick={clearData} disabled={pending}><Trash2 size={16} /> Удалить вакансии и отклики</Button></section><SchedulerPanel /><SourceCredentialsPanel />{message && <div className="panel p-4 text-sm font-semibold text-[var(--accent)] lg:col-span-2">{message}</div>}</div>;
}
