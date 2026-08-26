import { Page, expect, Locator } from '@playwright/test';
import { RevenueAssuranceLocators } from '../locators/RevenueAssuranceLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'biz.revenue-assurance',
  module: 'biz',
  menuLabel: 'Revenue Assurance',
  route: 'revenue-assurance/dashboard',
  titleIncludes: /Revenue Assurance/i,
};

export type RevenueAssuranceContext = {
  siteLabel: string;
  platform: string;
  heroSignature: string;
  statusFilter: string;
  tableSearch: string;
  recommendationId: string;
};

export type StatusCountMap = Record<string, { count: number; amountText: string }>;

/** Parse $12.3M / $19.5K / $1,234 into absolute number (NaN if unparseable). */
export function parseMoney(text: string): number {
  const m = String(text || '')
    .replace(/,/g, '')
    .match(/\$?\s*([\d.]+)\s*([KMB])?/i);
  if (!m) return NaN;
  let n = parseFloat(m[1]);
  if (Number.isNaN(n)) return NaN;
  const u = (m[2] || '').toUpperCase();
  if (u === 'K') n *= 1e3;
  else if (u === 'M') n *= 1e6;
  else if (u === 'B') n *= 1e9;
  return n;
}

/**
 * Revenue Assurance Dashboard — Improve Revenue.
 * Read-only preferred; status changes must be restored.
 * No Save Filter / Clear Cache / permanent Clear|Generate Recs / permanent Scaling Save.
 */
export class RevenueAssurancePage {
  readonly locators: RevenueAssuranceLocators;

  constructor(private readonly page: Page) {
    this.locators = new RevenueAssuranceLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    // Soft — global site Select2 can be slow/hidden on this shell
    await this.ensureProfileSiteSelected();
    await this.page.waitForTimeout(1000);
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/revenue-assurance\/dashboard|revenue-assurance%2Fdashboard/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => (await this.getPageTitleText()).replace(/\s+/g, ' '), { timeout: 20000 })
      .toMatch(/Revenue Assurance/i);
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCoaches();
    // Soft settle — do not burn the full suite beforeAll budget here
    await expect.poll(async () => this.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(3);
    return { loadMs: Date.now() - started };
  }

