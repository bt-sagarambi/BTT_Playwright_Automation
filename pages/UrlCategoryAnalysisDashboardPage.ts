import { Page, Frame, expect } from '@playwright/test';
import { UrlCategoryAnalysisDashboardLocators } from '../locators/UrlCategoryAnalysisDashboardLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

function biToolUrl(): string {
  return `${portalBase()}/index.php?r=business-intelligence/tool`;
}

const UCA_TITLE = /URL Category Analysis/i;
const UCA_SEARCH = 'URL Category Analysis';

export type UrlCatContext = {
  siteLabel: string;
  filterSignature: string;
  bodySignature: string;
};

/**
 * BI Dashboard — URL Category Analysis (Help: Core Web Vital URL Volume).
 * Shell: business-intelligence/tool → #bi-iframe.
 * Filter mutations restored; Save As clones cleaned up.
 * Never treat Site Ops / CWV Top 10 PoP / VitalPulse as home.
 */
export class UrlCategoryAnalysisDashboardPage {
  readonly locators: UrlCategoryAnalysisDashboardLocators;
  private frame: Frame | null = null;

  constructor(private readonly page: Page) {
    this.locators = new UrlCategoryAnalysisDashboardLocators(page);
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
    await this.openDashboardsList();
    await this.searchAndOpenDashboard();
    await this.waitForDashboardReady();
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
    if (!label) throw new Error(`site label empty (profile=${profile.siteName})`);
    expect(label).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s+'), 'i'));
  }

