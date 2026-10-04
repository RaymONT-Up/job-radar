import { getAllData } from "@/server/repository";

export async function GET() {
  const data = await getAllData();
  return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="job-radar-backup-${new Date().toISOString().slice(0, 10)}.json"` } });
}
