import { Page, Frame, expect } from '@playwright/test';
import { CwvTop10SummaryOnloadChartLocators } from '../locators/CwvTop10SummaryOnloadChartLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

function biToolUrl(): string {
  return `${portalBase()}/index.php?r=business-intelligence/tool`;
}

const CHART_TITLE = /CWV Top 10 Summary Onload/i;
/** Exact Onload chart — must not match plain "CWV Top 10 Summary". */
const CHART_TITLE_EXACT = /^\s*CWV Top 10 Summary Onload\s*$/i;
const CHART_SEARCH = 'CWV Top 10 Summary Onload';
const PLAIN_SUMMARY = /CWV Top 10 Summary(?!\s+Onload)/i;

export type CwvSoContext = {
  siteLabel: string;
  lookbackSignature: string;
  comparisonSignature: string;
  bodySignature: string;
};

/**
 * BI Chart — CWV Top 10 Summary Onload.
 * Shell: business-intelligence/tool → #bi-iframe → Charts Search → chart viewer.
 * Mutations (Lookback / Comparison / filters) must be restored; Chart Builder soft only.
 */
export class CwvTop10SummaryOnloadChartPage {
  readonly locators: CwvTop10SummaryOnloadChartLocators;
  private frame: Frame | null = null;

  constructor(private readonly page: Page) {
    this.locators = new CwvTop10SummaryOnloadChartLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    const nav = new LeftNavPage(this.page);
    await nav.openMenu().catch(() => undefined);
    await nav.expandCommonSections().catch(() => undefined);
    if (!/business-intelligence\/tool|business-intelligence%2Ftool/i.test(this.page.url())) {
      await this.page.goto(biToolUrl(), { waitUntil: 'domcontentloaded', timeout: 90000 });
    }
    await this.waitForPortalReady();
    await this.waitForBiFrame();
    await this.openChartsList();
    await this.searchAndOpenChart();
    await this.waitForChartReady();
  }

