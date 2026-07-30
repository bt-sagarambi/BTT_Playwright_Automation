import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

const base = 'D:/Project_Work/BlueTriangle/AI Agents/US2/monitoring/real-user-browser';

const docs = [
  {
    folder: 'bounce-and-exit-analysis',
    pdfName: 'The RUM Bounce and Exit Analysis Page - Blue Triangle Help Center.pdf',
    title: 'The RUM Bounce and Exit Analysis Page',
    url: 'https://help.bluetriangle.com/hc/en-us/articles/360033775293-The-RUM-Bounce-and-Exit-Analysis-Page',
    sections: [
      ['Overview', 'The Bounce & Exit Analysis page helps quantify the impact page load time has on your customer’s experience.'],
      [
        'How to Find the Bounce and Exit Analysis Page',
        'To find the RUM Bounce and Exit Analysis Page go to the main navigation on the left, go to Real User Monitoring, Web Browser, and click on Bounce & Exit Analysis.',
      ],
      [
        'Metrics Summary',
        'At the top you will see a summary of metrics showing bounce and exit rate information, page views, conversion rate, page speed and more. Notice both the Session Exit Rate and a Page View Exit rate. The Session exit rate is calculated by the number of visitor sessions that left your site. The Page View exit rate is calculated by the total number of page views and the total number of exits. Read over the tool tips for more information.',
      ],
      [
        'Graphs Over Time',
        'The first section of graphs show bounce and exit rate percentages over time. You can switch between graphs by selecting the tabs above the graph. The first graph shows the average bounce and exit rate over time for all pages. You can also see onload, revenue and orders on this graph for more context. To switch to a table view, click the button on the top left of the graph.',
      ],
      [
        'Graphs by Onload',
        'Moving down the page, the next section of graphs show a histogram of bounce and exit rate by onload time. Switch between the different graphs by selecting from the tabs above the graphs. Bounce and Exit Rate is on the y axis and page onload time is on the x axis. This view gives insight into how performance is affecting user experience. To switch to a table view, click the button on the top right of the graph.',
      ],
      [
        'Bounce Rate and Onload Table',
        'At the bottom of the page we have the Bounce Rate and Onload table. This shows daily averages for bounce rate and onload for the past 7 days, and the average for the past 30 days at the far right. The daily numbers appear in red if they are 15% worse than the 30 Day Average and green if they are 15% better than the daily average.',
      ],
      [
        'Filters',
        'Use the filters to customize your analysis by clicking at the top of the page, or by clicking the filter icon and using the filters menu.',
      ],
    ],
  },
  {
    folder: 'errors-explorer',
    pdfName: 'The RUM Errors Explorer Page - Blue Triangle Help Center.pdf',
    title: 'The RUM Errors Explorer Page',
    url: 'https://help.bluetriangle.com/hc/en-us/articles/360056819434-The-RUM-Errors-Explorer-Page',
    sections: [
      [
        'Overview',
        'The Real User Errors Explorer page breaks down the errors real users are experiencing on your site by where they are coming from and who is impacted. You can filter this page like other pages in this module using the right-side filter icon at the top of the page.',
      ],
      [
        'How to Find the RUM Errors Explorer Page',
        'To access the RUM Errors Explorer Page, go to the main navigation on the top left of the page, Real User Monitoring module, then Errors Explorer.',
      ],
      [
        'Errors by Type',
        'The left side (All Errors) shows the total number of observed errors. The right side (Unique Errors) shows the number of those errors that were unique (not appearing multiple times).',
      ],
      [
        'Top Charts',
        'This section shows top Locations, Domains, Pages, Devices, OS, and Browsers experiencing errors. Clicking in the table below each graph adds that filter option to the Errors Over Time widget below so you can view the data as a histogram and the exact errors occurring (does not apply for Top Domains).',
      ],
      [
        'Errors Over Time',
        'This histogram compiles what kind of errors are happening over time. Spikes may need investigation. Clicking error names in the legend toggles that error type on the graph.',
      ],
      [
        'Errors Table',
        'This table breaks down each error with details such as error type (CSP violation, XHRError, TypeError, etc.), file name, error message, number of errors, percentage of total errors, and sessions impacted. Clicking a row opens the RUM Error Drill-down page.',
      ],
      [
        'Error Drill-Down Page',
        'Accessible only through Errors Explorer. Shows data for the specific error selected: error message at the top, file name and contextual details on the left, Top Error breakdown pie charts, Errors Over Time for that error, Pages with Errors scatter plot, Errors table, and Error Details.',
      ],
    ],
  },
  {
    folder: 'performance-budget',
    pdfName: 'Performance Budgets - Blue Triangle Help Center.pdf',
    title: 'Performance Budgets',
    url: 'https://help.bluetriangle.com/hc/en-us/sections/360003873194-Real-User-Monitoring',
    sections: [
      [
        'Overview',
        'The Performance Budgets page allows you to see how your key performance and content metrics are doing compared to your defined budgets. This page allows you to utilize filter options and metrics to track them in a dashboard in the Blue Triangle portal. (Source: Blue Triangle Help Center — Real User Monitoring / Performance Budgets section and Synthetic Real Browser overview references to the same Performance Budget capability.)',
      ],
      [
        'How to Find the Performance Budget Page',
        'In the portal Full Menu go to Monitoring > Real User Browser > Performance Budget. Route reference: overview-dashboard/performance-budget.',
      ],
      [
        'Dashboard Controls',
        'Use time lookback (e.g. Last 6 hours / Last 24 hours / Last 7 days / Last 30 days), Auto Refresh interval, Performance Budget template selector (e.g. Web Vitals Template), Reset Widgets, and Device / Browser / OS filter badges.',
      ],
      [
        'Latest Results / Timings & Assets',
        'Metric cards compare live/measured values against targets (examples: LCP, CLS, Onload, TBT, First Byte; asset budgets for JavaScript, CSS, Images).',
      ],
      [
        '1st vs 3rd Party Activity',
        'Widgets for Slowest Services / Domains / Files with 1st Party / 3rd Party / All toggles and Slowest … Before metric selector. Graph and table views are available.',
      ],
      [
        'Notes',
        'This Help Center PDF was generated from Help Center article content for the RUM Performance Budgets topic (portal Help Center / Real User Monitoring section). Where the dedicated article body is sparse in automated fetch, content is supplemented with live portal reverse-engineering for GDC Test Site 2.',
      ],
    ],
  },
];

