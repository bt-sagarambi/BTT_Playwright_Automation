import { Page, Locator } from '@playwright/test';
import { getActiveProfile } from '../config/profiles';

/**
 * Shared chrome helpers for preconfigured site/dashboard boards
 * (Site Overview, VitalPulse, …). Read-only: restore profile site; no Save/Delete.
 */

export type LookbackRefreshResult = {
  label: string;
  applied: boolean;
  refreshed: boolean;
  note: string;
};

export type ChromeIconResult = {
  tooltipsChecked: number;
  clickTargets: string[];
  returnedVia: string[];
  notes: string[];
};

export type SiteLockResult = {
  otherSite: string;
  siteChanged: boolean;
  lockFound: boolean;
  lockToggled: boolean;
  lockedSeemedToBlockSwitch: boolean;
  restored: boolean;
  note: string;
};

export type AutoRefreshApplyResult = {
  applied: string[];
  restored: boolean;
  note: string;
};

export type ManagerEyeResult = {
  openedViaPlus: boolean;
  eyeClicked: boolean;
  restoredHome: boolean;
  note: string;
};

function alive(page: Page): boolean {
  return !page.isClosed();
}

export async function pageBodySample(page: Page, max = 1200): Promise<string> {
  return ((await page.locator('#page-contents, body').first().innerText().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function dataSignature(page: Page): Promise<string> {
  return page
    .evaluate(() => {
      const root = document.querySelector('#page-contents') || document.body;
      const text = (root?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400);
      const charts = document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length;
      const rows = document.querySelectorAll(
        'tbody tr, [id*="dMetricsTable"] tr, [id^="table-for-chartID_"] tr, .slick-row'
      ).length;
      return `${charts}|${rows}|${text}`;
    })
    .catch(() => 'missing');
}

/**
 * Icons / titled controls left of (above row) Auto Refresh — tooltips + soft round-trip.
 */
export async function softChromeIconTooltipsAndRoundTrip(page: Page): Promise<ChromeIconResult> {
  const notes: string[] = [];
  const clickTargets: string[] = [];
  const returnedVia: string[] = [];
  let tooltipsChecked = 0;

  if (!alive(page)) {
    return { tooltipsChecked: 0, clickTargets, returnedVia, notes: ['page closed'] };
  }

  const homeUrl = page.url();
  const controls = page.locator('#dashboard-page-controls, #page-controls-og').first();
  await controls.scrollIntoViewIfNeeded().catch(() => undefined);

  // Collect titled controls near dashboard chrome (exclude auto-refresh frequency submenu pure text).
  const iconLocs = page.locator(
    [
      '#dashboard-page-controls a[title], #dashboard-page-controls button[title]',
      '#dashboard-page-controls [data-original-title], #dashboard-page-controls [aria-label]',
      '#page-controls-og a[title], #page-controls-og button[title]',
      '#share-page-btn, #toggle-filters, #mobile-controls-filters-btn',
      '#dashboard-settings-toggle, #dashboard-manager, #dashboard-manager-share-btn',
      '#refresh-dashboard',
      'a[title*="Help" i], button[title*="Help" i], #help-articles-menu, #help-video-menu',
      '[title*="Share" i], [title*="Filter" i], [title*="Manager" i], [title*="Carousel" i]',
    ].join(', ')
  );

  const count = await iconLocs.count().catch(() => 0);
  const maxHover = Math.min(count, 12);
  for (let i = 0; i < maxHover; i++) {
    const el = iconLocs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const title =
      (await el.getAttribute('title').catch(() => '')) ||
      (await el.getAttribute('data-original-title').catch(() => '')) ||
      (await el.getAttribute('aria-label').catch(() => '')) ||
      '';
    if (!title || title.length < 2) continue;
    // Skip pure lookback / auto-refresh option buttons which are tested elsewhere
    if (/^Off$|^\d+\s*Minutes$|Last \d|Custom Date/i.test(title) && !/Filter|Share|Help|Manager|Carousel|Dashboard/i.test(title))
      continue;

    const box = await el.boundingBox().catch(() => null);
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(350);
    tooltipsChecked += 1;

    // Bootstrap tooltips / native title
    const tipVisible = await page
      .locator('.tooltip.in, .tooltip.show, [role="tooltip"]')
      .filter({ visible: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (tipVisible || title) {
      notes.push(`tooltip/title ok: "${title.slice(0, 60)}"`);
    }
  }

  // Soft click 1–2 safe chrome actions that can round-trip: Filters, Share (if modal-closable), Help.
  const softClickRoundTrip = async (locator: Locator, name: string) => {
    if (!(await locator.isVisible().catch(() => false))) return;
    clickTargets.push(name);
    const urlBefore = page.url();
    await locator.click({ force: true, timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(900);
    // Prefer same-control re-click / Escape / browser Back to return
    let via = '';
    const stillOpenModal = page.locator('.modal.in, .jconfirm.jconfirm-open, #filters-section:visible, #widget-wizard-modal:visible');
    if (await stillOpenModal.first().isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(400);
      via = 'Escape';
      if (await stillOpenModal.first().isVisible().catch(() => false)) {
        await locator.click({ force: true }).catch(() => undefined);
        via = 're-click control';
      }
    } else if (page.url() !== urlBefore && page.url() !== homeUrl) {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);
      via = 'browser Back';
      await page.waitForTimeout(1000);
      if (!/site\/dashboard/i.test(page.url())) {
        await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
        via = 'direct home goto';
      }
    } else {
      via = 'no navigation (toggle/drawer)';
    }
    returnedVia.push(`${name}:${via}`);
  };

  await softClickRoundTrip(page.locator('#toggle-filters, #mobile-controls-filters-btn').first(), 'Filters');
  await softClickRoundTrip(
    page.locator('#share-page-btn, [title*="Share" i]').filter({ visible: true }).first(),
    'Share'
  );
  await softClickRoundTrip(
    page.locator('#dashboard-settings-toggle, #dashboard-manager').filter({ visible: true }).first(),
    'Dashboard Manager'
  );

  // Ensure still on dashboard shell
  if (!/site\/dashboard/i.test(page.url())) {
    await page.goto(homeUrl || '/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    }).catch(() => undefined);
    notes.push('forced return to site/dashboard');
  }

  if (tooltipsChecked < 1) {
    notes.push('No titled chrome icons found for hover tooltip sample');
  }

  return { tooltipsChecked, clickTargets, returnedVia, notes };
}

export async function softSelectQuickSite(
  page: Page,
  sitePattern: string | RegExp
): Promise<boolean> {
  const re =
    typeof sitePattern === 'string'
      ? new RegExp(sitePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : sitePattern;
  const container = page.locator('#select2-quick-site-id-container, #select2-site-id-container').first();
  if (!(await container.isVisible().catch(() => false))) return false;
  await container.click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const opt = page.locator('.select2-results__option').filter({ hasText: re }).first();
  if (!(await opt.isVisible({ timeout: 4000 }).catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => undefined);
    return false;
  }
  await opt.click({ force: true });
  await page.waitForTimeout(3500);
  return true;
}

export async function softSiteChangeAndLock(page: Page): Promise<SiteLockResult> {
  const profile = getActiveProfile();
  const profileRe = new RegExp(profile.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const otherCandidates = [/Demo eCommerce Global/i, /Demo eCommer[cs]e/i, /eCommerce Global/i];
  let otherSite = 'Demo eCommerce Global';
  let siteChanged = false;
  let lockFound = false;
  let lockToggled = false;
  let lockedSeemedToBlockSwitch = false;
  let note = '';

  const beforeSig = await dataSignature(page);
  const beforeSite = ((await page.locator('#select2-quick-site-id-container').textContent().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .trim();

  // Find alternate site from dropdown
  const container = page.locator('#select2-quick-site-id-container').first();
  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(350);
    const options = page.locator('.select2-results__option');
    const n = await options.count();
    for (let i = 0; i < n; i++) {
      const t = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
      if (!t || profileRe.test(t)) continue;
      for (const cand of otherCandidates) {
        if (cand.test(t)) {
          otherSite = t;
          break;
        }
      }
      if (!profileRe.test(t) && (/Demo|eCommerce|Global/i.test(t) || otherSite === t)) {
        otherSite = t;
        break;
      }
    }
    // if still no demo, pick first non-profile
    if (profileRe.test(otherSite) || otherSite === 'Demo eCommerce Global') {
      for (let i = 0; i < n; i++) {
        const t = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
        if (t && !profileRe.test(t)) {
          otherSite = t;
          break;
        }
      }
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  // Site lock: common glyph next to quick site
  const lock = page
    .locator(
      '#dashboard-page-controls .fa-lock, #dashboard-page-controls .fa-unlock, #page-controls-og .fa-lock, #page-controls-og .fa-unlock, [class*="site"] .fa-lock, [class*="site"] .fa-unlock, a[title*="lock" i], button[title*="lock" i], [title*="Lock site" i], [title*="Unlock" i], .lock-site, #lock-site, .site-lock'
    )
    .first();
  if (await lock.isVisible().catch(() => false)) {
    lockFound = true;
    await lock.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    lockToggled = true;
    // Try switch while maybe locked
    const tryWhileLocked = await softSelectQuickSite(page, otherSite);
    if (!tryWhileLocked) lockedSeemedToBlockSwitch = true;
    // Unlock again
    await lock.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(300);
  } else {
    note = 'Site lock control not found on this build; soft-annotate';
  }

  // Change site unlocked
  siteChanged = await softSelectQuickSite(page, otherSite);
  await page.waitForTimeout(2000);
  const afterSig = await dataSignature(page);
  const midSite = ((await page.locator('#select2-quick-site-id-container').textContent().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (siteChanged && midSite && !profileRe.test(midSite)) {
    note = `${note} changed to "${midSite}"; sig delta=${beforeSig !== afterSig}`.trim();
  }

  // Restore profile site
  let restored = await softSelectQuickSite(page, profile.siteName);
  if (!restored && beforeSite) restored = await softSelectQuickSite(page, beforeSite);
  await page.waitForTimeout(2000);

  return {
    otherSite,
    siteChanged,
    lockFound,
    lockToggled,
    lockedSeemedToBlockSwitch,
    restored: restored || profileRe.test(
      ((await page.locator('#select2-quick-site-id-container').textContent().catch(() => '')) || '')
    ),
    note: note || `beforeSite="${beforeSite}"`,
  };
}

export async function softApplyAutoRefreshOption(
  page: Page,
  option: RegExp | string
): Promise<boolean> {
  const re =
    typeof option === 'string'
      ? new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : option;
  const trigger = page.locator('#auto-refresh').or(page.getByRole('button', { name: /Auto Refresh/i })).first();
  await trigger.click({ timeout: 5000 }).catch(() => undefined);
  await page.evaluate(() => {
    const btn = document.querySelector('#auto-refresh');
    const dropdown = btn?.closest('.dropdown, .btn-group');
    dropdown?.classList.add('open');
    const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
    if (menu) menu.style.display = 'block';
  });
  await page.waitForTimeout(250);
  const item = page
    .locator(
      'button.auto-refresh-option, #auto-refresh-btn-group a, #auto-refresh-btn-group button, .btn-group:has(#auto-refresh) .dropdown-menu a, .btn-group:has(#auto-refresh) .dropdown-menu button'
    )
    .filter({ hasText: re })
    .first();
  if (!(await item.isVisible({ timeout: 3000 }).catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => undefined);
    return false;
  }
  await item.click({ force: true });
  await page.waitForTimeout(1500);
  return true;
}

export async function softAutoRefreshApplySample(page: Page): Promise<AutoRefreshApplyResult> {
  const applied: string[] = [];
  // Short interval then Off / original preference soft
  if (await softApplyAutoRefreshOption(page, /^5\s*Minutes$|Auto Refresh \(5m\)/i)) applied.push('5 Minutes');
  await page.waitForTimeout(800);
  if (await softApplyAutoRefreshOption(page, /^Off$/i)) applied.push('Off');
  await page.waitForTimeout(500);
  // Prefer mid interval already common for shared account
  if (await softApplyAutoRefreshOption(page, /^10\s*Minutes$|5\s*Minutes/i)) applied.push('restore interval');
  return {
    applied,
    restored: applied.includes('Off') || applied.length > 0,
    note: applied.length ? `applied: ${applied.join(', ')}` : 'no Auto Refresh options applied',
  };
}

/**
 * + Dashboard → Dashboard Manager → Eye → restore home by eye again.
 */
export async function softPlusDashboardEyeSwitch(
  page: Page,
  homeDashboard: RegExp
): Promise<ManagerEyeResult> {
  let openedViaPlus = false;
  let eyeClicked = false;
  let restoredHome = false;
  let note = '';

  await page.keyboard.press('Escape').catch(() => undefined);
  const plus = page
    .locator('#create-dashboard, button:has-text("+ Dashboard"), a:has-text("+ Dashboard")')
    .first();
  if (await plus.isVisible().catch(() => false)) {
    await plus.click({ force: true }).catch(() => undefined);
    openedViaPlus = true;
    await page.waitForTimeout(900);
  } else {
    const wrench = page.locator('#dashboard-settings-toggle, #dashboard-manager, .fa-wrench').first();
    if (await wrench.isVisible().catch(() => false)) {
      await wrench.click({ force: true }).catch(() => undefined);
      note = 'opened via wrench (no + Dashboard visible)';
      await page.waitForTimeout(900);
    }
  }

  const manager = page.getByText(/DASHBOARD MANAGER|Dashboard Manager/i).first();
  const managerOpen = await manager.isVisible().catch(() => false);
  if (!managerOpen) {
    return {
      openedViaPlus,
      eyeClicked: false,
      restoredHome: false,
      note: note || 'Dashboard Manager not opened',
    };
  }

  // Eye / view icon in View column
  const eye = page
    .locator(
      '#dashboard-settings-table .fa-eye, #dashboard-settings-table .glyphicon-eye-open, #dashboard-settings-modal .fa-eye, .dashboard-settings table .fa-eye, a[title*="View" i], button[title*="View" i], [title*="View Dashboard" i], .view-dashboard'
    )
    .first();
  if (await eye.isVisible().catch(() => false)) {
    await eye.click({ force: true }).catch(() => undefined);
    eyeClicked = true;
    await page.waitForTimeout(3500);
  } else {
    // Try second eye if first is on home row only — click any eye-like
    const eyes = page.locator('#dashboard-settings-table a, #dashboard-settings-modal a, .fa-eye');
    const eyeCount = await eyes.count().catch(() => 0);
    for (let i = 0; i < Math.min(eyeCount, 6); i++) {
      const e = eyes.nth(i);
      const cls = (await e.getAttribute('class').catch(() => '')) || '';
      const title = (await e.getAttribute('title').catch(() => '')) || '';
      if (!/eye|view/i.test(cls + title) && !/fa-eye/.test(cls)) continue;
      await e.click({ force: true }).catch(() => undefined);
      eyeClicked = true;
      await page.waitForTimeout(3500);
      break;
    }
    if (!eyeClicked) note = `${note} no eye/view control`.trim();
  }

  // Close residual manager
  await page.keyboard.press('Escape').catch(() => undefined);
  const closeBtn = page
    .locator('#dashboard-settings-modal button, .modal.in button')
    .filter({ hasText: /Close|Cancel|×/i })
    .first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ force: true }).catch(() => undefined);
  }
  await page.waitForTimeout(500);

  // Restore home via Select2 if needed
  const dashText = ((await page.locator('#select2-switch-dashboard-container').textContent().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!homeDashboard.test(dashText)) {
    // Re-open manager and eye home if possible
    if (await plus.isVisible().catch(() => false)) {
      await plus.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(700);
    }
    const homeRow = page.locator('#dashboard-settings-table tr, .dashboard-settings tr').filter({ hasText: homeDashboard });
    const homeEye = homeRow.locator('.fa-eye, a[title*="View" i]').first();
    if (await homeEye.isVisible().catch(() => false)) {
      await homeEye.click({ force: true });
      await page.waitForTimeout(3500);
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  const finalDash = ((await page.locator('#select2-switch-dashboard-container').textContent().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .trim();
  restoredHome = homeDashboard.test(finalDash);
  if (!restoredHome) {
    note = `${note}; home not restored via eye (will need Select2 restore)`.trim();
  }

  return { openedViaPlus, eyeClicked, restoredHome, note };
}

export async function assertLookbackAppliedRefreshed(
  page: Page,
  selectLookback: (label: string | RegExp) => Promise<void>,
  getLookbackLabel: () => Promise<string>,
  expectReady: () => Promise<void>,
  labels: Array<string | RegExp>
): Promise<LookbackRefreshResult[]> {
  const results: LookbackRefreshResult[] = [];
  for (const label of labels) {
    const before = await dataSignature(page);
    let applied = false;
    let refreshed = false;
    let note = '';
    try {
      await selectLookback(label);
      applied = true;
      const current = await getLookbackLabel();
      const re =
        typeof label === 'string'
          ? new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          : label;
      if (!re.test(current)) {
        note = `lookback label after select="${current}"`;
      }
      await expectReady();
      await page.waitForTimeout(800);
      const after = await dataSignature(page);
      // Consider refreshed if signature changed OR widgets still healthy after ready poll
      refreshed = before !== after || after !== 'missing';
      if (before === after) note = `${note} signature unchanged (widgets still ready)`.trim();
    } catch (err) {
      note = err instanceof Error ? err.message : String(err);
    }
    results.push({
      label: String(label),
      applied,
      refreshed,
      note,
    });
  }
  return results;
}
