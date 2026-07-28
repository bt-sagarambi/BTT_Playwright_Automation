/**
 * Login → open nav → View Full Menu → expand → dump nested menu tree.
 * Writes config/portalMenuTree.json for US2 folder scaffolding.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

function loadCredentials() {
  const text = fs.readFileSync(path.join(process.cwd(), 'config', 'env.local.ts'), 'utf8');
  const username = (text.match(/username:\s*'([^']+)'/) || [])[1];
  const password = (text.match(/password:\s*'([^']+)'/) || [])[1];
  if (!username || !password) throw new Error('Missing credentials in config/env.local.ts');
  return { username, password };
}

export function slug(label) {
  return String(label || '')
    .replace(/&amp;/gi, ' and ')
    .replace(/&/g, ' and ')
    .replace(/[\/\\:?*"<>|]+/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'untitled';
}

async function main() {
  const { username, password } = loadCredentials();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const base = 'https://portal.bluetriangle.com';

  await page.goto(`${base}/btportal/web/index.php?r=site/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#loginform-username').fill(username);
  await page.locator('#loginform-password').fill(password);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u) => !/site\/login|site%2Flogin/i.test(u.toString()), { timeout: 60000 });
  await page.goto(`${base}/btportal/web/index.php?r=overview-dashboard/overview`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2500);

  await page.locator('#toggle-navigation').click();
  await page.waitForTimeout(600);
  const fullBtn = page.locator('#toggle-menu-state-btn');
  await fullBtn.waitFor({ state: 'visible', timeout: 15000 });
  if (/view full menu/i.test(((await fullBtn.textContent()) || '').trim())) {
    await fullBtn.click();
    await page.waitForTimeout(1500);
  }

  // Expand parents / sub-menu-parents that contain nested ULs
  for (let pass = 0; pass < 15; pass++) {
    const headers = page.locator(
      '#site-navigation-plus li.parent > span.r-p, #site-navigation-plus li.parent > a, #site-navigation-plus li.sub-menu-parent > a, #site-navigation-plus li.sub-menu-parent > span'
    );
    const n = await headers.count();
    let clicks = 0;
    for (let i = 0; i < n; i++) {
      const h = headers.nth(i);
      const already = await h
        .evaluate((el) => /\bopen\b|\bin\b|current-tab-parent/.test(el.closest('li')?.className || ''))
        .catch(() => false);
      if (already) continue;
      await h.click({ force: true }).catch(() => undefined);
      clicks++;
      await page.waitForTimeout(40);
    }
    if (!clicks) break;
  }

  const payload = await page.evaluate(() => {
    function decode(s) {
      return (s || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }
    function clean(s) {
      return decode(s)
        .replace(/^[^\p{L}\p{N}(]+/u, '')
        .trim();
    }

    function labelFor(li) {
      const title =
        li.getAttribute('data-original-title') ||
        li.querySelector(':scope > a')?.getAttribute('data-original-title') ||
        li.querySelector(':scope > a .site-nav-title, :scope > span.site-nav-title, :scope > .site-nav-title')
          ?.textContent ||
        li.querySelector(':scope > a')?.textContent ||
        li.querySelector(':scope > span.r-p')?.textContent ||
        '';
      return clean(title);
    }

    function walk(ul, depth) {
      if (!ul || depth > 12) return [];
      const items = [];
      for (const node of [...ul.childNodes]) {
        if (node.nodeType !== 1) continue;
        const el = /** @type {HTMLElement} */ (node);
        if (el.tagName !== 'LI') continue;
        const cls = el.className?.toString() || '';
        if (/user-menu-header/i.test(el.id || '')) continue;

        const label = labelFor(el);
        if (!label || /favorite|unfavorite|clear search|view full menu|collapse menu/i.test(label)) continue;

        const a = el.querySelector(':scope > a');
        const href = a?.getAttribute('href') || null;
        const childUl =
          [...el.children].find((c) => c.tagName === 'UL') ||
          el.querySelector(':scope > ul') ||
          el.querySelector(':scope > .sub-menu > ul') ||
          el.querySelector(':scope > span.r-p + ul, :scope > div > ul');

        const children = childUl ? walk(childUl, depth + 1) : [];
        const isSection = /\bparent\b|\bsub-menu-parent\b/.test(cls) || children.length > 0;
        items.push({
          label,
          menuId: el.getAttribute('data-menu-id') || null,
          href: href && /r=/.test(href) && !/create=true/i.test(href) ? href : null,
          children,
          isSection,
        });
      }
      return items;
    }

    const root = document.querySelector('#site-navigation-plus');
    if (!root) return { error: 'missing #site-navigation-plus' };

    // Top-level list: prefer ULs that contain li.parent
    let bestUl = null;
    let bestScore = -1;
    for (const ul of root.querySelectorAll('ul')) {
      const score = ul.querySelectorAll(':scope > li.parent, :scope > li.sub-menu-parent').length;
      if (score > bestScore) {
        bestScore = score;
        bestUl = ul;
      }
    }
    if (!bestUl) bestUl = root.querySelector('ul');

    const tree = walk(bestUl, 0);

    // Deduplicate identical top-level sections (portal sometimes duplicates)
    const seen = new Set();
    const deduped = [];
    for (const n of tree) {
      const key = n.menuId || n.label;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(n);
    }

    const leaves = [];
    function collect(nodes, trail) {
      for (const n of nodes) {
        const next = [...trail, n.label];
        if (n.children?.length) collect(n.children, next);
        else leaves.push({ path: next, href: n.href, menuId: n.menuId });
      }
    }
    collect(deduped, []);

    return { bestScore, tree: deduped, leaves };
  });

  function slugPath(parts) {
    return parts.map(slug).join('/');
  }

  const folderPaths = [...new Set((payload.leaves || []).map((l) => slugPath(l.path)))].sort();
  const sectionPaths = [];
  function collectSections(nodes, trail) {
    for (const n of nodes || []) {
      const next = [...trail, n.label];
      if (n.children?.length) {
        sectionPaths.push(slugPath(next));
        collectSections(n.children, next);
      }
    }
  }
  collectSections(payload.tree, []);

  const out = {
    scrapedAt: new Date().toISOString(),
    tree: payload.tree,
    leaves: payload.leaves,
    folderPaths,
    sectionPaths: [...new Set(sectionPaths)].sort(),
  };
  fs.writeFileSync(path.join(process.cwd(), 'config', 'portalMenuTree.json'), JSON.stringify(out, null, 2));

  console.log(`Top-level sections: ${out.tree.length}`);
  for (const t of out.tree) console.log(` - ${t.label} (${t.children.length})`);
  console.log(`Leaves: ${out.leaves.length}`);
  for (const l of out.leaves) {
    const leaf = l.path[l.path.length - 1];
    if (/performance detail|revenue opportunity/i.test(leaf)) {
      console.log(`TARGET: ${l.path.join(' > ')}`);
      console.log(`  folder: ${slugPath(l.path)}`);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
