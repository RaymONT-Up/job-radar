import { db, sqlite } from "./client";
import { applicationEvents, applications, vacancies, vacancyNormalizedData, vacancyScores } from "./schema";

async function reset() {
  db.delete(applicationEvents).run();
  db.delete(applications).run();
  db.delete(vacancyScores).run();
  db.delete(vacancyNormalizedData).run();
  db.delete(vacancies).run();
  console.log("Vacancies and application history cleared. Candidate profiles and credentials were preserved.");
  sqlite.close();
}

reset().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
