import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { isJiraAutoFileReady, jiraConfig, type JiraConfig } from '../config/jira';

type AdfDoc = {
  type: 'doc';
  version: 1;
  content: unknown[];
};

type JiraSearchResponse = {
  issues?: Array<{ key: string; fields?: { summary?: string } }>;
};

type JiraCreateResponse = {
  key?: string;
  id?: string;
};

type JiraUser = {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
};

/**
 * Creates a QAT "QA Found Defect" when a Playwright test fails (final attempt only).
 * Attaches failure screenshots (and optional images) to the new issue.
 * Dedupe: open issues labeled auto-pw-<fingerprint> are reused instead of duplicated.
 *
 * Enable via config/env.local.ts → jira.enabled = true (+ email/apiToken),
 * or JIRA_AUTO_FILE=true with JIRA_EMAIL / JIRA_API_TOKEN.
 */
class JiraFailureReporter implements Reporter {
  private cfg: JiraConfig = jiraConfig;
  private baseApi = '';
  private authHeader = '';
  private assigneeAccountId = '';
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private readonly filed = new Set<string>();
  private readonly pending: Promise<void>[] = [];

  onBegin(_config: FullConfig): void {
    this.cfg = jiraConfig;
    if (!isJiraAutoFileReady(this.cfg)) {
      if (this.cfg.enabled) {
        console.warn(
          '[jira-reporter] enabled but missing email/apiToken — skipping auto-file'
        );
      }
      return;
    }
    this.initPromise = this.initialize();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.pending.push(this.handleTestEnd(test, result));
  }

  async onEnd(): Promise<void> {
    if (this.initPromise) await this.initPromise;
    await Promise.all(this.pending);
  }

  private async handleTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (!isJiraAutoFileReady(this.cfg)) return;
    if (result.status !== 'failed' && result.status !== 'timedOut') return;
    // Wait for remaining retries before filing
    if (result.retry < test.retries) return;

    await this.initPromise;
    if (!this.ready) return;

    const fp = fingerprint(test);
    if (this.filed.has(fp)) return;

