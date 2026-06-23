export const resolveCommandRequiresApproval = (
  requiresApprovalRaw?: string,
  command?: string,
): boolean =>
  commandRequiresApproval(command)
    ? true
    : requiresApprovalRaw === undefined
      ? true
      : requiresApprovalRaw.trim().toLowerCase() !== "false";

const commandRequiresApproval = (command: string | undefined): boolean => {
  if (!command?.trim()) {
    return false;
  }
  return highRiskCommandApprovalPatterns.some((pattern) =>
    pattern.test(command),
  );
};

const highRiskCommandApprovalPatterns = [
  /\bcheckpoint:(?:rollback|restore)\b|\brollback\b/i,
  /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?publish\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+(?:reset\s+--hard|clean\s+-[^\s]*f)\b/i,
  /\brm\s+-[^\s]*(?=[^\s]*r)(?=[^\s]*f)[^\s]*\b/i,
  /(?:^|[;&|]\s*)(?:sudo\s+)?(?:rm|rmdir|unlink)\s+(?!-(?:h|-help)\b)/i,
  /(?:^|[;&|]\s*)(?:sudo\s+)?(?:mv|cp|touch|truncate)\s+(?!-(?:h|-help)\b)/i,
  /(?:^|[;&|]\s*)(?:sudo\s+)?(?:sed\s+-[^\s]*i|perl\s+-[^\s]*p[^\s]*i|tee(?:\s+-[A-Za-z-]+)*\s+)\b/i,
  /(?:^|[\s;&|])(?:\d+|&)?(?:>>?|>\|)\s*(?!&?\d\b)(?!\/dev\/null\b)\S+/i,
  /\b(?:node|bun|deno|python3?|ruby|php|perl)\b[\s\S]*?(?:^|\s)(?:-[ec]\b|--eval\b|--command\b)[\s\S]*?(?:\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|copyFile|rename|unlink|mkdir|Bun\.write|Deno\.writeTextFile|shutil\.(?:rmtree|move|copy|copyfile|copytree))\b|\bopen\s*\()/i,
  /\b(?:terraform\s+(?:apply|destroy)|pulumi\s+up|kubectl\s+delete|docker\s+system\s+prune)\b/i,
  /\b(?:drop\s+(?:database|schema|table)|truncate\s+table)\b/i,
  /\b(?:vercel\b.*--prod|netlify\s+deploy\b.*--prod|deploy\b.*\b(?:prod|production)\b|production\b.*\bdeploy)\b/i,
  /\b(?:stripe|billing|invoice|refund|charge|payment|subscription)\b/i,
  /\b(?:(?:gmail|sendgrid|mailgun|smtp|email|mail)\b.*\b(?:send|deliver|compose|reply|forward)|(?:send|deliver|compose|reply|forward)\b.*\b(?:gmail|sendgrid|mailgun|smtp|email|mail))\b/i,
  /\b(?:(?:mcp)\b.*\b(?:publish|register|expose|public)|(?:publish|register|expose|public)\b.*\bmcp\b)\b/i,
];
