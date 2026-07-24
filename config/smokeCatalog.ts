/**
 * Read-only portal pages for smoke coverage.
 * One catalog entry = one smoke test case.
 * Excludes create/edit/run flows that can write data.
 */

export type SmokePageDef = {
  /** Stable test id / script label: module.page */
  id: string;
  module: string;
  /** Left-nav visible label */
  menuLabel: string;
  /** Yii `r=` route fragment used to find the correct link when labels collide */
  route: string;
  /** Optional extra query markers to disambiguate (e.g. conversion-type=sales) */
  hrefIncludes?: string[];
  /** Reject hrefs containing these fragments */
  hrefExcludes?: string[];
  /** Optional title/breadcrumb fragment */
  titleIncludes?: string | RegExp;
};

export const smokePages: SmokePageDef[] = [
  // --- Advanced Reporting / Logs ---
  {
    id: 'rum.dxo',
    module: 'rum',
    menuLabel: 'Digital Experience Overview',
    route: 'overview-dashboard/overview',
    titleIncludes: /Digital Experience Overview/i,
  },
  {
    id: 'rum.executive-kpi',
    module: 'rum',
    menuLabel: 'Executive KPI Report',
    route: 'executive-reports/kpi',
    titleIncludes: /Executive KPI/i,
  },
  {
    id: 'rum.crux',
    module: 'rum',
    menuLabel: 'CrUX Report',
    route: 'executive-reports/crux',
    titleIncludes: /CrUX/i,
  },
  {
    id: 'rum.automated-reports',
    module: 'rum',
    menuLabel: 'Automated Reports',
    route: 'reports/index',
    hrefIncludes: ['reports/index'],
    hrefExcludes: ['create=true'],
    titleIncludes: /Automated Reports|Reports/i,
  },
  {
    id: 'rum.alerts',
    module: 'rum',
    menuLabel: 'Alerts',
    route: 'alerts/index',
    hrefIncludes: ['alerts/index'],
    hrefExcludes: ['create=true'],
    titleIncludes: /Alerts/i,
  },
  {
    id: 'rum.data-science',
    module: 'rum',
    menuLabel: 'Data Science',
    route: 'site/custom-comparison',
    titleIncludes: /Data Science|Custom Comparison|Comparison/i,
  },
  {
    id: 'logs.alerts-log',
    module: 'logs',
    menuLabel: 'Alerts Log',
    route: 'alerts-log/index',
    titleIncludes: /Alerts Log/i,
  },
  {
    id: 'logs.reports-log',
    module: 'logs',
    menuLabel: 'Reports Log',
    route: 'reports-log/index',
    titleIncludes: /Reports Log/i,
  },
  {
    id: 'logs.domain-violation-audit',
    module: 'logs',
    menuLabel: 'Domain Violation & Audit Log',
    route: 'domain-violation-audit-log/index',
    titleIncludes: /Domain Violation|Audit Log/i,
  },
  {
    id: 'logs.synthetic-monitors',
    module: 'logs',
    menuLabel: 'Synthetic Monitors Log',
    route: 'synthetic-monitors-log/index',
    titleIncludes: /Synthetic Monitors Log/i,
  },
  {
    id: 'logs.instant-measurement',
    module: 'logs',
    menuLabel: 'Instant Measurement Log',
    route: 'instant-measurement-log/index',
    titleIncludes: /Instant Measurement Log/i,
  },
  {
    id: 'logs.consultant-access',
    module: 'logs',
    menuLabel: 'Consultant Access History',
    route: 'consultant-access/history',
    titleIncludes: /Consultant Access/i,
  },
  {
    id: 'logs.site-variables',
    module: 'logs',
    menuLabel: 'Site Variables Log',
    route: 'company-variables-log/index',
    titleIncludes: /Site Variables|Company Variables/i,
  },

  // --- RUM ---
  {
    id: 'rum.performance-overview',
    module: 'rum',
    menuLabel: 'Performance Overview',
    route: 'real-user-monitoring/performance-overview',
    titleIncludes: /Performance Overview/i,
  },
  {
    id: 'rum.performance-detail',
    module: 'rum',
    menuLabel: 'Performance Detail',
    route: 'real-user-monitoring/performance-detail',
    titleIncludes: /Performance Detail/i,
  },
  {
    id: 'rum.performance-comparison',
    module: 'rum',
    menuLabel: 'Performance Comparison',
    route: 'real-user-monitoring/performance-comparison',
    titleIncludes: /Performance Comparison/i,
  },
  {
    id: 'rum.aggregate-waterfall',
    module: 'rum',
    menuLabel: 'Aggregate Waterfall',
    route: 'real-user-monitoring/object-level-trending',
    titleIncludes: /Aggregate Waterfall|Object Level|Waterfall/i,
  },
  {
    id: 'rum.bounce-exit',
    module: 'rum',
    menuLabel: 'Bounce & Exit Analysis',
    route: 'real-user-monitoring/bounce-and-exit-analysis',
    titleIncludes: /Bounce|Exit/i,
  },
  {
    id: 'rum.errors-explorer',
    module: 'rum',
    menuLabel: 'Errors Explorer',
    route: 'javascript-errors/real-user',
    titleIncludes: /Errors Explorer|JavaScript Errors|Errors/i,
  },
  {
    id: 'rum.performance-budget',
    module: 'rum',
    menuLabel: 'Performance Budget',
    route: 'overview-dashboard/performance-budget',
    titleIncludes: /Performance Budget/i,
  },
  {
    id: 'rum.session-lookup',
    module: 'rum',
    menuLabel: 'Session Lookup',
    route: 'real-user-monitoring/session-lookup-performance-detail',
    titleIncludes: /Session Lookup/i,
  },
  {
    id: 'rum.vitalscope',
    module: 'rum',
    menuLabel: 'Core Web Vitals (VitalScope)',
    route: 'real-user-monitoring/performance-overview',
    titleIncludes: /Vital|Core Web|Performance Overview/i,
  },

  // --- Synthetic ---
  {
    id: 'synth.performance-overview',
    module: 'synth',
    menuLabel: 'Performance Overview',
    route: 'overview-dashboard/synthetic-overview',
    titleIncludes: /Performance Overview|Synthetic/i,
  },
  {
    id: 'synth.performance-detail',
    module: 'synth',
    menuLabel: 'Performance Detail',
    route: 'synthetic-monitoring/performance-detail',
    titleIncludes: /Performance Detail/i,
  },
  {
    id: 'synth.test-results',
    module: 'synth',
    menuLabel: 'Test Results',
    route: 'synthetic-monitoring/test-results',
    titleIncludes: /Test Results/i,
  },
  {
    id: 'synth.error-state-tracking',
    module: 'synth',
    menuLabel: 'Error State Tracking',
    route: 'error-state-tracking/index',
    titleIncludes: /Error State/i,
  },
  {
    id: 'synth.page-perf-comparison',
    module: 'synth',
    menuLabel: 'Page Performance Comparison',
    route: 'synthetic-monitoring/performance-comparison',
    titleIncludes: /Performance Comparison|Page Performance/i,
  },
  {
    id: 'synth.aggregate-waterfall',
    module: 'synth',
    menuLabel: 'Aggregate Waterfall',
    route: 'synthetic-monitoring/object-level-trending',
    titleIncludes: /Aggregate Waterfall|Waterfall/i,
  },
  {
    id: 'synth.errors-explorer',
    module: 'synth',
    menuLabel: 'Errors Explorer',
    route: 'javascript-errors/synthetic',
    titleIncludes: /Errors Explorer|Errors/i,
  },
  {
    id: 'synth.monitors-list',
    module: 'synth',
    menuLabel: 'Synthetic Monitors',
    route: 'synthetic-monitors/index',
    titleIncludes: /Synthetic Monitors/i,
  },
  {
    id: 'synth.erroring-monitors',
    module: 'synth',
    menuLabel: 'Erroring Synthetic Monitors',
    route: 'alerts/alerting-synthetic-monitors',
    titleIncludes: /Erroring Synthetic|Synthetic Monitors/i,
  },
  {
    id: 'synth.codes',
    module: 'synth',
    menuLabel: 'Synthetic Codes',
    route: 'synthetic-codes/index',
    titleIncludes: /Synthetic Codes/i,
  },
  {
    id: 'synth.data-repos',
    module: 'synth',
    menuLabel: 'Central Data Repositories',
    route: 'synthetic-scripts/data-repositories',
    titleIncludes: /Data Repositor/i,
  },

  // --- Base page / Network ---
  {
    id: 'synth.basepage-overview',
    module: 'synth',
    menuLabel: 'Performance Overview',
    route: 'overview-dashboard/base-page-overview',
    titleIncludes: /Performance Overview|Base Page/i,
  },
  {
    id: 'synth.basepage-detail',
    module: 'synth',
    menuLabel: 'Performance Detail',
    route: 'synthetic-monitoring/base-page-and-ssl',
    titleIncludes: /Performance Detail|Base Page|SSL/i,
  },
  {
    id: 'synth.basepage-results',
    module: 'synth',
    menuLabel: 'Test Results',
    route: 'synthetic-monitoring/base-page-test-results',
    titleIncludes: /Test Results/i,
  },
  {
    id: 'synth.network-overview',
    module: 'synth',
    menuLabel: 'Performance Overview',
    route: 'overview-dashboard/network-health-checks-overview',
    titleIncludes: /Performance Overview|Network/i,
  },
  {
    id: 'synth.network-detail',
    module: 'synth',
    menuLabel: 'Performance Detail',
    route: 'synthetic-monitoring/network-health-checks-performance',
    titleIncludes: /Performance Detail|Network/i,
  },
  {
    id: 'synth.network-results',
    module: 'synth',
    menuLabel: 'Test Results',
    route: 'synthetic-monitoring/network-test-results',
    titleIncludes: /Test Results/i,
  },

  // --- Tag & Content ---
  {
    id: 'tag.overview',
    module: 'tag',
    menuLabel: 'Tag & Content Overview',
    route: 'overview-dashboard/tag-governance',
    titleIncludes: /Tag|Content|Governance/i,
  },
  {
    id: 'tag.domain-details',
    module: 'tag',
    menuLabel: 'Domain Details',
    route: 'tag-and-content-governance/domain-details',
    titleIncludes: /Domain Details/i,
  },
  {
    id: 'tag.inventory',
    module: 'tag',
    menuLabel: 'Inventory Analysis',
    route: 'tag-and-content-governance/inventory-analysis',
    titleIncludes: /Inventory/i,
  },
  {
    id: 'tag.domain-baseline',
    module: 'tag',
    menuLabel: 'Domain Baseline Analysis',
    route: 'tag-and-content-governance/domain-baseline-analysis',
    titleIncludes: /Domain Baseline/i,
  },
  {
    id: 'tag.service-profiles',
    module: 'tag',
    menuLabel: 'Service Profiles',
    route: 'service-profiles/index',
    titleIncludes: /Service Profiles/i,
  },
  {
    id: 'tag.service-details',
    module: 'tag',
    menuLabel: 'Service Details',
    route: 'tag-and-content-governance/service-details',
    titleIncludes: /Service Details/i,
  },
  {
    id: 'tag.sla-status',
    module: 'tag',
    menuLabel: 'SLA Status',
    route: 'tag-and-content-governance/sla-overview',
    titleIncludes: /SLA/i,
  },

  // --- Business / Marketing ---
  {
    id: 'biz.dashboards',
    module: 'biz',
    menuLabel: 'Dashboards',
    route: 'site/dashboard',
    hrefIncludes: ['site/dashboard'],
    hrefExcludes: ['marketing=yes'],
    titleIncludes: /Dashboard/i,
  },
  {
    id: 'biz.revenue-opportunity',
    module: 'biz',
    menuLabel: 'Revenue Opportunity',
    route: 'business-analytics/revenue-opportunity',
    titleIncludes: /Revenue Opportunity/i,
  },
  {
    id: 'biz.revenue-analysis',
    module: 'biz',
    menuLabel: 'Revenue Analysis',
    route: 'business-analytics/revenue-analysis',
    hrefIncludes: ['conversion-type=sales'],
    titleIncludes: /Revenue Analysis/i,
  },
  {
    id: 'biz.customer-journey',
    module: 'biz',
    menuLabel: 'Customer Journey Analysis',
    route: 'marketing-insights/customer-journey-analysis',
    hrefIncludes: ['conversion-type=sales'],
    titleIncludes: /Customer Journey/i,
  },
  {
    id: 'mkt.marketing-overview',
    module: 'mkt',
    menuLabel: 'Marketing Overview',
    route: 'overview-dashboard/marketing',
    titleIncludes: /Marketing Overview/i,
  },
  {
    id: 'mkt.my-campaign',
    module: 'mkt',
    menuLabel: 'My Campaign',
    route: 'site/dashboard',
    hrefIncludes: ['marketing=yes'],
    titleIncludes: /Campaign|Dashboard|Marketing/i,
  },
  {
    id: 'mkt.brand-journey',
    module: 'mkt',
    menuLabel: 'Brand Customer Journey Analysis',
    route: 'marketing-insights/customer-journey-analysis',
    hrefIncludes: ['conversion-type=brand'],
    titleIncludes: /Brand|Customer Journey/i,
  },
  {
    id: 'mkt.competitive-table',
    module: 'mkt',
    menuLabel: 'Competitive Index Table',
    route: 'competitive-index/index',
    hrefIncludes: ['view=table'],
    titleIncludes: /Competitive Index/i,
  },
  {
    id: 'mkt.competitive-trends',
    module: 'mkt',
    menuLabel: 'Competitive Index Trends',
    route: 'competitive-index/index',
    hrefIncludes: ['view=trends'],
    titleIncludes: /Competitive Index/i,
  },
  {
    id: 'mkt.bottom-funnel',
    module: 'mkt',
    menuLabel: 'Bottom of the Sales Funnel Analysis',
    route: 'marketing-insights/bottom-sales-funnel',
    titleIncludes: /Sales Funnel|Bottom/i,
  },
  {
    id: 'biz.brand-opportunity',
    module: 'biz',
    menuLabel: 'Brand Opportunity',
    route: 'business-analytics/brand-opportunity',
    titleIncludes: /Brand Opportunity/i,
  },
  {
    id: 'biz.revenue-calculator',
    module: 'biz',
    menuLabel: 'Revenue Calculator',
    route: 'business-analytics/revenue-calculator',
    hrefIncludes: ['conversion-type=sales'],
    titleIncludes: /Revenue Calculator|Calculator/i,
  },
  {
    id: 'biz.brand-calculator',
    module: 'biz',
    menuLabel: 'Brand Calculator',
    route: 'business-analytics/revenue-calculator',
    hrefIncludes: ['conversion-type=brand'],
    titleIncludes: /Brand Calculator|Calculator/i,
  },
  {
    id: 'biz.revenue-attribution',
    module: 'biz',
    menuLabel: 'Revenue Attribution',
    route: 'business-analytics/revenue-attribution',
    titleIncludes: /Revenue Attribution/i,
  },
  {
    id: 'biz.brand-attribution',
    module: 'biz',
    menuLabel: 'Brand Attribution',
    route: 'business-analytics/brand-attribution',
    titleIncludes: /Brand Attribution/i,
  },
  {
    id: 'biz.brand-analysis',
    module: 'biz',
    menuLabel: 'Brand Analysis',
    route: 'business-analytics/revenue-analysis',
    hrefIncludes: ['conversion-type=brand'],
    titleIncludes: /Brand Analysis|Revenue Analysis/i,
  },
  {
    id: 'biz.cart-refresh',
    module: 'biz',
    menuLabel: 'Cart Refresh',
    route: 'business-analytics/broken-links',
    titleIncludes: /Cart Refresh|Broken Links/i,
  },
  {
    id: 'biz.out-of-stock',
    module: 'biz',
    menuLabel: 'Out of Stock',
    route: 'business-analytics/out-of-stock',
    titleIncludes: /Out of Stock/i,
  },
  {
    id: 'biz.revenue-assurance',
    module: 'biz',
    menuLabel: 'Revenue Assurance',
    route: 'revenue-assurance/dashboard',
    titleIncludes: /Revenue Assurance/i,
  },

  // --- Native ---
  {
    id: 'native.performance-overview',
    module: 'native',
    menuLabel: 'Performance Overview',
    route: 'overview-dashboard/native-app-overview',
    titleIncludes: /Performance Overview|Native/i,
  },
  {
    id: 'native.performance-detail',
    module: 'native',
    menuLabel: 'Performance Detail',
    route: 'real-user-monitoring/native-app-performance-detail',
    titleIncludes: /Performance Detail/i,
  },
  {
    id: 'native.aggregate-waterfall',
    module: 'native',
    menuLabel: 'Aggregate Waterfall',
    route: 'real-user-monitoring/native-app-object-level-trending',
    titleIncludes: /Aggregate Waterfall|Waterfall/i,
  },
  {
    id: 'native.bounce-exit',
    module: 'native',
    menuLabel: 'Bounce & Exit Analysis',
    route: 'real-user-monitoring/native-app-bounce-and-exit-analysis',
    titleIncludes: /Bounce|Exit/i,
  },
  {
    id: 'native.errors-explorer',
    module: 'native',
    menuLabel: 'Errors Explorer',
    route: 'javascript-errors/native',
    titleIncludes: /Errors Explorer|Errors/i,
  },

  // --- Account (view only) ---
  {
    id: 'acct.my-account',
    module: 'acct',
    menuLabel: 'My Account',
    route: 'accounts/my-account',
    titleIncludes: /My Account|Account/i,
  },
  {
    id: 'acct.view-profile',
    module: 'acct',
    menuLabel: 'View Profile',
    route: 'users/profile',
    titleIncludes: /Profile/i,
  },
];

export const smokePagesByModule = smokePages.reduce<Record<string, SmokePageDef[]>>((acc, page) => {
  (acc[page.module] ??= []).push(page);
  return acc;
}, {});