    try {
      const existing = await this.findOpenIssue(fp);
      if (existing) {
        // Still attach latest screenshots to the open defect when available
        const attached = await this.attachScreenshots(existing, result);
        console.log(
          `[jira-reporter] existing open defect ${existing} for ${test.title}` +
            (attached ? ` (+${attached} attachment(s))` : '')
        );
        this.filed.add(fp);
        return;
      }

      const key = await this.createIssue(test, result, fp);
      if (key) {
        const attached = await this.attachScreenshots(key, result);
        console.log(
          `[jira-reporter] filed ${key} ← ${test.title}` +
            (attached ? ` (+${attached} screenshot(s))` : '')
        );
        this.filed.add(fp);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[jira-reporter] failed to file defect for "${test.title}": ${msg}`);
    }
  }

  private async initialize(): Promise<void> {
    try {
      const site = this.cfg.siteUrl.replace(/\/$/, '');
      let cloudId = this.cfg.cloudId;
      if (!cloudId) {
        cloudId = await this.fetchCloudId(site);
      }

      // Scoped tokens require the gateway; classic tokens also work there.
      this.baseApi = cloudId
        ? `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
        : `${site}/rest/api/3`;

      this.authHeader =
        'Basic ' + Buffer.from(`${this.cfg.email}:${this.cfg.apiToken}`).toString('base64');

      this.assigneeAccountId =
        this.cfg.assigneeAccountId ||
        (await this.resolveAccountId(this.cfg.assigneeEmail)) ||
        '';

      this.ready = true;
      console.log(
        `[jira-reporter] ready → ${this.cfg.projectKey} / ${this.cfg.issueType}` +
          (this.assigneeAccountId ? ` → ${this.cfg.assigneeEmail}` : ' (assignee unresolved)')
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[jira-reporter] init failed: ${msg}`);
      this.ready = false;
    }
  }

  private async fetchCloudId(siteUrl: string): Promise<string | undefined> {
    try {
      const res = await fetch(`${siteUrl}/_edge/tenant_info`);
      if (!res.ok) return undefined;
      const data = (await res.json()) as { cloudId?: string };
      return data.cloudId;
    } catch {
      return undefined;
    }
  }

  private async resolveAccountId(email: string): Promise<string | undefined> {
    const url = `${this.baseApi}/user/search?query=${encodeURIComponent(email)}`;
    const users = await this.apiJson<JiraUser[]>(url);
    const match =
      users.find((u) => u.emailAddress?.toLowerCase() === email.toLowerCase()) || users[0];
    return match?.accountId;
  }

  private async findOpenIssue(fp: string): Promise<string | undefined> {
    const label = labelFor(fp);
    const jql = `project = "${this.cfg.projectKey}" AND labels = "${label}" AND resolution = Unresolved ORDER BY created DESC`;

    // Prefer POST /search/jql (current Cloud API); fall back to legacy GET /search.
    try {
      const data = await this.apiJson<JiraSearchResponse>(`${this.baseApi}/search/jql`, {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: 1, fields: ['summary'] }),
      });
      return data.issues?.[0]?.key;
    } catch {
      const legacy = `${this.baseApi}/search?jql=${encodeURIComponent(jql)}&maxResults=1&fields=summary`;
      const data = await this.apiJson<JiraSearchResponse>(legacy);
      return data.issues?.[0]?.key;
    }
  }

  private async createIssue(
    test: TestCase,
    result: TestResult,
    fp: string
  ): Promise<string | undefined> {
    const titlePath = test.titlePath().filter(Boolean).join(' › ');
    const file = relativePath(test.location.file);
    const errorText = (result.error?.message || result.error?.stack || 'Unknown error').slice(
      0,
      8000
    );
    const summary = truncate(
      `[AUTO][Playwright] ${test.title}`.replace(/\s+/g, ' ').trim(),
      255
    );

    const fields: Record<string, unknown> = {
      project: { key: this.cfg.projectKey },
      issuetype: { name: this.cfg.issueType },
      summary,
      labels: ['auto-playwright', labelFor(fp)],
      description: toAdf([
        `Automated defect from Playwright failure.`,
        '',
        `*Test:* ${titlePath}`,
        `*File:* ${file}:${test.location.line}`,
        `*Project:* ${test.parent?.project()?.name || 'n/a'}`,
        `*Status:* ${result.status}`,
        `*Duration:* ${Math.round(result.duration / 1000)}s`,
        `*Fingerprint:* ${fp}`,
        '',
        '*Error:*',
        errorText,
        '',
        'Failure screenshot(s) are attached to this issue when available.',
      ]),
    };

    if (this.assigneeAccountId) {
      fields.assignee = { accountId: this.assigneeAccountId };
    }

    const created = await this.apiJson<JiraCreateResponse>(`${this.baseApi}/issue`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
    return created.key;
  }

  private async attachScreenshots(issueKey: string, result: TestResult): Promise<number> {
    const images = collectImageAttachments(result);
    if (!images.length) return 0;

    let count = 0;
    for (const image of images.slice(0, 5)) {
      try {
        await this.uploadAttachment(issueKey, image.filename, image.bytes, image.contentType);
        count += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[jira-reporter] attachment failed for ${issueKey}: ${msg}`);
      }
    }
    return count;
  }

  private async uploadAttachment(
    issueKey: string,
    filename: string,
    bytes: Buffer,
    contentType: string
  ): Promise<void> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(bytes)], { type: contentType || 'application/octet-stream' }),
      filename
    );

    const res = await fetch(`${this.baseApi}/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'X-Atlassian-Token': 'no-check',
        Accept: 'application/json',
      },
      body: form,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
    }
  }

  private async apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }
}

function collectImageAttachments(
  result: TestResult
): Array<{ filename: string; bytes: Buffer; contentType: string }> {
  const out: Array<{ filename: string; bytes: Buffer; contentType: string }> = [];

  for (const [idx, att] of result.attachments.entries()) {
    const isImage =
      (att.contentType || '').startsWith('image/') ||
      /screenshot|image/i.test(att.name || '');
    if (!isImage) continue;

    let bytes: Buffer | null = null;
    if (att.body) {
      bytes = Buffer.from(att.body);
    } else if (att.path && fs.existsSync(att.path)) {
      bytes = fs.readFileSync(att.path);
    }
    if (!bytes?.length) continue;

    const ext =
      (att.contentType || '').includes('jpeg') || (att.contentType || '').includes('jpg')
        ? 'jpg'
        : 'png';
    const base =
      sanitizeFilename(att.name || path.basename(att.path || `screenshot-${idx}`)) ||
      `screenshot-${idx}`;
    const filename = base.includes('.') ? base : `${base}.${ext}`;
    out.push({
      filename,
      bytes,
      contentType: att.contentType || (ext === 'jpg' ? 'image/jpeg' : 'image/png'),
    });
  }

  return out;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

function fingerprint(test: TestCase): string {
  const raw = `${relativePath(test.location.file)}::${test.titlePath().join('>')}`;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
}

function labelFor(fp: string): string {
  return `auto-pw-${fp}`;
}

function relativePath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^.*\/(tests\/)/, '$1');
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function toAdf(lines: string[]): AdfDoc {
  const content: unknown[] = [];
  for (const line of lines) {
    if (!line) {
      content.push({ type: 'paragraph', content: [] });
      continue;
    }
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    });
  }
  return { type: 'doc', version: 1, content };
}

export default JiraFailureReporter;