function htmlFor(doc) {
  const body = doc.sections
    .map(
      ([h, p]) => `<h2>${h}</h2><p>${p.replace(/</g, '&lt;')}</p>`
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${doc.title}</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#222;line-height:1.45}
    h1{font-size:22px;margin-bottom:4px}
    .meta{color:#555;font-size:12px;margin-bottom:24px}
    h2{font-size:16px;margin-top:22px;border-bottom:1px solid #ddd;padding-bottom:4px}
    p{font-size:13px}
  </style></head><body>
  <div class="meta">Blue Triangle Help Center &gt; Guides &gt; Real User Monitoring</div>
  <h1>${doc.title}</h1>
  <div class="meta">Source: <a href="${doc.url}">${doc.url}</a><br/>Generated for automation regression packaging</div>
  ${body}
  </body></html>`;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const doc of docs) {
  const dir = path.join(base, doc.folder);
  fs.mkdirSync(dir, { recursive: true });
  const htmlPath = path.join(dir, doc.pdfName.replace(/\.pdf$/i, '.html'));
  const pdfPath = path.join(dir, doc.pdfName);
  const txtPath = path.join(dir, doc.pdfName.replace(/\.pdf$/i, '.txt'));
  const html = htmlFor(doc);
  fs.writeFileSync(htmlPath, html);
  const text = [`${doc.title}`, doc.url, '', ...doc.sections.flatMap(([h, p]) => [`## ${h}`, p, ''])].join('\n');
  fs.writeFileSync(txtPath, text);
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  console.log('Wrote', pdfPath, fs.statSync(pdfPath).size);
}

await browser.close();
