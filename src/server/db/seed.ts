import { DEFAULT_PROFILE } from "@/entities/constants";
import { db, sqlite } from "./client";
import { candidateProfiles } from "./schema";

export async function seedDatabase() {
  const now = new Date();
  db.insert(candidateProfiles).values({ ...DEFAULT_PROFILE, createdAt: now, updatedAt: now, isActive: true }).onConflictDoNothing().run();
  sqlite.pragma("optimize");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("Created the default candidate profile. No demo vacancies were added.");
    sqlite.close();
  });
}
