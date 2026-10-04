const asString = (value: unknown) => typeof value === "string" ? value : value == null ? "" : String(value);

export function isRoleRelevant(titleValue: unknown, descriptionValue: unknown = "", queryValues: string[] = []) {
  const title = asString(titleValue);
  const description = asString(descriptionValue);
  const query = queryValues.join(" ");
  const haystack = `${title} ${description}`;
  if (/product designer|ux|ui|figma|design system|дизайн/i.test(query)) {
    if (/accountant|nurse|sales|marketing|backend|devops|qa engineer/i.test(title)) return false;
    return /designer|design|ux|ui|figma|research|product/i.test(title) || /figma|design system|user research|prototyp/i.test(description);
  }
  if (/web3|blockchain|crypto|defi|solidity|крипто|блокчейн/i.test(query)) {
    if (/accountant|nurse|sales|marketing|qa engineer/i.test(title)) return false;
    return /web3|blockchain|crypto|defi|solidity|dapp|smart contract|frontend|react/i.test(haystack);
  }
  if (/software engineer|full.?stack|backend|developer|разработчик/i.test(query) && !/front.?end|react|typescript/i.test(query)) {
    if (/sales|marketing|accountant|nurse|designer|writer|content/i.test(title)) return false;
    return /engineer|developer|программист|разработчик/i.test(title);
  }
  return isFrontendRelevant(title, description);
}

export function isFrontendRelevant(titleValue: unknown, descriptionValue: unknown = "") {
  const title = asString(titleValue);
  const description = asString(descriptionValue);
  if (/backend|back-end|\.net|security|devops|sales|marketing|designer|writer|content|data scientist|machine learning|accountant|nurse|analyst/i.test(title)) return false;
  if (/front.?end|react|typescript|javascript|next\.?(?:js)?|shopify|web developer/i.test(title)) return true;
  return /(?:software|product|web) engineer|full.?stack/i.test(title) && /react|typescript|javascript|front.?end|next\.?(?:js)?/i.test(description);
}