  async waitForPortalReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => ((await this.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await this.dismissCoaches();
  }

  async dismissCoaches(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .get-started');
      if (!(await open.first().isVisible().catch(() => false))) break;
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page
        .locator('button')
        .filter({ hasText: /ok|close|got it|don't show|dismiss|continue|agree/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
      await this.page.waitForTimeout(300);
    }
  }

  async waitForBiFrame(timeoutMs = 90000): Promise<Frame> {
    await this.locators.biIframe.waitFor({ state: 'attached', timeout: timeoutMs });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const handle = await this.page.$('#bi-iframe');
      const fr = handle ? await handle.contentFrame() : null;
      if (fr) {
        const ready = await fr
          .evaluate(() => !!(document.body && (document.body.innerText || '').length > 40))
          .catch(() => false);
        if (ready) {
          this.frame = fr;
          return fr;
        }
      }
      await this.page.waitForTimeout(1000);
    }
    throw new Error('#bi-iframe contentFrame not ready');
  }

  async bi(): Promise<Frame> {
    if (this.frame && !this.frame.isDetached()) {
      const refreshed = await this.bestViewerFrame(this.frame).catch(() => this.frame!);
      this.frame = refreshed;
      return refreshed;
    }
    const fr = await this.waitForBiFrame(45000);
    this.frame = await this.bestViewerFrame(fr);
    return this.frame;
  }

  async ensureProfileSiteSelected(): Promise<void> {
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
  }

  async getSiteLabel(): Promise<string> {
    const quick = this.page.locator('#select2-quick-site-id-container');
    if (await quick.isVisible().catch(() => false)) {
      return ((await quick.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    }
    return ((await this.locators.siteSelectContainer.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async expectSelectedSite(): Promise<void> {
    const profile = getActiveProfile();
    const label = await this.getSiteLabel();
    if (!label) {
      throw new Error(`site label empty (profile=${profile.siteName})`);
    }
    expect(label).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s+'), 'i'));
  }

  async openChartsList(): Promise<void> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.chartsNav.isVisible().catch(() => false)) {
      await L.chartsNav.click({ force: true });
    } else {
      await fr
        .locator('a, button, span, div')
        .filter({ hasText: /^Charts$/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
    }
    await this.page.waitForTimeout(2500);
    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || fr;
  }

  async searchAndOpenChart(): Promise<void> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.searchInput.isVisible().catch(() => false)) {
      await L.searchInput.click({ force: true });
      await L.searchInput.fill('');
      await L.searchInput.fill(CHART_SEARCH);
      await this.page.waitForTimeout(3000);
    }

    const titleCandidates = [
      fr.getByRole('link', { name: CHART_TITLE }),
      fr.getByRole('heading', { name: CHART_TITLE }),
      fr.locator('a, h2, h3, h4, [role="heading"]').filter({ hasText: CHART_TITLE_EXACT }),
      fr.locator('a, h2, h3, h4, [role="heading"]').filter({ hasText: CHART_TITLE }),
    ];
    let opened = false;
    for (const loc of titleCandidates) {
      const el = loc.first();
      if (!(await el.isVisible({ timeout: 2500 }).catch(() => false))) continue;
      const text = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      // Guard: do not open plain "CWV Top 10 Summary"
      if (PLAIN_SUMMARY.test(text) && !/Onload/i.test(text)) continue;
      await el.scrollIntoViewIfNeeded().catch(() => undefined);
      await el.click({ force: true });
      await this.page.waitForTimeout(8000);
      opened = true;
      break;
    }

    if (!opened) {
      const clicked = await fr.evaluate(() => {
        const want = /^\s*CWV Top 10 Summary Onload\s*$/i;
        const soft = /CWV Top 10 Summary Onload/i;
        const nodes = Array.from(
          document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"]')
        ) as HTMLElement[];
        const scored = nodes
          .map((el) => {
            const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!soft.test(t)) return null;
            if (/CWV Top 10 Summary(?!\s+Onload)/i.test(t) && !/Onload/i.test(t)) return null;
            const score = want.test(t) ? 5 : t.length < 60 ? 3 : 1;
            return { el, t, score };
          })
          .filter(Boolean) as { el: HTMLElement; t: string; score: number }[];
        scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);
        const hit = scored[0];
        if (!hit) return false;
        hit.el.scrollIntoView({ block: 'center' });
        hit.el.click();
        return true;
      });
      if (!clicked) {
        const card = fr
          .locator('a, h2, h3, h4, [role="heading"], button')
          .filter({ hasText: CHART_TITLE_EXACT })
          .first();
        await expect(card).toBeVisible({ timeout: 30000 });
        await card.click({ force: true });
      }
      await this.page.waitForTimeout(10000);
    }

    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || (await this.bi());
    this.frame = await this.bestViewerFrame(this.frame);

    // Soft dblclick retry if still on catalog
    if (!(await this.isInChartViewer())) {
      const el = fr.locator('a, h2, h3, h4').filter({ hasText: CHART_TITLE_EXACT }).first();
      if (await el.isVisible().catch(() => false)) {
        await el.dblclick({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(8000);
        this.frame = await this.bestViewerFrame(
          (await (await this.page.$('#bi-iframe'))?.contentFrame()) || this.frame!
        );
      }
    }
  }

  async isInChartViewer(): Promise<boolean> {
    const sample = await this.getBodySample(2500);
    return (
      CHART_TITLE.test(sample) &&
      (/\bBack\b/i.test(sample) || /Refresh Data|Export|Lookback Period|Filters|PNG Image/i.test(sample)) &&
      !/Chart Builder\s+5\s*\/\s*Page/i.test(sample)
    );
  }

  async bestViewerFrame(fallback: Frame): Promise<Frame> {
    let best = fallback;
    let bestScore = -1;
    for (const f of this.page.frames()) {
      const sample = await f
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 5000))
        .catch(() => '');
      if (!CHART_TITLE.test(sample)) continue;
      let score = 0;
      if (/Refresh Data|Export|Filters|Lookback Period|Percentile/i.test(sample)) score += 5;
      if (/Reset to default/i.test(sample)) score += 2;
      if (/Page Name/i.test(sample) && /Onload/i.test(sample) && /Page Hits/i.test(sample)) score += 3;
      if (/Chart Builder/i.test(sample) && /Search/i.test(sample) && !/Refresh Data/i.test(sample)) score -= 3;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return best;
  }

  async waitForChartReady(): Promise<void> {
    await expect
      .poll(async () => this.getBodySample(3000), { timeout: 90000 })
      .toMatch(CHART_TITLE);
    await expect
      .poll(async () => this.chartReadyScore(), { timeout: 60000 })
      .toBeGreaterThanOrEqual(3);
    await this.page.waitForTimeout(1500);
  }

  async getBodySample(max = 5000): Promise<string> {
    const fr = await this.bi();
    const text = await fr.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
    return text.slice(0, max);
  }

  async chartReadyScore(): Promise<number> {
    const body = await this.getBodySample(8000);
    let score = 0;
    if (CHART_TITLE.test(body)) score += 2;
    if (/Refresh Data/i.test(body)) score += 1;
    if (/Export/i.test(body)) score += 1;
    if (/Lookback Period/i.test(body)) score += 1;
    if (/Comparison/i.test(body)) score += 1;
    if (/Page Name/i.test(body) && /Onload/i.test(body)) score += 1;
    if (/Page Hits/i.test(body)) score += 1;
    if (/Current|Previous|Change/i.test(body)) score += 1;
    if (/Percentile|Device|Browser/i.test(body)) score += 1;
    if (/\bBack\b/i.test(body)) score += 1;
    return score;
  }

  async expectChartIdentity(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    const body = await this.getBodySample(3500);
    expect(body, 'CWV Top 10 Summary Onload title in BI iframe').toMatch(CHART_TITLE);
    // Must include Onload — not plain Summary alone as home
    expect(body).toMatch(/Summary Onload/i);
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(this.page).not.toHaveURL(/site\/dashboard(?!-)|real-user-monitoring\/performance-overview|vital-pulse|core-web-vitals/i);
    const body = await this.getBodySample(2500);
    expect(body).toMatch(CHART_TITLE);
    expect(body).toMatch(/Summary Onload/i);
  }

  async getLookbackSignature(): Promise<string> {
    const body = await this.getBodySample(4000);
    const m =
      body.match(/Lookback Period[:\s]*([^\n|]{0,80})/i) ||
      body.match(/Last\s+\d+\s+Days?/i) ||
      body.match(/Last\s+\d+\s+(?:Weeks|Months)/i);
    return (m?.[0] || body.slice(0, 120)).replace(/\s+/g, ' ').trim();
  }

  async getComparisonSignature(): Promise<string> {
    const body = await this.getBodySample(4000);
    const m =
      body.match(/Comparison[:\s]*([^\n|]{0,100})/i) ||
      body.match(/Directly Previous Period|Same Time Last Year/i);
    return (m?.[0] || '').replace(/\s+/g, ' ').trim();
  }

  async captureContext(): Promise<CwvSoContext> {
    return {
      siteLabel: await this.getSiteLabel().catch(() => getActiveProfile().siteName),
      lookbackSignature: await this.getLookbackSignature(),
      comparisonSignature: await this.getComparisonSignature(),
      bodySignature: (await this.getBodySample(600)).slice(0, 400),
    };
  }

  async openLookbackPeriod(): Promise<boolean> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.filtersBtn.isVisible().catch(() => false)) {
      await L.filtersBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
    }
    const host = fr.locator('label, button, div, span, [role="button"]').filter({ hasText: /Lookback Period/i }).first();
    if (!(await host.count().catch(() => 0))) return false;
    await host.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await host.click({ force: true, timeout: 8000 }).catch(async () => {
      await host.evaluate((el: HTMLElement) => el.click()).catch(() => undefined);
    });
    await this.page.waitForTimeout(800);
    return true;
  }

  /** Soft toggle Day↔Week or alternate lookback preset. */
  async adjustLookbackSoft(): Promise<boolean> {
    const fr = await this.bi();
    await this.openLookbackPeriod();

    const chip = fr
      .locator('button, [role="button"], div, span, a')
      .filter({ hasText: /Last\s+\d+\s+Days?|Lookback Period/i })
      .first();
    if (await chip.isVisible().catch(() => false)) {
      await chip.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    }

    const options = fr.locator('[role="option"], li, button, a, label, div').filter({
      hasText: /Last\s+\d+\s+Days?|Last\s+\d+\s+Weeks?|Last\s+\d+\s+Months?/i,
    });
    const count = await options.count().catch(() => 0);
    if (count > 1) {
      await options.nth(Math.min(count - 1, 1)).click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      return true;
    }

    const body = await this.getBodySample(2000);
    const preferWeek = /Day/i.test(body) && !/\bWeek\b.*selected/i.test(body);
    const gran = fr
      .locator('button, [role="option"], label')
      .filter({ hasText: preferWeek ? /^Week$/i : /^Day$/i })
      .first();
    if (await gran.isVisible().catch(() => false)) {
      await gran.click({ force: true });
      await this.page.waitForTimeout(600);
      return true;
    }
    return false;
  }

  async softToggleComparison(): Promise<boolean> {
    const fr = await this.bi();
    const body = await this.getBodySample(3000);
    // Prefer flipping to Same Time Last Year when Directly Previous is the live default
    const target = /Same Time Last Year/i.test(body) ? /Same Time Last Year/i : /Directly Previous Period/i;

    const btn = fr.locator('button, [role="button"], label, a, div, span').filter({ hasText: target }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(2500);
      return true;
    }
    const host = fr.locator('label, button, div, span').filter({ hasText: /^Comparison/i }).first();
    if (await host.isVisible().catch(() => false)) {
      await host.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(500);
    }
    const opt = fr
      .locator('button, [role="option"], label, a')
      .filter({ hasText: /Same Time Last Year|Directly Previous/i })
      .first();
    if (!(await opt.isVisible().catch(() => false))) return false;
    await opt.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(2500);
    return true;
  }

  async clickApply(): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /^Apply$/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true, timeout: 8000 }).catch(() => undefined);
      await this.page.waitForTimeout(3500);
      return true;
    }
    await this.page.waitForTimeout(2500);
    return false;
  }

  async softFilterCombo(label: RegExp, option?: RegExp): Promise<boolean> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.filtersBtn.isVisible().catch(() => false)) {
      await L.filtersBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    }
    const host = fr.locator('label, button, div, span').filter({ hasText: label }).first();
    if (!(await host.count().catch(() => 0))) return false;
    await host.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await host.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    if (option) {
      const opt = fr.locator('[role="option"], li, button, a, label, div').filter({ hasText: option }).first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
      }
    }
    await this.clickApply();
    return true;
  }

  async clickRefreshData(): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /Refresh Data|^Refresh$/i }).first();
    if (!(await btn.count().catch(() => 0))) return false;
    await btn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(4000);
    return true;
  }

  async clickResetToDefault(): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /Reset to Defaults?|Reset to defaults?/i }).first();
    if (!(await btn.count().catch(() => 0))) return false;
    await btn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(3500);
    return true;
  }

  async getTableRowSignature(maxRows = 8): Promise<string> {
    const fr = await this.bi();
    return fr.evaluate((n) => {
      const tables = Array.from(document.querySelectorAll('table')).filter((t) => t.getClientRects().length);
      for (const t of tables) {
        const headers = Array.from(t.querySelectorAll('th')).map((th) => (th.innerText || '').replace(/\s+/g, ' ').trim());
        if (!headers.some((h) => /Page Name/i.test(h))) continue;
        const rows = Array.from(t.querySelectorAll('tbody tr')).slice(0, n);
        const names = rows.map((r) => {
          const cell = r.querySelector('td');
          return ((cell && cell.innerText) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        });
        return names.filter(Boolean).join('|');
      }
      // Formatted table may use div/grid cells
      const body = (document.body?.innerText || '').replace(/\s+/g, ' ');
      const m = body.match(/Page Name[\s\S]{0,400}/i);
      return (m?.[0] || '').slice(0, 200);
    }, maxRows);
  }

  async listSortableHeaders(): Promise<string[]> {
    const fr = await this.bi();
    return fr.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).filter((t) => t.getClientRects().length);
      for (const t of tables) {
        const headers = Array.from(t.querySelectorAll('th'))
          .map((th) => (th.innerText || '').replace(/\s+/g, ' ').trim())
          .filter((h) => h && h.length < 40);
        if (headers.some((h) => /Page Name/i.test(h))) {
          return [...new Set(headers)];
        }
      }
      return [];
    });
  }

  async softSortColumn(headerRe: RegExp): Promise<{ clicked: boolean; before: string; after: string; header: string }> {
    const fr = await this.bi();
    const before = await this.getTableRowSignature();
    const header = fr.locator('th, [role="columnheader"]').filter({ hasText: headerRe }).first();
    const label = ((await header.innerText().catch(() => '')) || headerRe.source).replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!(await header.isVisible().catch(() => false))) {
      return { clicked: false, before, after: before, header: label };
    }
    await header.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await header.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(1500);
    const after = await this.getTableRowSignature();
    return { clicked: true, before, after, header: label };
  }

  async softOpenExportMenu(): Promise<{ opened: boolean; options: string[] }> {
    const fr = await this.bi();
    const exportBtn = fr
      .locator('button, a, [role="button"]')
      .filter({ hasText: /^Export/i })
      .or(fr.locator('[title="Export chart"], button[title*="Export" i]'))
      .first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
    } else {
      await fr.evaluate(() => {
        const rects = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const topRight = rects
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 8 && r.height > 8 && r.top < 140 && r.right > window.innerWidth - 320;
          })
          .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
        if (topRight[0]) (topRight[0] as HTMLElement).click();
      });
      await this.page.waitForTimeout(800);
    }
    const body = await this.getBodySample(4000);
    const options: string[] = [];
    if (/PNG Image/i.test(body)) options.push('PNG Image');
    if (/PDF Document/i.test(body)) options.push('PDF Document');
    if (/PowerPoint|\bPPT\b/i.test(body)) options.push('PowerPoint');
    if (/CSV Data/i.test(body)) options.push('CSV Data');
    return { opened: options.length > 0, options };
  }

  async softExportOption(label: RegExp): Promise<{ triggered: boolean; downloadHint: string }> {
    const fr = await this.bi();
    await this.softOpenExportMenu();
    const opt = fr.locator('button, a, [role="menuitem"], div').filter({ hasText: label }).first();
    if (!(await opt.isVisible().catch(() => false))) {
      return { triggered: false, downloadHint: '' };
    }
    let downloadHint = '';
    try {
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 12000 }).catch(() => null),
        opt.click({ force: true }),
      ]);
      if (download) {
        downloadHint = download.suggestedFilename() || 'download';
        await download.cancel().catch(() => undefined);
      }
    } catch {
      await opt.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(1500);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return { triggered: true, downloadHint };
  }

  /** Chart Builder prerequisite — soft exploratory; always restore Charts → Onload after. */
  async softExerciseChartBuilder(): Promise<{
    opened: boolean;
    tablesSampled: string[];
    runQueryEnabled: boolean | null;
    notes: string[];
  }> {
    const notes: string[] = [];
    const tablesSampled: string[] = [];
    await this.openChartsList();
    const fr0 = await this.bi();
    const L = this.locators.inFrame(fr0);
    let opened = false;
    if (await L.chartBuilderBtn.isVisible().catch(() => false)) {
      await L.chartBuilderBtn.click({ force: true });
      opened = true;
    } else {
      opened = !!(await fr0
        .locator('button, a, [role="button"]')
        .filter({ hasText: /Chart Builder/i })
        .first()
        .click({ force: true })
        .then(() => true)
        .catch(() => false));
    }
    await this.page.waitForTimeout(5000);
    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || fr0;
    const fr = await this.bi();

    const body = await this.getBodySample(5000);
    if (!/Run Query|Select table|Chart Type|Single period/i.test(body)) {
      notes.push('Chart Builder chrome soft-miss after open');
    }

    // Soft-assert modes
    for (const mode of [/Single period/i, /Compare periods \(trend\)/i, /Compare periods \(totals\)/i]) {
      if (!mode.test(body)) notes.push(`builder mode soft-miss: ${mode}`);
    }

    // Select table samples
    const selectTable = fr.locator('button, a, [role="button"]').filter({ hasText: /Select table/i }).first();
    if (await selectTable.isVisible().catch(() => false)) {
      await selectTable.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
    }

    for (const label of [/Sessions Page/i, /^Sessions$/i, /RUM Hits/i]) {
      const el = fr.locator('button, a, [role="option"], li, div, span').filter({ hasText: label }).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const t = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        await el.click({ force: true }).catch(() => undefined);
        tablesSampled.push(t);
        await this.page.waitForTimeout(1200);
        if (tablesSampled.length >= 2) break;
      }
    }
    if (!tablesSampled.length) notes.push('no Sessions/Sessions Page/RUM Hits tables visible — annotate entitlement');

    // Soft place axes — click Dimension/Metric chips if present
    for (const zone of [/X-AXIS|X Axis/i, /Y-AXIS|Y Axis/i]) {
      const z = fr.locator('div, section, label, h3, h4').filter({ hasText: zone }).first();
      if (await z.isVisible().catch(() => false)) {
        await z.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
      }
    }
    const dim = fr.locator('button, div, span, li').filter({ hasText: /Dimension/i }).first();
    const met = fr.locator('button, div, span, li').filter({ hasText: /Metric/i }).first();
    if (await dim.isVisible().catch(() => false)) {
      await dim.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    if (await met.isVisible().catch(() => false)) {
      await met.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }

    // Chart types
    for (const type of [/^Bar$/i, /^Line$/i, /Formatted Table/i]) {
      const t = fr.locator('button, a, [role="button"], [role="tab"]').filter({ hasText: type }).first();
      if (await t.isVisible({ timeout: 1500 }).catch(() => false)) {
        await t.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(600);
      }
    }

    // Options / Order By / Top N soft
    for (const label of [/^Options$/i, /^Order By$/i, /^Top N$/i, /Horizontal Grid Lines/i, /Show Legend/i]) {
      const el = fr.locator('button, a, [role="button"], label, summary').filter({ hasText: label }).first();
      if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
        await el.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
      }
    }

    const topN = fr.locator('input[placeholder*="1000" i], input[type="number"]').first();
    if (await topN.isVisible().catch(() => false)) {
      await topN.fill('10').catch(() => undefined);
      await this.page.waitForTimeout(300);
    }

    // Color palette soft restore Default
    const ocean = fr.locator('button, a, [role="button"]').filter({ hasText: /^Ocean$/i }).first();
    if (await ocean.isVisible().catch(() => false)) {
      await ocean.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(300);
      await fr.locator('button, a').filter({ hasText: /^Default$/i }).first().click({ force: true }).catch(() => undefined);
    }

    const runBtn = fr.locator('button, a').filter({ hasText: /Run Query/i }).first();
    let runQueryEnabled: boolean | null = null;
    if (await runBtn.count().catch(() => 0)) {
      runQueryEnabled = await runBtn.isEnabled().catch(() => null);
      if (runQueryEnabled) {
        await runBtn.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(3500);
        const after = await this.getBodySample(2000);
        if (/No data to display/i.test(after)) notes.push('Run Query: empty configure state (expected soft)');
        else notes.push('Run Query: data area soft-settled');
      } else {
        notes.push('Run Query disabled until axes configured — expected soft');
      }
    } else {
      notes.push('Run Query control soft-miss');
    }

    // Soft builder filter / lookback
    const lookback = fr.locator('button, a').filter({ hasText: /Last\s+\d+\s+Days?/i }).first();
    if (await lookback.isVisible().catch(() => false)) {
      await lookback.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    // Do not Save — Back / Charts
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const back = fr.locator('button, a').filter({ hasText: /^Back$/i }).first();
    if (await back.isVisible().catch(() => false)) {
      await back.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(2000);
    }
    await this.openChartsList();
    // clear sticky search
    const L2 = this.locators.inFrame(await this.bi());
    if (await L2.searchInput.isVisible().catch(() => false)) {
      await L2.searchInput.fill('').catch(() => undefined);
    }
    await this.searchAndOpenChart();
    await this.waitForChartReady().catch(() => undefined);

    return { opened, tablesSampled, runQueryEnabled, notes };
  }

  async softOpenSiblingThenRestore(sibling: RegExp): Promise<string> {
    await this.openChartsList();
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.searchInput.isVisible().catch(() => false)) {
      await L.searchInput.fill('');
      await this.page.waitForTimeout(500);
    }
    const card = fr.locator('a, h2, h3, h4').filter({ hasText: sibling }).first();
    let mid = '';
    if (await card.isVisible().catch(() => false)) {
      mid = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    }
    await this.searchAndOpenChart();
    await this.waitForChartReady();
    return mid;
  }

  async recoverPage(): Promise<void> {
    await this.dismissCoaches();
    await this.page.evaluate(() => window.stop()).catch(() => undefined);
    await Promise.race([
      (async () => {
        await this.page.goto(biToolUrl(), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
        await this.waitForPortalReady().catch(() => undefined);
        await this.waitForBiFrame(60000);
        await this.openChartsList();
        await this.searchAndOpenChart();
        await this.waitForChartReady().catch(() => undefined);
        await this.ensureProfileSiteSelected();
      })(),
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('recoverPage soft timeout')), 120000)),
    ]).catch(async (err) => {
      console.log(`[CWV-SO] recover: ${err instanceof Error ? err.message : String(err)}`);
      await this.openViaNavigation().catch(() => undefined);
    });
  }

  async restoreContext(ctx: CwvSoContext): Promise<void> {
    await this.clickResetToDefault().catch(() => undefined);
    await this.ensureProfileSiteSelected();
    void ctx;
  }

  async closeOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const fr = await this.bi().catch(() => null);
    if (fr) await fr.page().keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
  }

  tableInventoryPresence(): Promise<{
    pageName: boolean;
    onload: boolean;
    pageHits: boolean;
    current: boolean;
    previous: boolean;
    change: boolean;
    dataTable: boolean;
  }> {
    return this.getBodySample(8000).then((body) => ({
      pageName: /Page Name/i.test(body),
      onload: /\bOnload\b/i.test(body),
      pageHits: /Page Hits/i.test(body),
      current: /\bCurrent\b/i.test(body),
      previous: /\bPrevious\b/i.test(body),
      change: /\bChange\b/i.test(body),
      dataTable: /Data Table/i.test(body),
    }));
  }

  filterInventoryPresence(): Promise<Record<string, boolean>> {
    return this.getBodySample(8000).then((body) => ({
      lookback: /Lookback Period/i.test(body),
      comparison: /Comparison/i.test(body),
      percentile: /Percentile/i.test(body),
      browser: /\bBrowser\b/i.test(body),
      bot: /Bot Traffic/i.test(body),
      device: /\bDevice\b/i.test(body),
      os: /Operating System/i.test(body),
      origin: /Originated From/i.test(body),
      pageName: /Page Name/i.test(body),
      returnNew: /Return\/New|Returning|New Visitor/i.test(body),
      trafficSegment: /Traffic Segment/i.test(body),
      pageGroup: /Page Group/i.test(body),
      timezone: /Time Zone|Timezone/i.test(body),
    }));
  }
}