  async openDashboardsList(): Promise<void> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.dashboardsNav.isVisible().catch(() => false)) {
      await L.dashboardsNav.click({ force: true });
    } else {
      await fr
        .locator('a, button, span, div')
        .filter({ hasText: /^Dashboards$/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
    }
    await this.page.waitForTimeout(2500);
    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || fr;
  }

  async searchAndOpenDashboard(): Promise<void> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.searchInput.isVisible().catch(() => false)) {
      await L.searchInput.click({ force: true });
      await L.searchInput.fill('');
      await L.searchInput.fill(UCA_SEARCH);
      await this.page.waitForTimeout(3000);
    }

    const clicked = await fr.evaluate(() => {
      const want = /URL Category Analysis/i;
      const nodes = Array.from(
        document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"], div, span')
      );
      const scored: { el: Element; t: string; score: number }[] = [];
      for (const el of nodes) {
        const t = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!want.test(t)) continue;
        const score = t.length < 90 ? 3 : t.length < 180 ? 2 : 1;
        scored.push({ el, t, score });
      }
      scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);
      const hit = scored[0];
      if (!hit) return false;
      (hit.el as HTMLElement).scrollIntoView({ block: 'center' });
      (hit.el as HTMLElement).click();
      return true;
    });

    if (!clicked) {
      const card = fr.locator('a, h2, h3, h4, [role="heading"], button, div').filter({ hasText: UCA_TITLE }).first();
      await expect(card).toBeVisible({ timeout: 30000 });
      await card.click({ force: true });
    }
    await this.page.waitForTimeout(12000);
    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || (await this.bi());
    this.frame = await this.bestViewerFrame(this.frame);
  }

  async bestViewerFrame(fallback: Frame): Promise<Frame> {
    let best = fallback;
    let bestScore = -1;
    for (const f of this.page.frames()) {
      const sample = await f
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 6000))
        .catch(() => '');
      if (!UCA_TITLE.test(sample) && !/Performance Category|Good URL Count/i.test(sample)) continue;
      let score = 0;
      if (/Save As|Refresh Data|Reset to Defaults?/i.test(sample)) score += 5;
      if (/Bot Traffic|Traffic Segment|\bOrigin\b/i.test(sample)) score += 3;
      if (/URL Performance Category Distribution/i.test(sample)) score += 3;
      if (/CWV Performance by URL/i.test(sample)) score += 2;
      if (!/Create Dashboard/i.test(sample)) score += 2;
      if (/9 widgets/i.test(sample) && /Create Dashboard/i.test(sample)) score -= 3;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return best;
  }

  async waitForDashboardReady(): Promise<void> {
    await expect.poll(async () => this.getBodySample(3000), { timeout: 90000 }).toMatch(UCA_TITLE);
    await expect.poll(async () => this.widgetsReadyScore(), { timeout: 60000 }).toBeGreaterThanOrEqual(4);
    await this.page.waitForTimeout(1500);
  }

  async getBodySample(max = 5000): Promise<string> {
    const fr = await this.bi();
    const text = await fr.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
    return text.slice(0, max);
  }

  async widgetsReadyScore(): Promise<number> {
    const body = await this.getBodySample(10000);
    let score = 0;
    if (UCA_TITLE.test(body)) score += 2;
    if (/URL Performance Category Distribution/i.test(body)) score += 1;
    if (/Daily Distribution of URLs by Category/i.test(body)) score += 1;
    if (/CWV Performance by URL\s*-\s*Desktop/i.test(body)) score += 1;
    if (/CWV Performance by URL\s*-\s*Mobile/i.test(body)) score += 1;
    if (/Good URL Count|Needs Improvement URL Count|Poor URL Count/i.test(body)) score += 1;
    if (/Refresh Data|Save As|Reset to Defaults?/i.test(body)) score += 1;
    if (/Bot Traffic|\bOrigin\b|Traffic Segment/i.test(body)) score += 1;
    return score;
  }

  async expectUcaIdentity(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    const body = await this.getBodySample(3000);
    expect(body, 'URL Category Analysis title in BI iframe').toMatch(UCA_TITLE);
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(this.page).not.toHaveURL(/site\/dashboard(?!-)|real-user-monitoring\/performance-overview/i);
    const body = await this.getBodySample(2000);
    expect(body).toMatch(UCA_TITLE);
  }

  async getFilterSignature(): Promise<string> {
    const body = await this.getBodySample(6000);
    const parts: string[] = [];
    const bot = body.match(/Bot Traffic[^\n]{0,80}/i);
    const origin = body.match(/\bOrigin\b[^\n]{0,80}/i);
    const seg = body.match(/Traffic Segment[^\n]{0,80}/i);
    if (bot) parts.push(bot[0].replace(/\s+/g, ' ').trim().slice(0, 60));
    if (origin) parts.push(origin[0].replace(/\s+/g, ' ').trim().slice(0, 60));
    if (seg) parts.push(seg[0].replace(/\s+/g, ' ').trim().slice(0, 60));
    return parts.join(' | ') || body.slice(0, 120);
  }

  async captureContext(): Promise<UrlCatContext> {
    return {
      siteLabel: await this.getSiteLabel().catch(() => getActiveProfile().siteName),
      filterSignature: await this.getFilterSignature(),
      bodySignature: (await this.getBodySample(600)).slice(0, 400),
    };
  }

  async openFiltersPanel(): Promise<boolean> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.filtersBtn.isVisible().catch(() => false)) {
      await L.filtersBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      return true;
    }
    return false;
  }

  async softFilterCombo(label: RegExp, option?: RegExp): Promise<boolean> {
    const fr = await this.bi();
    await this.openFiltersPanel();
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
    const apply = fr.locator('button, a').filter({ hasText: /^Apply$/i }).first();
    if (await apply.isVisible().catch(() => false)) {
      await apply.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(2800);
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

  async softSaveAsClone(name: string): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /Save As|Save as/i }).first();
    if (!(await btn.count().catch(() => 0))) return false;
    await btn.click({ force: true });
    await this.page.waitForTimeout(1000);
    const input = fr.locator('input[type="text"], input:not([type])').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(name, { timeout: 8000 }).catch(() => undefined);
    } else {
      await fr.locator('input').last().fill(name).catch(() => undefined);
    }
    const confirm = fr.locator('button, a').filter({ hasText: /^Save$|^Create$|^OK$|Save As/i }).last();
    await confirm.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(4000);
    return true;
  }

  async softDeleteCloneBySearch(name: string): Promise<boolean> {
    await this.openDashboardsList();
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.searchInput.isVisible().catch(() => false)) {
      await L.searchInput.fill(name);
      await this.page.waitForTimeout(1500);
    }
    const card = fr
      .locator('a, h2, h3, h4, div')
      .filter({ hasText: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .first();
    if (!(await card.isVisible().catch(() => false))) return false;
    const menu = card
      .locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"tile") or self::div][1]//button')
      .last();
    await menu.click({ force: true }).catch(async () => {
      await fr
        .locator('button')
        .filter({ hasText: /⋮|More|Delete/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
    });
    await this.page.waitForTimeout(500);
    const del = fr.locator('button, a, [role="menuitem"]').filter({ hasText: /^Delete$/i }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click({ force: true });
      await this.page.waitForTimeout(500);
      await fr
        .locator('button')
        .filter({ hasText: /^Delete$|^Confirm$|^OK$/i })
        .last()
        .click({ force: true })
        .catch(() => undefined);
      await this.page.waitForTimeout(2000);
      return true;
    }
    return false;
  }

  /** First-row soft signature from a named table family. */
  async getTableRowSignature(tableHint: RegExp, maxRows = 5): Promise<string> {
    const fr = await this.bi();
    return fr.evaluate(
      ({ hintSource, n }) => {
        const hint = new RegExp(hintSource, 'i');
        const tables = Array.from(document.querySelectorAll('table')).filter((t) => t.getClientRects().length);
        for (const t of tables) {
          const headers = Array.from(t.querySelectorAll('th'))
            .map((th) => (th.innerText || '').replace(/\s+/g, ' ').trim())
            .join(' ');
          const nearby =
            ((t.closest('div')?.innerText || '') + ' ' + headers).replace(/\s+/g, ' ').slice(0, 400);
          if (!hint.test(headers) && !hint.test(nearby)) continue;
          const rows = Array.from(t.querySelectorAll('tbody tr')).slice(0, n);
          const cells = rows.map((r) => {
            const tds = Array.from(r.querySelectorAll('td'))
              .slice(0, 4)
              .map((td) => ((td.innerText || '') as string).replace(/\s+/g, ' ').trim().slice(0, 40));
            return tds.join('~');
          });
          return cells.filter(Boolean).join('|');
        }
        return '';
      },
      { hintSource: tableHint.source, n: maxRows }
    );
  }

  async softSortColumn(
    headerRe: RegExp,
    tableHint: RegExp
  ): Promise<{ clicked: boolean; before: string; after: string }> {
    const fr = await this.bi();
    const before = await this.getTableRowSignature(tableHint);
    // Prefer header inside a matching table when possible
    const headers = fr.locator('th, [role="columnheader"]').filter({ hasText: headerRe });
    const count = await headers.count().catch(() => 0);
    let clicked = false;
    for (let i = 0; i < Math.min(count, 6); i++) {
      const header = headers.nth(i);
      if (!(await header.isVisible().catch(() => false))) continue;
      await header.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
      await header.click({ force: true }).catch(() => undefined);
      clicked = true;
      break;
    }
    await this.page.waitForTimeout(1500);
    const after = await this.getTableRowSignature(tableHint);
    return { clicked, before, after };
  }

  async softToggleLegendSeries(
    seriesLabel: RegExp
  ): Promise<{ clicked: boolean; before: string; after: string }> {
    const fr = await this.bi();
    const before = (await this.getBodySample(1500)).slice(0, 300);
    const el = fr
      .locator('button, a, [role="button"], .highcharts-legend-item, span, text')
      .filter({ hasText: seriesLabel })
      .first();
    if (!(await el.isVisible().catch(() => false))) {
      return { clicked: false, before, after: before };
    }
    await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await el.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(900);
    const after = (await this.getBodySample(1500)).slice(0, 300);
    return { clicked: true, before, after };
  }

  async softOpenExportMenu(scope: 'widget' | 'dashboard' = 'dashboard'): Promise<{ opened: boolean; options: string[] }> {
    const fr = await this.bi();
    if (scope === 'widget') {
      const exportBtn = fr.locator('[title="Export chart"], button[title*="Export" i]').first();
      if (await exportBtn.isVisible().catch(() => false)) {
        await exportBtn.scrollIntoViewIfNeeded().catch(() => undefined);
        await exportBtn.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(800);
      }
    } else {
      await fr.evaluate(() => {
        const rects = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const topRight = rects
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 8 && r.height > 8 && r.top < 140 && r.right > window.innerWidth - 320;
          })
          .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
        for (const el of topRight.slice(0, 10)) {
          const t = ((el as HTMLElement).getAttribute('title') || '') + (el.getAttribute('aria-label') || '');
          if (/export|download|menu|hamburger|more/i.test(t) || !t) {
            (el as HTMLElement).click();
            break;
          }
        }
      });
      await this.page.waitForTimeout(800);
      if (!/PNG Image|PDF Document|PowerPoint|CSV Data/i.test(await this.getBodySample(3000))) {
        const exportBtn = fr.locator('[title="Export chart"], button[title*="Export" i]').first();
        if (await exportBtn.isVisible().catch(() => false)) {
          await exportBtn.click({ force: true }).catch(() => undefined);
          await this.page.waitForTimeout(800);
        }
      }
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

  async softOpenSiblingThenRestore(sibling: RegExp): Promise<string> {
    await this.openDashboardsList();
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
    await this.searchAndOpenDashboard();
    await this.waitForDashboardReady();
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
        await this.openDashboardsList();
        await this.searchAndOpenDashboard();
        await this.waitForDashboardReady().catch(() => undefined);
        await this.ensureProfileSiteSelected();
      })(),
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('recoverPage soft timeout')), 120000)),
    ]).catch(async (err) => {
      console.log(`[URL-CAT] recover: ${err instanceof Error ? err.message : String(err)}`);
      await this.openViaNavigation().catch(() => undefined);
    });
  }

  async restoreContext(ctx: UrlCatContext): Promise<void> {
    await this.clickResetToDefault().catch(() => undefined);
    await this.ensureProfileSiteSelected();
    void ctx;
  }

  async closeOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
  }

  async widgetPresence(): Promise<{
    distribution: boolean;
    dailyTable: boolean;
    desktop: boolean;
    mobile: boolean;
    good: boolean;
    needsImprovement: boolean;
    poor: boolean;
  }> {
    const fr = await this.bi();
    // Prefer headings — Desktop URL tables can dominate body text (~1000 rows) and hide Mobile below fold.
    const headingText = await fr
      .evaluate(() =>
        Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
          .map((el) => ((el as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim())
          .join(' | ')
      )
      .catch(() => '');
    const body = await this.getBodySample(14000);
    const sample = `${headingText} ${body}`;
    return {
      distribution: /URL Performance Category Distribution/i.test(sample),
      dailyTable: /Daily Distribution of URLs by Category/i.test(sample),
      desktop: /CWV Performance by URL\s*-\s*Desktop/i.test(sample),
      mobile: /CWV Performance by URL\s*-\s*Mobile/i.test(sample),
      good: /Good URL Count|\bGood\b/i.test(sample),
      needsImprovement: /Needs Improvement/i.test(sample),
      poor: /Poor URL Count|\bPoor\b/i.test(sample),
    };
  }
}
