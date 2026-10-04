export interface NotionApplicationMapping {
  company: string;
  vacancy: string;
  status: string;
  fit: string;
  source: string;
  salary: string | null;
  applied: string | null;
  followUp: string | null;
  contact: string | null;
  url: string | null;
  notes: string | null;
}

export interface NotionAdapter {
  pushApplication(application: NotionApplicationMapping): Promise<{ externalId: string }>;
}
