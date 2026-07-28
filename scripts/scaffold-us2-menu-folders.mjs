/**
 * Create tests/regression_tests/US2/<menu-path> folders from config/portalMenuTree.json
 * and relocate existing US2 regression specs into their menu folders.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const US2 = path.join(ROOT, 'tests', 'regression_tests', 'US2');
const treePath = path.join(ROOT, 'config', 'portalMenuTree.json');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  const data = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  const allPaths = [...new Set([...(data.sectionPaths || []), ...(data.folderPaths || [])])].sort();

  for (const rel of allPaths) {
    ensureDir(path.join(US2, ...rel.split('/')));
  }
  console.log(`Created/ensured ${allPaths.length} US2 menu folders`);

  const moves = [
    {
      from: path.join(US2, 'rum.performance-detail.browser.regression.spec.ts'),
      to: path.join(
        US2,
        'monitoring',
        'real-user-browser',
        'performance-detail',
        'rum.performance-detail.browser.regression.spec.ts'
      ),
      depthFromUs2: 3,
    },
    {
      from: path.join(US2, 'revenue.opportunity.regression.spec.ts'),
      to: path.join(
        US2,
        'business-insights',
        'improve-conversion',
        'revenue-opportunity',
        'revenue.opportunity.regression.spec.ts'
      ),
      depthFromUs2: 3,
    },
  ];

  for (const m of moves) {
    if (!fs.existsSync(m.from) && fs.existsSync(m.to)) {
      console.log(`Already moved: ${path.relative(ROOT, m.to)}`);
      continue;
    }
    if (!fs.existsSync(m.from)) {
      console.warn(`Missing source: ${m.from}`);
      continue;
    }
    ensureDir(path.dirname(m.to));
    fs.renameSync(m.from, m.to);
    console.log(`Moved → ${path.relative(ROOT, m.to)}`);
  }

  // Write a small index map for humans/CI
  const index = {
    generatedFrom: 'config/portalMenuTree.json',
    scrapedAt: data.scrapedAt,
    regressionSpecs: {
      rumPerformanceDetailBrowser:
        'monitoring/real-user-browser/performance-detail/rum.performance-detail.browser.regression.spec.ts',
      revenueOpportunity:
        'business-insights/improve-conversion/revenue-opportunity/revenue.opportunity.regression.spec.ts',
    },
    folderCount: allPaths.length,
  };
  fs.writeFileSync(path.join(US2, 'menu-folder-index.json'), JSON.stringify(index, null, 2));
  console.log('Wrote tests/regression_tests/US2/menu-folder-index.json');
}

main();
