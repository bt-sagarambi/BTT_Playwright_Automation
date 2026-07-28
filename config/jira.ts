/**
 * Jira auto-file settings for failed Playwright tests.
 * Secrets live in config/env.local.ts (gitignored) or env vars.
 */
export type JiraConfig = {
  /** Must be true to create issues on failure */
  enabled: boolean;
  siteUrl: string;
  /** Required for scoped API tokens; auto-fetched from site if omitted */
  cloudId?: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  assigneeEmail: string;
  /** Optional; resolved from assigneeEmail when omitted */
  assigneeAccountId?: string;
};

type LocalJira = {
  jira?: Partial<JiraConfig>;
};

function loadLocalJira(): Partial<JiraConfig> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const local = require('./env.local') as LocalJira;
    return local.jira || {};
  } catch {
    return {};
  }
}

const local = loadLocalJira();

const defaults: JiraConfig = {
  enabled: false,
  siteUrl: 'https://bluetriangletech.atlassian.net',
  cloudId: undefined,
  email: '',
  apiToken: '',
  projectKey: 'QAT',
  issueType: 'QA Found Defect',
  assigneeEmail: 'v-sagar.ambi@bluetriangle.com',
  assigneeAccountId: undefined,
};

function fromEnv(): Partial<JiraConfig> {
  const enabledRaw = process.env.JIRA_AUTO_FILE;
  return {
    enabled:
      enabledRaw === '1' || enabledRaw === 'true'
        ? true
        : enabledRaw === '0' || enabledRaw === 'false'
          ? false
          : undefined,
    siteUrl: process.env.JIRA_SITE_URL,
    cloudId: process.env.JIRA_CLOUD_ID,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
    issueType: process.env.JIRA_ISSUE_TYPE,
    assigneeEmail: process.env.JIRA_ASSIGNEE_EMAIL,
    assigneeAccountId: process.env.JIRA_ASSIGNEE_ACCOUNT_ID,
  };
}

function pick<T>(...vals: Array<T | undefined | null | ''>): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

const env = fromEnv();

export const jiraConfig: JiraConfig = {
  enabled: pick(env.enabled, local.enabled, defaults.enabled) ?? false,
  siteUrl: pick(env.siteUrl, local.siteUrl, defaults.siteUrl)!,
  cloudId: pick(env.cloudId, local.cloudId, defaults.cloudId),
  email: pick(env.email, local.email, defaults.email)!,
  apiToken: pick(env.apiToken, local.apiToken, defaults.apiToken)!,
  projectKey: pick(env.projectKey, local.projectKey, defaults.projectKey)!,
  issueType: pick(env.issueType, local.issueType, defaults.issueType)!,
  assigneeEmail: pick(env.assigneeEmail, local.assigneeEmail, defaults.assigneeEmail)!,
  assigneeAccountId: pick(env.assigneeAccountId, local.assigneeAccountId, defaults.assigneeAccountId),
};

export function isJiraAutoFileReady(cfg: JiraConfig = jiraConfig): boolean {
  return Boolean(cfg.enabled && cfg.email && cfg.apiToken && cfg.projectKey && cfg.issueType);
}
