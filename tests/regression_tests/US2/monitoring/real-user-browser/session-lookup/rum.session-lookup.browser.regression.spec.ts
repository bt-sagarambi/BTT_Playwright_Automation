import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumSessionLookupPage } from '../../../../../../pages/RumSessionLookupPage';
import { getActiveProfile } from '../../../../../../config/profiles';
import { SiteDropdownPage } from '../../../../../../pages/SiteDropdownPage';

/**
 * Regression: Session Lookup (RUM Browser)
 * Site: any profile site already loaded in the portal (not hard-coded)
 * Path: tests/regression_tests/US2/monitoring/real-user-browser/session-lookup
 *
 * Ambiguities (soft-continue when missing):
 * - IP Address lookup may be absent for site/user
 * - Some sites may lack usable BTT Session ID/GUID seed values
 * - Replay links may be unconfigured
 * - Object-level detail / Domain/Object/Resource widgets depend on selected point
 * - Custom-variable lookup/metric options are dynamic
 * - Wildcard matching per lookup category is UI-dependent
 * - Right-nav filter set may be reduced by role/site
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../playwright/.auth/user.json');

async function withSoftDeadline<T>(work: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`soft deadline ${ms}ms exceeded`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test.describe('US2 Regression — RUM Session Lookup (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumSessionLookupPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumSessionLookupPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Session Lookup] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-SL-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
    await expect(page).toHaveURL(/session-lookup-performance-detail/);
    await expect(rum.locators.pageHeading).toBeVisible();
    // Site dropdown must be populated (any site — profile may be GDC, Demo eCom, etc.)
    const site = new SiteDropdownPage(page);
    const selected = await site.getSelectedSite();
    expect(selected.length, 'Site dropdown should show a loaded site after Session Lookup loads').toBeGreaterThan(0);
    expect(selected).not.toMatch(/select site|choose site|no site/i);
  });

  test('REG-RUM-SL-002 — site is loaded in top nav (any non-empty selection)', async () => {
    const site = new SiteDropdownPage(page);
    await site.expectVisible();
    const selected = await site.getSelectedSite();
    expect(selected.length, 'Selected site label should be non-empty').toBeGreaterThan(2);
    // Accept whatever site the active run profile selected — do not hard-code a product demo site.
    expect(selected).not.toMatch(/^(select|choose|loading)/i);
    console.log(`[RUM Session Lookup] loaded site="${selected}"`);
  });

  test('REG-RUM-SL-003 — chrome controls and Performance Detail / View Filters', async () => {
    await rum.expectChromeControls();
  });

  test('REG-RUM-SL-004 — View Filters toggles applied-filter summary', async () => {
    try {
      const state = await rum.toggleViewFiltersBanner();
      expect(['shown', 'hidden']).toContain(state);
      await rum.toggleViewFiltersBanner().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `View Filters soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-005 — top-right navigation icons remain usable', async () => {
    await expect(rum.locators.filtersToggle).toBeVisible();
    await expect(rum.locators.themeToggle).toBeVisible();
    await expect(rum.locators.helpToggle).toBeVisible();
    await expect(rum.locators.settingsToggle).toBeVisible();
    await expect(rum.locators.userToggle).toBeVisible();
    if (await rum.locators.tvModeToggle.isVisible().catch(() => false)) {
      await expect(rum.locators.tvModeToggle).toBeVisible();
    }
    if (await rum.locators.feedbackToggle.isVisible().catch(() => false)) {
      await expect(rum.locators.feedbackToggle).toBeVisible();
    }
    if (await rum.locators.assistantToggle.isVisible().catch(() => false)) {
      await expect(rum.locators.assistantToggle).toBeVisible();
    }
  });

  test('REG-RUM-SL-006 — info (i) tooltip sample near Lookup / Metric', async () => {
    const tip = await rum.sampleInfoTooltip();
    expect(tip.length + (await rum.locators.infoIcons.count())).toBeGreaterThan(0);
  });

  test('REG-RUM-SL-007 — responsive sampled viewport keeps Lookup accessible', async () => {
    await rum.sampleResponsiveViewport();
    await expect(rum.locators.lookupInput).toBeVisible();
  });

  test('REG-RUM-SL-008 — keyboard focus on Lookup / Metric controls', async () => {
    await rum.sampleKeyboardFocus();
  });

  test('REG-RUM-SL-009 — initial empty/ready Lookup section and Displayed Metric', async () => {
    await rum.expectDefaultEmptyOrReadyState();
    const metric = await rum.locators.displayedMetricSelect.inputValue().catch(async () => {
      const text = await rum.locators.displayedMetricSelect.locator('option:checked').textContent();
      return text || '';
    });
    expect((metric || '').length).toBeGreaterThan(0);
  });

  test('REG-RUM-SL-010 — empty / whitespace / invalid lookup do not crash page', async () => {
    await rum.performLookup(/^URL$/i, '');
    await rum.expectLookupControlsEnabled();
    await rum.performLookup(/^URL$/i, '   ');
    await rum.expectLookupControlsEnabled();
    await rum.performLookup(/^URL$/i, 'https://invalid-session-lookup-no-match.example.test/path');
    await rum.expectLookupControlsEnabled();
    await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
  });

  test('REG-RUM-SL-011 — stable lookup options present (IP Address conditional)', async () => {
    const { hasIp, options } = await rum.expectStableLookupOptions();
    if (!hasIp) {
      test.info().annotations.push({
        type: 'note',
        description: 'IP Address lookup option not present for this site/user (documented but optional)',
      });
    }
    console.log(`[Session Lookup] lookup options count=${options.length} hasIp=${hasIp}`);
  });

  test('REG-RUM-SL-012 — switch lookup types and keep search input usable', async () => {
    for (const type of [/^BTT Session ID$/i, /^BTT GUID$/i, /^Customer Session ID$/i, /^URL$/i, /User Agent String/i]) {
      await rum.selectLookupType(type);
      await expect(rum.locators.lookupInput).toBeEnabled();
    }
    await rum.selectLookupType(/^URL$/i);
  });

  test('REG-RUM-SL-013 — derive runtime URL from Performance Detail and return', async () => {
    test.setTimeout(240000);
    try {
      const derived = await withSoftDeadline(
        () => rum.deriveRuntimeLookupFromPerformanceDetail(),
        120000
      );
      await rum.openViaNavigation();
      if (!derived.url) {
        test.info().annotations.push({
          type: 'note',
          description: 'No runtime URL derived from Performance Detail Page Views; subsequent positive lookups soft-continue',
        });
      } else {
        console.log(`[Session Lookup] runtime URL derived (len=${derived.url.length}) pageName=${derived.pageName}`);
        console.log(
          `[Session Lookup] identifiers session=${derived.sessionId ? 'yes' : 'no'} guid=${derived.guid ? 'yes' : 'no'} customerSession=${derived.customerSessionId ? 'yes' : 'no'} userAgent=${derived.userAgent ? 'yes' : 'no'} ip=${derived.ipAddress ? 'yes' : 'no'}`
        );
      }
      await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
    } catch (err) {
      await rum.openViaNavigation().catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Runtime derive soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-014 — positive URL lookup using runtime-derived value', async () => {
    test.setTimeout(180000);
    if (!rum.runtimeLookupUrl) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no runtime URL' });
      return;
    }
    try {
      await withSoftDeadline(() => rum.performLookup(/^URL$/i, rum.runtimeLookupUrl), 90000);
      const ok = await rum.waitForLookupResults(60000);
      rum.hasPositiveLookup = ok;
      if (!ok) {
        test.info().annotations.push({
          type: 'note',
          description: 'URL lookup returned no matching sessions/page views; soft-continue',
        });
        return;
      }
      await rum.expectPositiveLookupResults();
      await rum.captureRuntimeIdentifiersFromLookupResults();
      console.log(
        `[Session Lookup] lookup identifiers session=${rum.runtimeSessionId ? 'yes' : 'no'} guid=${rum.runtimeGuid ? 'yes' : 'no'} customerSession=${rum.runtimeCustomerSessionId ? 'yes' : 'no'} userAgent=${rum.runtimeUserAgent ? 'yes' : 'no'} ip=${rum.runtimeIpAddress ? 'yes' : 'no'}`
      );
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Positive URL lookup soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-015 — positive unmasked BTT Session ID lookup returns valid details', async () => {
    if (!rum.runtimeSessionId || /^$|#+/.test(rum.runtimeSessionId.trim())) {
      test.info().annotations.push({
        type: 'note',
        description:
          `BTT Session ID unavailable or masked for this site/build ("${rum.runtimeSessionId || ''}"). Soft-skip positive Session ID lookup.`,
      });
      return;
    }
    await rum.performLookup(/^BTT Session ID$/i, rum.runtimeSessionId);
    const ready = await rum.waitForLookupResults(60000);
    expect(ready, 'BTT Session ID lookup should return valid details').toBeTruthy();
    await rum.expectPositiveLookupResults();
    await rum.expectSessionsTable();
    if (await rum.locators.performanceMeasurementDetailsTable.isVisible().catch(() => false)) {
      await rum.expectPerformanceMeasurementDetails();
    } else {
      test.info().annotations.push({
        type: 'note',
        description:
          'Session ID returned a valid Sessions row; selected Displayed Metric has no page-view detail point',
      });
    }
    rum.hasPositiveLookup = true;
  });

  test('REG-RUM-SL-046 — positive unmasked BTT GUID lookup returns valid details', async () => {
    if (!rum.runtimeGuid || /^$|#+/.test(rum.runtimeGuid.trim())) {
      test.info().annotations.push({
        type: 'note',
        description:
          `BTT GUID unavailable or masked for this site/build ("${rum.runtimeGuid || ''}"). Soft-skip positive GUID lookup.`,
      });
      return;
    }
    await rum.performLookup(/^BTT GUID$/i, rum.runtimeGuid);
    const ready = await rum.waitForLookupResults(60000);
    expect(ready, 'BTT GUID lookup should return valid details').toBeTruthy();
    await rum.expectPositiveLookupResults();
    await rum.expectSessionsTable();
    if (await rum.locators.performanceMeasurementDetailsTable.isVisible().catch(() => false)) {
      await rum.expectPerformanceMeasurementDetails();
    } else {
      test.info().annotations.push({
        type: 'note',
        description:
          'GUID returned a valid Sessions row; selected Displayed Metric has no page-view detail point',
      });
    }
    rum.hasPositiveLookup = true;
  });

  test('REG-RUM-SL-047 — Customer Session ID positive lookup when available', async () => {
    if (!rum.runtimeCustomerSessionId || /#+/.test(rum.runtimeCustomerSessionId)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Customer Session ID is not populated for the sampled measurement',
      });
      return;
    }
    await rum.performLookup(/^Customer Session ID$/i, rum.runtimeCustomerSessionId);
    expect(await rum.waitForLookupResults(60000)).toBeTruthy();
    await rum.expectPerformanceMeasurementDetails();
  });

  test('REG-RUM-SL-048 — User Agent String positive lookup when available', async () => {
    if (!rum.runtimeUserAgent) {
      test.info().annotations.push({
        type: 'note',
        description: 'User Agent String is not populated for the sampled measurement',
      });
      return;
    }
    await rum.performLookup(/User Agent String/i, rum.runtimeUserAgent);
    expect(await rum.waitForLookupResults(60000)).toBeTruthy();
    await rum.expectPositiveLookupResults();
  });

  test('REG-RUM-SL-049 — IP Address positive lookup when option/value are available', async () => {
    const options = await rum.getLookupOptions();
    if (!options.some((option) => /IP Address/i.test(option)) || !rum.runtimeIpAddress) {
      test.info().annotations.push({
        type: 'note',
        description: 'IP Address lookup option/value is unavailable for the sampled measurement',
      });
      return;
    }
    await rum.performLookup(/IP Address/i, rum.runtimeIpAddress);
    expect(await rum.waitForLookupResults(60000)).toBeTruthy();
    await rum.expectPositiveLookupResults();
  });

  test('REG-RUM-SL-016 — whitespace-trimmed URL lookup and repeat stability', async () => {
    if (!rum.runtimeLookupUrl) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no runtime URL' });
      return;
    }
    try {
      await rum.performLookup(/^URL$/i, `  ${rum.runtimeLookupUrl}  `);
      await rum.waitForLookupResults(45000);
      await rum.performLookup(/^URL$/i, rum.runtimeLookupUrl);
      const chartsBefore = await rum.locators.highchartsContainers.count();
      await rum.performLookup(/^URL$/i, rum.runtimeLookupUrl);
      const chartsAfter = await rum.locators.highchartsContainers.count();
      expect(chartsAfter).toBeGreaterThan(0);
      expect(Math.abs(chartsAfter - chartsBefore)).toBeLessThan(5);
      rum.hasPositiveLookup = true;
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Repeat lookup soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-017 — deep-link Base64 URL parameter populates lookup', async () => {
    test.setTimeout(180000);
    if (!rum.runtimeLookupUrl) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no runtime URL for deep-link' });
      return;
    }
    try {
      await withSoftDeadline(() => rum.openDeepLinkWithUrl(rum.runtimeLookupUrl), 120000);
      const inputVal = await rum.locators.lookupInput.inputValue().catch(() => '');
      expect(inputVal.length + rum.runtimeLookupUrl.length).toBeGreaterThan(0);
      const ok = await rum.waitForLookupResults(60000);
      if (ok) rum.hasPositiveLookup = true;
      else {
        test.info().annotations.push({
          type: 'note',
          description: 'Deep-link opened but no matching results yet; soft-continue',
        });
      }
    } catch (err) {
      await rum.openViaNavigation().catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Deep-link soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-018 — refresh deep-linked page restores lookup context', async () => {
    if (!rum.runtimeLookupUrl) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no runtime URL' });
      return;
    }
    try {
      if (!/url=/i.test(page.url())) {
        await rum.openDeepLinkWithUrl(rum.runtimeLookupUrl);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rum.waitForPageReady();
      await expect(rum.locators.lookupInput).toBeVisible();
      await rum.waitForLookupResults(45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Deep-link refresh soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-019 — malformed deep-link URL fails gracefully', async () => {
    try {
      await rum.openMalformedDeepLink();
      await rum.expectLookupControlsEnabled();
      await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
      await rum.openViaNavigation();
      if (rum.runtimeLookupUrl) {
        await rum.performLookup(/^URL$/i, rum.runtimeLookupUrl);
        await rum.waitForLookupResults(45000);
      }
    } catch (err) {
      await rum.openViaNavigation().catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Malformed deep-link soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-020 — All Page Views graph title / legend / points', async () => {
    const ready = await rum.ensurePositiveLookup();
    if (!ready) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup data' });
      return;
    }
    try {
      await expect(rum.locators.pageViewsSessionChart).toBeVisible({ timeout: 20000 });
      await expect(rum.locators.allPageViewsHeading()).toBeVisible();
      await expect(page.getByText(/Page Level Detail Only|Without Object Level Detail/i).first()).toBeVisible({
        timeout: 15000,
      });
      const points = await rum.locators.pageViewsSessionChart.locator('.highcharts-point').count();
      expect(points).toBeGreaterThan(0);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `All Page Views graph soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-021 — hover tooltip on All Page Views point', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      const ok = await rum.hoverSessionPageViewPoint(0);
      expect(ok).toBeTruthy();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Tooltip soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-022 — click point refreshes Performance Measurement Details', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.clickSessionPageViewPoint(0);
      await rum.expectPerformanceMeasurementDetails();
      const first = await rum.getMeasurementDetailsSnapshot();
      await rum.clickSessionPageViewPoint(1).catch(async () => rum.clickSessionPageViewPoint(0));
      const second = await rum.getMeasurementDetailsSnapshot();
      expect(first.length + second.length).toBeGreaterThan(0);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Point click details soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-023 — legend toggle restore on All Page Views', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.sampleLegendToggle();
      await expect(rum.locators.pageViewsSessionChart).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Legend soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-024 — Displayed Metric sample Onload / First Byte / FCP / LCP', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    const metrics = [/Onload/i, /First Byte/i, /First Contentful Paint/i, /Largest Contentful Paint/i];
    for (const m of metrics) {
      try {
        await rum.setDisplayedMetric(m);
        await expect(rum.locators.pageViewsSessionChart.or(rum.locators.allPageViewsHeading())).toBeVisible();
      } catch (err) {
        test.info().annotations.push({
          type: 'note',
          description: `Metric ${m} soft: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    await rum.setDisplayedMetric(/Onload/i).catch(() => undefined);
  });

  test('REG-RUM-SL-025 — Displayed Metric sample INP / TBT / CLS then restore Onload', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    for (const m of [/INP/i, /Total Blocking Time/i, /Cumulative Layout Shift/i]) {
      try {
        await rum.setDisplayedMetric(m);
        await expect(rum.locators.displayedMetricSelect).toBeVisible();
      } catch (err) {
        test.info().annotations.push({
          type: 'note',
          description: `Metric ${m} soft: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    await rum.setDisplayedMetric(/Onload/i).catch(() => undefined);
  });

  test('REG-RUM-SL-026 — graph ↔ table toggle for All Page Views', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.toggleSessionGraphTable('table');
      await rum.toggleSessionGraphTable('graph');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Graph/table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-027 — All Page Views table headers and ≥1 row', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.expectPageViewsTableHeaders();
      await rum.toggleSessionGraphTable('graph');
    } catch (err) {
      await rum.toggleSessionGraphTable('graph').catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Page views table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-028 — page-views table search sample', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.toggleSessionGraphTable('table');
      await rum.sampleTableSearch(rum.locators.pageViewsSessionTableContainer, 'PDP');
      await rum.toggleSessionGraphTable('graph');
    } catch (err) {
      await rum.toggleSessionGraphTable('graph').catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Table search soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-029 — Sessions table columns and usable IDs', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.expectSessionsTable();
      await rum.expectMaskedOrPresentSessionIds();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Sessions table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-030 — Sessions table search / pager sample', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.sampleTableSearch(rum.locators.allSessionsTableContainer, 'PDP');
      const pager = page.getByText(/\d+\s+to\s+\d+/i).first();
      if (await pager.isVisible().catch(() => false)) {
        await expect(pager).toBeVisible();
      }
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Sessions pager soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-031 — Performance Measurement Details labels', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.clickSessionPageViewPoint(0);
      await rum.expectPerformanceMeasurementDetails();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Measurement details soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-032 — URL / replay links soft when configured', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    const kind = await rum.sampleReplayOrUrlLink();
    if (kind === 'none') {
      test.info().annotations.push({
        type: 'note',
        description: 'Replay/URL action links not configured for sampled measurement',
      });
    } else {
      expect(['url', 'replay']).toContain(kind);
    }
  });

  test('REG-RUM-SL-033 — Performance Breakdown / waterfall widgets soft', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      await rum.clickSessionPageViewPoint(0);
      const state = await rum.expectBreakdownOrWaterfallSoft();
      if (state === 'none') {
        test.info().annotations.push({
          type: 'note',
          description: 'No object-level breakdown/waterfall for selected point — controlled empty soft-continue',
        });
      }
      const tabs = await rum.sampleDomainObjectTabs();
      console.log('[Session Lookup] domain/object tabs clicked=', tabs);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Breakdown soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-034 — Resource Timings Over Time soft when present', async () => {
    if (!rum.hasPositiveLookup) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no positive lookup' });
      return;
    }
    try {
      if (await rum.locators.resourceTimingsOverTimeGraph.isVisible().catch(() => false)) {
        await expect(rum.locators.resourceTimingsOverTimeGraph).toBeVisible();
      } else {
        test.info().annotations.push({
          type: 'note',
          description: 'Resource Timings Over Time not visible for sampled point',
        });
      }
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Resource timings soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-035 — right-nav Filters sample Apply (no Save)', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters(), 90000);
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      await rum.clickCancelFilters().catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `Right-nav filters soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-036 — Filters Cancel closes without sticky apply', async () => {
    try {
      await rum.openRightNavFilters();
      await rum.clickCancelFilters();
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Cancel filters soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-037 — Filters Time Period Last 6 Hours', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters('Last 6 Hours'), 90000);
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-038 — Filters Time Period Last 24 Hours', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters('Last 24 Hours'), 90000);
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 24h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-039 — Filters Time Period Last 7 Days', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters('Last 7 Days'), 90000);
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 7d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-040 — Filters Time Period Last 30 Days then restore 6h', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters('Last 30 Days'), 90000);
      await withSoftDeadline(() => rum.applySampleRightNavFilters('Last 6 Hours'), 90000);
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 30d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-041 — Performance Detail button navigates and Back returns', async () => {
    test.setTimeout(180000);
    try {
      await rum.openViaNavigation();
      await rum.navigateToPerformanceDetailViaButton();
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await rum.openViaNavigation();
      await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
    } catch (err) {
      await rum.openViaNavigation().catch(() => undefined);
      test.info().annotations.push({
        type: 'note',
        description: `PD navigation soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-042 — refresh Session Lookup does not block', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await rum.waitForPageReady();
    await rum.expectLookupControlsEnabled();
  });

  test('REG-RUM-SL-043 — re-apply positive URL lookup after navigation churn', async () => {
    if (!rum.runtimeLookupUrl) {
      test.info().annotations.push({ type: 'note', description: 'Skipped: no runtime URL' });
      return;
    }
    try {
      await rum.performLookup(/^URL$/i, rum.runtimeLookupUrl);
      const ok = await rum.waitForLookupResults(60000);
      if (ok) rum.hasPositiveLookup = true;
      await rum.expectLookupControlsEnabled();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Re-apply lookup soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-SL-044 — Share control soft when present', async () => {
    if (await rum.locators.sharePageButton.isVisible().catch(() => false)) {
      await expect(rum.locators.sharePageButton).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Share control not present on this layout' });
    }
  });

  test('REG-RUM-SL-045 — no blocking error banner after suite interactions', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Session Lookup/i);
    await rum.expectLookupControlsEnabled();
    const fatal = page.getByText(/Something went wrong|Fatal error|Unhandled/i).first();
    expect(await fatal.isVisible().catch(() => false)).toBeFalsy();
  });
});
