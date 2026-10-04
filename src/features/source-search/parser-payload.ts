import { splitInputLines } from "./line-input";

export interface ParserFormInput {
  urlsText: string;
  text: string;
  title: string;
  company: string;
  location: string;
}

export function prepareParserPayload(input: ParserFormInput) {
  const urls = splitInputLines(input.urlsText);
  const description = input.text.trim();

  if (!urls.length && !description) throw new Error("Добавьте хотя бы одну ссылку на вакансию или вставьте её полное описание.");
  if (description && description.length < 30 && !urls.length) {
    throw new Error(`Текст слишком короткий: ${description.length} из 30 символов. Вставьте полное описание вакансии.`);
  }

  const pasted = description.length >= 30 ? [{
    url: urls[0] ?? null,
    title: input.title.trim(),
    company: input.company.trim(),
    location: input.location.trim() || null,
    description,
  }] : [];

  return { urls: pasted.length && urls.length ? urls.slice(1) : urls, pasted };
}
