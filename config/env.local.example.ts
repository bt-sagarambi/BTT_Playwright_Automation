/**
 * Local credentials — DO NOT COMMIT.
 * Copy this file to env.local.ts and fill in values.
 */
export const activeEnvironment = 'prod' as const;

export const environments = {
  stage: {
    username: 'your.email@example.com',
    password: 'your-password',
  },
  /**
   * Optional — omit to reuse stage username/password (see config/env.ts).
   * UAT portal: https://portaluat.bluetriangle.com/
   */
  // uat: {
  //   username: 'your.email@example.com',
  //   password: 'your-password',
  // },
};

/**
 * Auto-file QAT defects when Playwright tests fail.
 * Requires a scoped Atlassian API token with:
 *   write:jira-work, read:jira-work, read:jira-user
 * Optional override: JIRA_AUTO_FILE=true|false
 */
export const jira = {
  enabled: false,
  siteUrl: 'https://bluetriangletech.atlassian.net',
  // cloudId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // optional; auto-fetched if omitted
  email: 'your.email@example.com',
  apiToken: 'your-atlassian-api-token-with-scopes',
  projectKey: 'QAT',
  issueType: 'QA Found Defect',
  assigneeEmail: 'v-sagar.ambi@bluetriangle.com',
  // assigneeAccountId: 'optional-account-id',
};
