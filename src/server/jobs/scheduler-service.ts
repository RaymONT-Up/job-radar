import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const label = "com.jobradar.collect";

function paths() {
  const project = process.cwd();
  const agentsDir = join(homedir(), "Library", "LaunchAgents");
  return { project, agentsDir, plistPath: join(agentsDir, `${label}.plist`), logDir: join(project, "data", "logs") };
}

function domain() { return `gui/${process.getuid?.() ?? 501}`; }

function bootout(plistPath: string) {
  try { execFileSync("launchctl", ["bootout", domain(), plistPath], { stdio: "ignore" }); }
  catch { /* Not loaded. */ }
}

export function schedulerStatus() {
  const { plistPath, logDir } = paths();
  return { supported: process.platform === "darwin", installed: existsSync(plistPath), intervalHours: 6, plistPath, logPath: join(logDir, "collector.log") };
}

export function installScheduler() {
  if (process.platform !== "darwin") throw new Error("Автоустановка сейчас поддерживает macOS. Для Linux используйте cron-команду из README.");
  const { project, agentsDir, plistPath, logDir } = paths();
  mkdirSync(agentsDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  const escaped = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const command = `cd ${JSON.stringify(project)} && npm run collect:jobs`;
  const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>/bin/zsh</string><string>-lc</string><string>${escaped(command)}</string></array><key>StartInterval</key><integer>21600</integer><key>RunAtLoad</key><true/><key>StandardOutPath</key><string>${escaped(join(logDir, "collector.log"))}</string><key>StandardErrorPath</key><string>${escaped(join(logDir, "collector-error.log"))}</string></dict></plist>`;
  bootout(plistPath);
  writeFileSync(plistPath, plist, { mode: 0o600 });
  execFileSync("launchctl", ["bootstrap", domain(), plistPath], { stdio: "ignore" });
  return schedulerStatus();
}

export function uninstallScheduler() {
  const { plistPath } = paths();
  bootout(plistPath);
  if (existsSync(plistPath)) unlinkSync(plistPath);
  return schedulerStatus();
}
