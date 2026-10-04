import { Suspense } from "react";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return <div className="space-y-5"><div><h1 className="text-2xl font-black md:text-3xl">Import vacancy</h1><p className="mt-1 text-[var(--muted)]">Paste → analyze → save. Usually under 30 seconds.</p></div><Suspense><ImportForm /></Suspense></div>;
}
