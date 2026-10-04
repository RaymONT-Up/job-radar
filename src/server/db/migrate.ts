import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.pragma("optimize");
console.log("Database migrations applied.");
sqlite.close();
