/**
 * Parse config/site-navigation-plus.html (or scrape fresh) into portalMenuTree.json
 * and create tests/regression_tests/US2/<menu path> folders.
 */
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

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

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(s) {
  return decode(s)
    .replace(/^[^\p{L}\p{N}(]+/u, '')
    .trim();
}

/** Minimal HTML → tree using regex + stack (good enough for portal nav) */
function parseNavHtml(html) {
  // Work only inside the main menu list if possible
  const root = html;

  // Tokenize LIs with their opening tags and detect nested UL depth via a simple stack walk
  // Use linkedom-less approach: cheerio not installed — use recursive regex on <li>...</li> is hard.
  // Instead: use JSDOM from playwright's page.setContent.

  return null;
}

async function parseWithPlaywright(html) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body><nav id="site-navigation-plus">${html}</nav></body></html>`, {
    waitUntil: 'domcontentloaded',
  });

  const payload = await page.evaluate(() => {
    function decode(s) {
      return (s || '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }
    function clean(s) {
      return decode(s)
        .replace(/^[^\p{L}\p{N}(]+/u, '')
        .trim();
    }
    function labelFor(li) {
      if (/\bsub-menu-header\b/.test(li.className?.toString() || '')) return '';
      // Prefer visible nav title for leaves; fall back to tooltip / section text
      const title =
        li.querySelector(':scope > a .site-nav-title, :scope > span.site-nav-title')?.textContent ||
        li.getAttribute('data-original-title') ||
        li.querySelector(':scope > a')?.getAttribute('data-original-title') ||
        li.querySelector(':scope > span.r-p > span:not(.menu-short)')?.textContent ||
        li.querySelector(':scope > span.r-p')?.textContent ||
        li.querySelector(':scope > span')?.textContent ||
        li.querySelector(':scope > a')?.textContent ||
        '';
      return clean(title);
    }
    function walk(ul, depth) {
      if (!ul || depth > 12) return [];
      const items = [];
      for (const el of [...ul.children]) {
        if (el.tagName !== 'LI') continue;
        const cls = el.className?.toString() || '';
        if (/\bsub-menu-header\b/.test(cls)) continue;
        const label = labelFor(el);
        if (!label || /favorite|unfavorite|clear search|view full menu|collapse menu/i.test(label)) continue;
        const a = el.querySelector(':scope > a');
        const href = a?.getAttribute('href') || null;
        const childUl =
          [...el.children].find((c) => c.tagName === 'UL') ||
          el.querySelector(':scope > ul');
        const children = childUl ? walk(childUl, depth + 1) : [];
        items.push({
          label,
          menuId: el.getAttribute('data-menu-id'),
          href: href && /r=/.test(href) && !/create=true/i.test(href) ? href : null,
          children,
          isSection: /\bparent\b|\bsub-menu-parent\b/.test(cls) || children.length > 0,
        });
      }
      return items;
    }

    const root = document.querySelector('#site-navigation-plus');
    // Prefer the UL whose direct children include li.parent (main product menu)
    let bestUl = null;
    let bestScore = -1;
    for (const ul of root.querySelectorAll('ul')) {
      const parentScore = ul.querySelectorAll(':scope > li.parent').length;
      if (parentScore > bestScore) {
        bestScore = parentScore;
        bestUl = ul;
      }
    }
    if (!bestUl || bestScore <= 0) {
      // fallback: largest UL
      for (const ul of root.querySelectorAll('ul')) {
        const score = ul.children.length;
        if (score > bestScore) {
          bestScore = score;
          bestUl = ul;
        }
      }
    }
    const treeRaw = walk(bestUl, 0);
    const seen = new Set();
    const tree = [];
    for (const n of treeRaw) {
      const key = n.menuId || n.label;
      if (seen.has(key)) continue;
      seen.add(key);
      tree.push(n);
    }
    const leaves = [];
    (function collect(nodes, trail) {
      for (const n of nodes) {
        const next = [...trail, n.label];
        if (n.children?.length) collect(n.children, next);
        else leaves.push({ path: next, href: n.href, menuId: n.menuId });
      }
    })(tree, []);
    return { bestScore, tree, leaves };
  });

  await browser.close();
  return payload;
}

async function ensureHtml() {
  const htmlPath = path.join(process.cwd(), 'config', 'site-navigation-plus.html');
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).size > 10000) {
    return fs.readFileSync(htmlPath, 'utf8');
  }
  throw new Error('Missing config/site-navigation-plus.html — run a fresh scrape first');
}

async function main() {
  const html = await ensureHtml();
  const payload = await parseWithPlaywright(html);

  function slugPath(parts) {
    return parts.map(slug).join('/');
  }

  const folderPaths = [...new Set(payload.leaves.map((l) => slugPath(l.path)))].sort();
  const sectionPaths = [];
  (function collectSections(nodes, trail) {
    for (const n of nodes) {
      const next = [...trail, n.label];
      if (n.children?.length) {
        sectionPaths.push(slugPath(next));
        collectSections(n.children, next);
      } else {
        // leaf folder path also created
      }
    }
  })(payload.tree, []);

  const out = {
    scrapedAt: new Date().toISOString(),
    source: 'config/site-navigation-plus.html',
    tree: payload.tree,
    leaves: payload.leaves,
    folderPaths,
    sectionPaths: [...new Set(sectionPaths)].sort(),
  };
  fs.writeFileSync(path.join(process.cwd(), 'config', 'portalMenuTree.json'), JSON.stringify(out, null, 2));

  console.log(`Top-level: ${out.tree.length}`);
  for (const t of out.tree) console.log(` - ${t.label} (${t.children.length})`);
  console.log(`Leaves: ${out.leaves.length}`);
  for (const l of out.leaves) {
    if (/performance detail|revenue opportunity/i.test(l.path.at(-1) || '')) {
      console.log(`TARGET: ${l.path.join(' > ')} => ${slugPath(l.path)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