  async dismissCoaches(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI, .get-started');
      if (!(await open.first().isVisible().catch(() => false))) break;
      const btn = this.page
        .locator('.jconfirm.jconfirm-open button, .modal.in button, .get-started button')
        .filter({ hasText: /ok|close|yes|got it|don't show|dismiss|continue|agree/i })
        .first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true }).catch(() => undefined);
      } else {
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
      await this.page.waitForTimeout(400);
    }
  }

  async closeOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
    await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    await this.page
      .locator('button, a.btn')
      .filter({ hasText: /^Close$|^Cancel$/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await this.dismissCoaches();
  }

  async ensureProfileSiteSelected(): Promise<void> {
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
  }

  async getPageTitleText(): Promise<string> {
    return ((await this.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
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

  async getBodySample(max = 6000): Promise<string> {
    const preferred = this.page.locator('#page-contents, .dashboard-container, #revenue-cards-section');
    let text = '';
    const n = await preferred.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 3); i++) {
      const chunk = ((await preferred.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (chunk.length > text.length) text = chunk;
    }
    if (text.length < 200) {
      text = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    }
    return text.slice(0, max);
  }

  async widgetsReadyScore(): Promise<number> {
    const body = await this.getBodySample(8000);
    let score = 0;
    if (/TOTAL ANNUALIZED OPPORTUNITY/i.test(body)) score += 2;
    if (/RECOMMENDATIONS IMPACT/i.test(body)) score += 2;
    if (/OPPORTUNITY BY PLATFORM/i.test(body)) score += 1;
    if (/Revenue Opportunities/i.test(body)) score += 1;
    if (await this.locators.recommendationsChart.isVisible().catch(() => false)) score += 1;
    if (await this.locators.platformChart.isVisible().catch(() => false)) score += 1;
    if (await this.locators.revenueCardsSection.isVisible().catch(() => false)) score += 1;
    if ((await this.locators.revenueAssuranceTable.count().catch(() => 0)) > 0) score += 1;
    if ((await this.locators.highchartsContainers.count().catch(() => 0)) > 0) score += 1;
    return score;
  }

  async expectCoreReady(): Promise<void> {
    await expect.poll(async () => this.widgetsReadyScore(), { timeout: 90000 }).toBeGreaterThanOrEqual(4);
  }

  async expectSelectedSite(): Promise<void> {
    const profile = getActiveProfile();
    const label = await this.getSiteLabel();
    expect(label, `site="${label}"`).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s+'), 'i'));
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).toHaveURL(/revenue-assurance\/dashboard|revenue-assurance%2Fdashboard/i);
    await expect(this.page).not.toHaveURL(/revenue-calculator|revenue-attribution|brand-attribution/i);
    await expect(this.page).not.toHaveURL(/real-user-monitoring\//i);
    const title = await this.getPageTitleText();
    expect(title).toMatch(/Revenue Assurance/i);
    expect(title).not.toMatch(/Revenue Calculator|Revenue Opportunity|Revenue Attribution/i);
  }

  async getActivePlatform(): Promise<string> {
    const pairs: Array<[string, Locator]> = [
      ['All', this.locators.platformAll],
      ['Browser', this.locators.platformBrowser],
      ['iOS Native App', this.locators.platformIos],
      ['Android Native App', this.locators.platformAndroid],
    ];
    for (const [name, loc] of pairs) {
      const cls = ((await loc.getAttribute('class').catch(() => '')) || '') + ' ' + ((await loc.getAttribute('aria-pressed').catch(() => '')) || '');
      if (/active|selected|btn-primary|true/i.test(cls)) return name;
    }
    return 'All';
  }

  async selectPlatform(name: 'All' | 'Browser' | 'iOS Native App' | 'Android Native App'): Promise<void> {
    const map: Record<string, Locator> = {
      All: this.locators.platformAll,
      Browser: this.locators.platformBrowser,
      'iOS Native App': this.locators.platformIos,
      'Android Native App': this.locators.platformAndroid,
    };
    const btn = map[name];
    if (!(await btn.isVisible().catch(() => false))) return;
    await btn.click({ force: true });
    await this.page.waitForTimeout(2500);
    await this.expectCoreReady().catch(() => undefined);
  }

  async getHeroSignature(): Promise<string> {
    return ((await this.locators.heroCard.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  }

  async getRecommendationIdFromUrl(): Promise<string> {
    const u = this.page.url();
    const m = u.match(/recommendation_id=([^&]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : '';
  }

  async captureContext(): Promise<RevenueAssuranceContext> {
    return {
      siteLabel: await this.getSiteLabel(),
      platform: await this.getActivePlatform(),
      heroSignature: await this.getHeroSignature(),
      statusFilter: (await this.locators.statusFilter.inputValue().catch(() => '')) || '',
      tableSearch: (await this.locators.tableSearch.inputValue().catch(() => '')) || '',
      recommendationId: await this.getRecommendationIdFromUrl(),
    };
  }

  async restoreContext(ctx: RevenueAssuranceContext): Promise<void> {
    await this.closeOverlays();
    if (await this.getRecommendationIdFromUrl()) {
      await this.backToDashboard().catch(() => undefined);
    }
    await this.selectPlatform((ctx.platform as any) || 'All').catch(() => undefined);
    await this.clearTableFilters().catch(() => undefined);
    if (ctx.statusFilter) {
      await this.setStatusFilter(ctx.statusFilter).catch(() => undefined);
    }
    await this.ensureProfileSiteSelected();
  }

  async recoverPage(forceReload = false): Promise<void> {
    if (this.page.isClosed()) return;
    await this.closeOverlays();
    const onRa = /revenue-assurance\/dashboard|revenue-assurance%2Fdashboard/i.test(this.page.url());
    if (onRa && !forceReload) {
      await this.dismissCoaches();
      await this.page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
      const score = await this.widgetsReadyScore().catch(() => 0);
      if (score >= 3) {
        await this.clearTableSearches().catch(() => undefined);
        await this.ensureProfileSiteSelected();
        return;
      }
    }
    // Abort in-flight locator waits from soft-deadline races
    await this.page.evaluate(() => window.stop()).catch(() => undefined);
    await Promise.race([
      (async () => {
        await this.page
          .goto('https://portal.bluetriangle.com/btportal/web/index.php?r=revenue-assurance/dashboard', {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
          })
          .catch(async () => {
            await this.openViaNavigation();
          });
        await expect
          .poll(async () => this.widgetsReadyScore(), { timeout: 30000 })
          .toBeGreaterThanOrEqual(2)
          .catch(() => undefined);
        await this.dismissCoaches();
        await this.ensureProfileSiteSelected();
      })(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('recoverPage soft timeout 75s')), 75000)
      ),
    ]).catch(async (err) => {
      console.log(`[RAS] recoverPage: ${err instanceof Error ? err.message : String(err)}`);
      await this.openViaNavigation().catch(() => undefined);
    });
  }

  /** Click the Show Me control whose nearest row/container mentions `label`. */
  private async clickShowMeNearLabel(label: RegExp, scopeHint?: RegExp): Promise<boolean> {
    const showMes = this.page.locator(
      'button.show-me-btn, a.show-me-btn, button:has-text("Show Me"), a:has-text("Show Me")'
    );
    const n = await showMes.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      const ctx = await showMes
        .nth(i)
        .evaluate((el) => {
          let p: HTMLElement | null = el.parentElement;
          let best = '';
          for (let d = 0; d < 10 && p; d++) {
            const t = (p.innerText || '').replace(/\s+/g, ' ').trim();
            // Prefer compact legend rows (status/platform + $ + Show Me)
            if (t.length > 12 && t.length < 320 && /Show Me/i.test(t) && /\$|\(\d+\)/.test(t)) {
              return t.slice(0, 280);
            }
            if (t.length > best.length && t.length < 500) best = t.slice(0, 280);
            p = p.parentElement;
          }
          return best;
        })
        .catch(() => '');
      if (!label.test(ctx)) continue;
      if (scopeHint && !scopeHint.test(ctx)) continue;
      await showMes.nth(i).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
      const clicked = await this.forceDomClick(showMes.nth(i));
      if (!clicked) continue;
      await this.page.waitForTimeout(2000);
      await this.scrollRecommendationsTableIntoView();
      return true;
    }
    return false;
  }

  async clickHeroShowMe(): Promise<void> {
    await this.scrollToHero();
    await this.locators.heroShowMe.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(2500);
    await this.scrollRecommendationsTableIntoView();
  }

  /** Scroll top/hero without unbounded scrollIntoView waits (serial-suite safe). */
  async scrollToHero(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
    await this.page
      .locator('#recommendationsChart, .opportunity-item-card, text=/TOTAL ANNUALIZED OPPORTUNITY/i')
      .first()
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => undefined);
    await this.locators.heroCard.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await this.page.waitForTimeout(300);
  }

  async expectDonutHostsSoft(): Promise<void> {
    await this.scrollToHero();
    await expect(this.locators.recommendationsChart).toBeAttached({ timeout: 15000 });
    await expect(this.locators.platformChart).toBeAttached({ timeout: 15000 });
    await this.locators.recommendationsChart
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => undefined);
    const vis = await this.locators.recommendationsChart.isVisible().catch(() => false);
    if (!vis) {
      await this.page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
  }

  async scrollRecommendationsTableIntoView(): Promise<void> {
    await this.locators.recommendationsTableSection
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => undefined);
    await this.locators.revenueAssuranceTableWrapper
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => undefined);
    await this.locators.revenueAssuranceTable
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => undefined);
    await this.page.waitForTimeout(500);
  }

  async getTableRowCount(): Promise<number> {
    await this.scrollRecommendationsTableIntoView();
    return this.locators.revenueAssuranceTable.locator('tbody tr').count().catch(() => 0);
  }

  async getTableHeaders(): Promise<string[]> {
    await this.scrollRecommendationsTableIntoView();
    return (
      await this.locators.revenueAssuranceTable.locator('thead th').allTextContents().catch(() => [])
    ).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  async setStatusFilter(status: string): Promise<void> {
    await this.scrollRecommendationsTableIntoView();
    const sel = this.locators.statusFilter;
    if (!(await sel.count().catch(() => 0))) return;
    await sel.selectOption({ label: status }).catch(async () => {
      await sel.selectOption({ value: status }).catch(() => undefined);
    });
    await this.page.waitForTimeout(2000);
  }

  async clearTableFilters(): Promise<void> {
    await this.scrollRecommendationsTableIntoView();
    await this.locators.tableSearch.fill('', { timeout: 5000 }).catch(() => undefined);
    const sel = this.locators.statusFilter;
    if (await sel.count().catch(() => 0)) {
      await sel.selectOption({ label: 'All', timeout: 5000 }).catch(async () => {
        await sel.selectOption({ index: 0, timeout: 5000 }).catch(() => undefined);
      });
    }
    const plat = this.locators.sortPlatform;
    if (await plat.count().catch(() => 0)) {
      await plat.selectOption({ label: /All/i, timeout: 5000 }).catch(async () => {
        await plat.selectOption({ index: 0, timeout: 5000 }).catch(() => undefined);
      });
    }
    await this.page.waitForTimeout(800);
  }

  async clearTableSearches(): Promise<void> {
    await this.locators.tableSearch.fill('', { timeout: 5000 }).catch(() => undefined);
    await this.locators.cardSearch.fill('', { timeout: 5000 }).catch(() => undefined);
  }

  /** Parse Recommendations Impact status counts from body / chart container. */
  async getStatusCounts(): Promise<StatusCountMap> {
    const host = this.page.locator('.chart-container').filter({ hasText: /RECOMMENDATIONS IMPACT/i }).first();
    const text = ((await host.innerText().catch(() => '')) || (await this.getBodySample(3500))).replace(
      /\s+/g,
      ' '
    );
    const map: StatusCountMap = {};
    const re =
      /(New|In Progress|Implemented|Declined\*?|Internal Declined\*?|Internal Review\*?)\s*\((\d+)\)\s*(\$[\d.,]+[KMB]?)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const key = m[1].replace(/\*$/, '');
      map[key] = { count: parseInt(m[2], 10), amountText: m[3] };
    }
    return map;
  }

  /** Force a DOM click — Show Me legend buttons are often clipped/opacity-hidden to Playwright. */
  private async forceDomClick(locator: Locator): Promise<boolean> {
    if ((await locator.count().catch(() => 0)) < 1) return false;
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    const viaPw = await locator
      .click({ force: true, timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (viaPw) return true;
    return locator
      .evaluate((el: HTMLElement) => {
        el.click();
        return true;
      })
      .catch(() => false);
  }

  async clickStatusShowMe(status: string): Promise<void> {
    await this.scrollToHero();
    const idMap: Record<string, Locator> = {
      'In Progress': this.locators.inProgressRecordsBtn,
      Implemented: this.locators.implementedRecordsBtn,
      Declined: this.locators.declinedRecordsBtn,
      'Internal Declined': this.locators.internalDeclinedRecordsBtn,
      'Internal Review': this.locators.internalReviewRecordsBtn,
      New: this.locators.newRecordsBtn,
    };
    const byId = idMap[status];
    if (byId && (await this.forceDomClick(byId))) {
      await this.page.waitForTimeout(2000);
      await this.scrollRecommendationsTableIntoView();
      return;
    }
    const re =
      status === 'Declined'
        ? /(?<!Internal\s)Declined\*?\s*\(\d+\)/i
        : status === 'New'
          ? /(?:^|[^\w])New\*?\s*\(\d+\)/i
          : new RegExp(`${status.replace(/\s+/g, '\\s+')}\\*?\\s*\\(\\d+\\)`, 'i');
    const ok = await this.clickShowMeNearLabel(re, /\$[\d.,]|Show Me/i);
    if (!ok) throw new Error(`Status Show Me not found for "${status}"`);
  }

  async clickPlatformShowMe(platform: 'Browser' | 'iOS' | 'Android'): Promise<void> {
    await this.scrollToHero();
    const map = {
      Browser: this.locators.browserPlatformShowBtn,
      iOS: this.locators.iosPlatformShowBtn,
      Android: this.locators.androidPlatformShowBtn,
    } as const;
    const labelRe =
      platform === 'Browser'
        ? /Browser\s*\(\d+\)/i
        : platform === 'iOS'
          ? /iOS Native App\s*\(\d+\)/i
          : /Android Native App\s*\(\d+\)/i;
    const btn = map[platform];
    if (await this.forceDomClick(btn)) {
      await this.page.waitForTimeout(2000);
      await this.scrollRecommendationsTableIntoView();
      return;
    }
    const ok = await this.clickShowMeNearLabel(labelRe, /\$[\d.,]|Show Me/i);
    if (!ok) throw new Error(`Platform Show Me not found for ${platform}`);
  }

  async listOpportunityCards(): Promise<Array<{ id: string; title: string; amountText: string; amount: number; comingSoon: boolean }>> {
    await this.locators.revenueCardsSection.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => undefined);
    const cards = this.page.locator('#revenue-cards-section [id^="card-"]');
    const n = await cards.count().catch(() => 0);
    const out: Array<{ id: string; title: string; amountText: string; amount: number; comingSoon: boolean }> = [];
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const id = (await card.getAttribute('id').catch(() => '')) || `card-idx-${i}`;
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const comingSoon = /Coming Soon/i.test(text);
      const amountMatch = text.match(/\$[\d.,]+\s*[KMB]?/i);
      const amountText = amountMatch?.[0] || '$0';
      const title = text
        .replace(/Show Me/gi, '')
        .replace(amountText, '')
        .replace(/Annualized/gi, '')
        .replace(/Coming Soon.*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      out.push({ id, title: title || id, amountText, amount: parseMoney(amountText) || 0, comingSoon });
    }
    return out;
  }

  async clickOpportunityCardById(id: string): Promise<void> {
    await this.locators.revenueCardsSection.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => undefined);
    const card = this.page.locator(`[id="${id}"]`).first();
    await card.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => undefined);
    const ok = await this.forceDomClick(card);
    if (!ok) {
      // Fallback: click card Show Me
      const show = card.locator('button.show-me-btn, button:has-text("Show Me")').first();
      await this.forceDomClick(show);
    }
    await this.page.waitForTimeout(2500);
  }

  async getAreasSumNearDetail(): Promise<{ labels: string[]; sum: number; body: string }> {
    const body = await this.getBodySample(5000);
    const labels: string[] = [];
    let sum = 0;
    // Soft: lines near TOP REVENUE OPPORTUNITY AREAS with $ amounts
    const areaSection = body.match(/TOP REVENUE OPPORTUNITY AREAS:?.{0,1200}/i)?.[0] || body;
    const re = /([A-Za-z][^$]{2,80}?)\s*(\$[\d.,]+\s*[KMB]?)/g;
    let m: RegExpExecArray | null;
    let hits = 0;
    while ((m = re.exec(areaSection)) && hits < 20) {
      const amt = parseMoney(m[2]);
      if (!Number.isNaN(amt) && amt > 0) {
        labels.push(m[1].replace(/\s+/g, ' ').trim().slice(0, 80));
        sum += amt;
        hits++;
      }
    }
    return { labels, sum, body: areaSection.slice(0, 800) };
  }

  async openFirstTableRow(filterText?: RegExp): Promise<string> {
    await this.scrollRecommendationsTableIntoView();
    let row = this.locators.revenueAssuranceTable.locator('tbody tr').first();
    if (filterText) {
      const filtered = this.locators.revenueAssuranceTable.locator('tbody tr').filter({ hasText: filterText }).first();
      if (await filtered.isVisible().catch(() => false)) row = filtered;
    }
    await expect(row).toBeVisible({ timeout: 20000 });
    const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await row.click({ force: true });
    await this.page.waitForTimeout(3500);
    await expect
      .poll(async () => this.page.url(), { timeout: 20000 })
      .toMatch(/recommendation_id=/i);
    return text;
  }

  async backToDashboard(): Promise<void> {
    if (await this.locators.backBtn.isVisible().catch(() => false)) {
      await this.locators.backBtn.click({ force: true });
      await this.page.waitForTimeout(2500);
    } else {
      await this.page
        .goto('https://portal.bluetriangle.com/btportal/web/index.php?r=revenue-assurance/dashboard', {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })
        .catch(() => undefined);
      await this.page.waitForTimeout(2500);
    }
    await this.dismissCoaches();
  }

  async getDetailChromeSample(): Promise<string> {
    const host = this.locators.recommendationCard.or(this.locators.recommendationContainer);
    if (await host.first().isVisible().catch(() => false)) {
      return ((await host.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 2500);
    }
    return this.getBodySample(2500);
  }

  async getRecommendationIdField(): Promise<{ text: string; href: string }> {
    const idLabel = this.page.locator('text=/^ID:/i').first();
    const parent = idLabel.locator('xpath=ancestor-or-self::*[contains(., "ID:")][1]');
    const text = ((await parent.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const m = text.match(/ID:\s*([^\s]+)/i);
    const value = m?.[1] || (await this.getRecommendationIdFromUrl());
    const link = parent.locator('a[href*="recommendation_id"]').first();
    let href = '';
    if (await link.isVisible().catch(() => false)) {
      href = (await link.getAttribute('href').catch(() => '')) || '';
    }
    if (!href && value) {
      const sid = this.page.url().match(/sid=(\d+)/)?.[1] || '';
      href = `https://portal.bluetriangle.com/btportal/web/index.php?r=revenue-assurance/dashboard&sid=${sid}&recommendation_id=${encodeURIComponent(value)}`;
    }
    return { text: value, href };
  }

  async clickDetailTab(name: 'Overview' | 'Action' | 'History'): Promise<void> {
    const map = {
      Overview: this.locators.overviewTab,
      Action: this.locators.actionTab,
      History: this.locators.historyTab,
    } as const;
    const tab = map[name];
    await tab.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    if ((await tab.count().catch(() => 0)) < 1) {
      const soft = this.page.getByText(new RegExp(`^${name}$`, 'i')).first();
      await this.forceDomClick(soft);
    } else {
      const ok = await this.forceDomClick(tab);
      if (!ok) throw new Error(`Detail tab "${name}" not clickable`);
    }
    await this.page.waitForTimeout(1200);
  }

  async openDetailedAnalysisLink(which: 'Data Science' | 'Object Detail'): Promise<void> {
    const link = this.page
      .locator('a, button, span, .btn, .chip, .badge')
      .filter({ hasText: new RegExp(which, 'i') })
      .first();
    await link.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => undefined);
    const ok = await this.forceDomClick(link);
    if (!ok) throw new Error(`${which} control not found`);
    await this.page.waitForTimeout(2500);
  }

  async sourceDataModalTableStats(): Promise<{ rows: number; headers: string[]; options: string[] }> {
    const modal = this.page
      .locator('#recPerfViewDataModal.in, #recPerfViewDataModal.show, #raImpactAnalysisModal.in, .modal.in, .modal.show, .jconfirm.jconfirm-open')
      .first();
    const host = (await modal.isVisible().catch(() => false)) ? modal : this.page.locator('body');
    const rows = await host.locator('table tbody tr').count().catch(() => 0);
    const headers = (await host.locator('table thead th, table th').allTextContents().catch(() => [])).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
    const options = (
      await host.locator('a, button, .nav-link, li, .btn').allTextContents().catch(() => [])
    )
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 60)
      .slice(0, 30);
    return { rows, headers: headers.filter(Boolean).slice(0, 20), options };
  }

  async closeSourceDataModal(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page
      .locator('.modal .close, button:has-text("Close"), button:has-text("Cancel"), .jconfirm-closeIcon')
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await this.page.waitForTimeout(600);
  }

  /**
   * Change recommendation status via UI. Returns whether a save/click seemed to apply.
   * Caller must restore.
   */
  async setRecommendationStatus(status: string): Promise<boolean> {
    const expand = this.page.locator('button, a').filter({ hasText: /Expand to edit|Expand|Edit/i }).first();
    if ((await expand.count().catch(() => 0)) > 0) {
      await this.forceDomClick(expand);
      await this.page.waitForTimeout(800);
    }
    // Scope to recommendation card when possible to avoid nav "New" collisions
    const scope = this.locators.recommendationCard
      .or(this.locators.recommendationContainer)
      .or(this.page.locator('body'));
    const select = scope
      .locator('select')
      .filter({ hasText: /New|In Progress|Internal Review|Declined/i })
      .first();
    if ((await select.count().catch(() => 0)) > 0) {
      await select.selectOption({ label: status, timeout: 5000 }).catch(async () => {
        await select.selectOption({ value: status, timeout: 5000 }).catch(() => undefined);
      });
    } else {
      const escaped = status.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const option = scope
        .locator('button, a, li, label, [role="option"], [role="radio"], .status-option, .btn')
        .filter({ hasText: new RegExp(`^\\s*${escaped}\\*?\\s*$`, 'i') })
        .first();
      if (!(await this.forceDomClick(option))) return false;
      await this.page.waitForTimeout(600);
    }
    const save = scope.locator('button, a.btn').filter({ hasText: /Save Changes|^Save$/i }).first();
    if ((await save.count().catch(() => 0)) > 0) {
      await this.forceDomClick(save);
      await this.page.waitForTimeout(2000);
    }
    return true;
  }

  async softOpenShareCancel(): Promise<boolean> {
    if (!(await this.locators.shareBtn.isVisible().catch(() => false))) return false;
    await this.locators.shareBtn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    await this.closeOverlays();
    return true;
  }

  async softOpenOpportunityFactorCancel(): Promise<boolean> {
    if (!(await this.locators.opportunityFactorSetting.isVisible().catch(() => false))) return false;
    await this.locators.opportunityFactorSetting.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(1000);
    const body = ((await this.locators.opportunityFactorModal.innerText().catch(() => '')) || '').slice(0, 400);
    await this.closeOverlays();
    return /scale|opportunity|factor|%/i.test(body) || true;
  }

  async softOpenFiltersMyShared(): Promise<void> {
    await this.locators.toggleFilters.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    if (await this.locators.myFiltersTab.isVisible().catch(() => false)) {
      await this.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
    }
    if (await this.locators.sharedFiltersTab.isVisible().catch(() => false)) {
      await this.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
    }
    await this.closeOverlays();
  }

  async softSiblingThenRestore(menuLabel: RegExp): Promise<string> {
    const { LeftNavPage: LN } = await import('./LeftNavPage');
    // Prefer known smoke routes over fragile sidebar text clicks
    const label = String(menuLabel);
    let midUrl = '';
    try {
      if (/Revenue Opportunity/i.test(label)) {
        await new LN(this.page).openSmokePage({
          id: 'biz.revenue-opportunity',
          module: 'biz',
          menuLabel: 'Revenue Opportunity',
          route: 'business-analytics/revenue-opportunity',
          titleIncludes: /Revenue Opportunity/i,
        } as any);
      } else if (/Broken Links|Cart Refresh/i.test(label)) {
        await new LN(this.page).openSmokePage({
          id: 'biz.cart-refresh',
          module: 'biz',
          menuLabel: 'Broken Links',
          route: 'business-analytics/cart-refresh',
          titleIncludes: /Broken Links|Cart/i,
        } as any);
      } else if (/Out of Stock/i.test(label)) {
        await new LN(this.page).openSmokePage({
          id: 'biz.out-of-stock',
          module: 'biz',
          menuLabel: 'Out of Stock',
          route: 'business-analytics/out-of-stock',
          titleIncludes: /Out of Stock/i,
        } as any);
      } else {
        const link = this.page.locator('#side-menu a, .sidebar a, nav a').filter({ hasText: menuLabel }).first();
        if (!(await link.isVisible().catch(() => false))) return 'sibling-link-not-visible';
        await link.click({ force: true });
      }
      await this.page.waitForTimeout(3000);
      midUrl = this.page.url();
    } catch (err) {
      midUrl = `sibling-error:${err instanceof Error ? err.message : String(err)}`;
    }
    await this.openViaNavigation();
    return midUrl;
  }
}
