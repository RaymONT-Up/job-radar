/**
 * Split multiline fields pasted from browsers, spreadsheets and chat.
 * Some clients turn a line break into the two visible characters "\\n".
 */
export function splitInputLines(value: string): string[] {
  return value
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
