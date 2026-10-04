import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/widgets/app-shell";
import { getActiveProfile, getProfiles } from "@/server/repository";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Radar — Ranked job inbox",
  description: "Local-first vacancy ranking, application tracking, and follow-up queue.",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let profileName = "Default Profile";
  let profiles: Array<{ id: string; name: string; active: boolean }> = [];
  try {
    profileName = (await getActiveProfile())?.name ?? profileName;
    profiles = (await getProfiles()).map((profile) => ({ id: profile.id, name: profile.name, active: profile.isActive }));
  } catch { /* setup screen still renders before migration */ }
  return (
    <html lang="ru" suppressHydrationWarning className={inter.variable}>
      <body>
        <Providers>
          <AppShell profileName={profileName} profiles={profiles}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
