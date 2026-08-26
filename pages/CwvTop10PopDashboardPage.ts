import { Page, Frame, expect, Locator } from '@playwright/test';
import { CwvTop10PopDashboardLocators } from '../locators/CwvTop10PopDashboardLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const BI_TOOL_URL =
  'https://portal.bluetriangle.com/btportal/web/index.php?r=business-intelligence/tool';
const POP_TITLE = /CWV Top 10 Period over Period \(PoP\)/i;
const POP_SEARCH = 'CWV Top 10 Period over Period';

export type CwvPopContext = {
  siteLabel: string;
  lookbackSignature: string;
  bodySignature: string;
};

/**
 * BI Dashboard — CWV Top 10 Period over Period (PoP).
 * Shell: business-intelligence/tool → #bi-iframe.
 * Mutations (Lookback / filters) must be restored; Save As clones cleaned up.
 */
export class CwvTop10PopDashboardPage {
  readonly locators: CwvTop10PopDashboardLocators;
  private frame: Frame | null = null;

  constructor(private readonly page: Page) {
    this.locators = new CwvTop10PopDashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    const nav = new LeftNavPage(this.page);
    await nav.openMenu().catch(() => undefined);
    await nav.expandCommonSections().catch(() => undefined);
    if (!/business-intelligence\/tool|business-intelligence%2Ftool/i.test(this.page.url())) {
      await this.page.goto(BI_TOOL_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    }
    await this.waitForPortalReady();
    await this.waitForBiFrame();
    await this.openDashboardsList();
    await this.searchAndOpenPop();
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
      // Prefer viewer frame when PoP is open
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
      // Select2 may be soft-hidden on BI shell — annotate via throw message for soft catch
      throw new Error(`site label empty (profile=${profile.siteName})`);
    }
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

  async searchAndOpenPop(): Promise<void> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    if (await L.searchInput.isVisible().catch(() => false)) {
      await L.searchInput.click({ force: true });
      await L.searchInput.fill('');
      await L.searchInput.fill(POP_SEARCH);
      await this.page.waitForTimeout(3000);
    }

    const clicked = await fr.evaluate(() => {
      const want = /CWV Top 10 Period over Period \(PoP\)/i;
      const skip = /Native App/i;
      const nodes = Array.from(
        document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"], div, span')
      ) as HTMLElement[];
      const scored = nodes
        .map((el) => {
          const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!want.test(t) || skip.test(t)) return null;
          const score = t.length < 80 ? 3 : t.length < 160 ? 2 : 1;
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
        .locator('a, h2, h3, h4, [role="heading"], button, div')
        .filter({ hasText: POP_TITLE })
        .filter({ hasNotText: /Native App/i })
        .first();
      await expect(card).toBeVisible({ timeout: 30000 });
      await card.click({ force: true });
    }
    await this.page.waitForTimeout(10000);
    this.frame = (await (await this.page.$('#bi-iframe'))?.contentFrame()) || (await this.bi());
    // Prefer nested/viewer frame when available
    this.frame = await this.bestViewerFrame(this.frame);
  }

  async bestViewerFrame(fallback: Frame): Promise<Frame> {
    let best = fallback;
    let bestScore = -1;
    for (const f of this.page.frames()) {
      const sample = await f
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 4000))
        .catch(() => '');
      if (!POP_TITLE.test(sample)) continue;
      let score = 0;
      if (/Save As|Refresh Data|Reset to Default/i.test(sample)) score += 5;
      if (/Lookback Period/i.test(sample)) score += 3;
      if (/\bLCP\b/i.test(sample) && /\bINP\b/i.test(sample)) score += 2;
      if (!/Create Dashboard/i.test(sample)) score += 2;
      if (/13 widgets/i.test(sample) && /Create Dashboard/i.test(sample)) score -= 3;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return best;
  }

  async waitForDashboardReady(): Promise<void> {
    const fr = await this.bi();
    await expect
      .poll(async () => this.getBodySample(2500), { timeout: 90000 })
      .toMatch(POP_TITLE);
    // Soft settle — charts/tables may load gradually
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 60000 })
      .toBeGreaterThanOrEqual(2);
    await this.page.waitForTimeout(1500);
  }

  async getBodySample(max = 5000): Promise<string> {
    const fr = await this.bi();
    const text = await fr.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
    return text.slice(0, max);
  }

  async widgetsReadyScore(): Promise<number> {
    const body = await this.getBodySample(8000);
    let score = 0;
    if (POP_TITLE.test(body)) score += 2;
    if (/Page Load|Onload|page load/i.test(body)) score += 1;
    if (/\bLCP\b|Largest Contentful Paint/i.test(body)) score += 1;
    if (/\bINP\b|Interaction to Next Paint/i.test(body)) score += 1;
    if (/\bCLS\b|Cumulative Layout Shift/i.test(body)) score += 1;
    if (/Page Views?/i.test(body)) score += 1;
    if (/Lookback Period/i.test(body)) score += 1;
    if (/Needs improvement|Improvement >|Degradation >|Delta Definitions/i.test(body)) score += 1;
    if (/Good|Poor/i.test(body)) score += 1;
    if (/Refresh Data|Save As|Reset to Defaults?/i.test(body)) score += 1;
    return score;
  }

  async expectPopIdentity(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    const body = await this.getBodySample(3000);
    expect(body, 'PoP dashboard title in BI iframe').toMatch(POP_TITLE);
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(this.page).not.toHaveURL(/site\/dashboard(?!-)|real-user-monitoring\/performance-overview/i);
    const body = await this.getBodySample(2000);
    expect(body).toMatch(POP_TITLE);
    // Soft: must not be only Native App PoP title without CWV Top 10
    expect(body).toMatch(/CWV Top 10/i);
  }

  async getLookbackSignature(): Promise<string> {
    const body = await this.getBodySample(4000);
    const m =
      body.match(/Lookback Period[:\s]*([^\n|]{0,80})/i) ||
      body.match(/Last\s+\d+\s+Complete\s+Months?/i) ||
      body.match(/Last\s+\d+\s+(?:Days|Months|Weeks)/i) ||
      body.match(/(\d+\s*months?|\d+\s*month)/i);
    return (m?.[0] || body.slice(0, 120)).replace(/\s+/g, ' ').trim();
  }

  async captureContext(): Promise<CwvPopContext> {
    return {
      siteLabel: await this.getSiteLabel().catch(() => getActiveProfile().siteName),
      lookbackSignature: await this.getLookbackSignature(),
      bodySignature: (await this.getBodySample(600)).slice(0, 400),
    };
  }

  async openLookbackPeriod(): Promise<boolean> {
    const fr = await this.bi();
    const L = this.locators.inFrame(fr);
    // Filters panel may host Lookback
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

  /** Try to bump lookback span (live: "Last N Complete Month" chips / Day|Week). */
  async adjustLookbackMonths(direction: 'up' | 'down'): Promise<boolean> {
    const fr = await this.bi();
    await this.openLookbackPeriod();

    // Live default observed: "Last 1 Complete Month" — open that control
    const lookbackChip = fr
      .locator('button, [role="button"], div, span, a')
      .filter({ hasText: /Last\s+\d+\s+Complete\s+Month|Complete Month|Lookback Period/i })
      .first();
    if (await lookbackChip.isVisible().catch(() => false)) {
      await lookbackChip.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    }

    // Prefer another month-span option when opening a menu
    const options = fr.locator('[role="option"], li, button, a, label, div').filter({
      hasText: /Last\s+\d+\s+Complete\s+Months?|Last\s+\d+\s+Months?|Complete Month/i,
    });
    const count = await options.count().catch(() => 0);
    if (count > 0) {
      const idx = direction === 'up' ? Math.min(count - 1, 1) : 0;
      await options.nth(idx).click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      return true;
    }

    // Day / Week granularity soft alternate (still mutates lookback chrome)
    const gran = fr.locator('button, [role="option"], label').filter({ hasText: direction === 'up' ? /^Week$/i : /^Day$/i }).first();
    if (await gran.isVisible().catch(() => false)) {
      await gran.click({ force: true });
      await this.page.waitForTimeout(600);
      return true;
    }

    const num = fr.locator('input[type="number"]').first();
    if (await num.isVisible().catch(() => false)) {
      const cur = parseInt((await num.inputValue().catch(() => '1')) || '1', 10) || 1;
      const next = direction === 'up' ? cur + 1 : Math.max(1, cur - 1);
      await num.fill(String(next), { timeout: 5000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    return false;
  }

  async clickApply(): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /^Apply$/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true, timeout: 8000 }).catch(() => undefined);
      await this.page.waitForTimeout(3500);
      return true;
    }
    // Live Filters panel often applies on selection — soft wait for settle
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

  async softSaveAsClone(name: string): Promise<boolean> {
    const fr = await this.bi();
    const btn = fr.locator('button, a').filter({ hasText: /Save As|Save as/i }).first();
    if (!(await btn.count().catch(() => 0))) return false;
    await btn.click({ force: true });
    await this.page.waitForTimeout(1000);
    const input = fr.locator('input[type="text"], input:not([type])').filter({ hasNot: fr.locator('[type="search"]') }).last();
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
    const card = fr.locator('a, h2, h3, h4, div').filter({ hasText: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    if (!(await card.isVisible().catch(() => false))) return false;
    const menu = card.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"tile") or self::div][1]//button').last();
    await menu.click({ force: true }).catch(async () => {
      await fr.locator('button').filter({ hasText: /⋮|More|Delete/i }).first().click({ force: true }).catch(() => undefined);
    });
    await this.page.waitForTimeout(500);
    const del = fr.locator('button, a, [role="menuitem"]').filter({ hasText: /^Delete$/i }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click({ force: true });
      await this.page.waitForTimeout(500);
      await fr.locator('button').filter({ hasText: /^Delete$|^Confirm$|^OK$/i }).last().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(2000);
      return true;
    }
    return false;
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
      // Do not deep-open — presence only is enough for soft sibling
    }
    await this.searchAndOpenPop();
    await this.waitForDashboardReady();
    return mid;
  }

  async recoverPage(): Promise<void> {
    await this.dismissCoaches();
    await this.page.evaluate(() => window.stop()).catch(() => undefined);
    await Promise.race([
      (async () => {
        await this.page.goto(BI_TOOL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
        await this.waitForPortalReady().catch(() => undefined);
        await this.waitForBiFrame(60000);
        await this.openDashboardsList();
        await this.searchAndOpenPop();
        await this.waitForDashboardReady().catch(() => undefined);
        await this.ensureProfileSiteSelected();
      })(),
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('recoverPage soft timeout')), 120000)),
    ]).catch(async (err) => {
      console.log(`[CWV-POP] recover: ${err instanceof Error ? err.message : String(err)}`);
      await this.openViaNavigation().catch(() => undefined);
    });
  }

  async restoreContext(ctx: CwvPopContext): Promise<void> {
    await this.clickResetToDefault().catch(() => undefined);
    await this.ensureProfileSiteSelected();
    // Best-effort lookback restore not always possible — Reset preferred
    void ctx;
  }

  async closeOverlays(): Promise<void> {
    const fr = await this.bi().catch(() => null);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    if (fr) await fr.page().keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
  }

  chartTitlePresence(): Promise<{ pageLoad: boolean; lcp: boolean; inp: boolean; cls: boolean; pageViews: boolean }> {
    return this.getBodySample(8000).then((body) => ({
      pageLoad: /Page Load|Onload|page load time/i.test(body),
      lcp: /\bLCP\b|Largest Contentful Paint/i.test(body),
      inp: /\bINP\b|Interaction to Next Paint/i.test(body),
      cls: /\bCLS\b|Cumulative Layout Shift/i.test(body),
      pageViews: /Page Views?/i.test(body),
    }));
  }
}
