/**
 * Runtime profiles: user + datacenter → automation site.
 * Real-site equivalents are documentation only — never automate against them.
 *
 * DO NOT WRITE to any account, site, or page from automation.
 */

export type Datacenter = 'US' | 'US2' | 'EU';

export type PortalProfile = {
  id: string;
  datacenter: Datacenter;
  /** Site shown in the portal site dropdown for automation */
  siteName: string;
  /** Human reference only — do not select or write to these */
  realSiteEquivalent: string;
};

/** Default smoke/regression profile for this suite */
export const activeProfileId = 'us-gdc-test-site-2';

export const profiles: Record<string, PortalProfile> = {
  'us-gdc-test-site-2': {
    id: 'us-gdc-test-site-2',
    datacenter: 'US',
    siteName: 'GDC Test Site 2',
    realSiteEquivalent: 'QVC (reference only)',
  },
  'us-most-excellent': {
    id: 'us-most-excellent',
    datacenter: 'US',
    siteName: 'Most Excellent Test Site',
    realSiteEquivalent: 'Lowes (reference only)',
  },
  'us2-gdc': {
    id: 'us2-gdc',
    datacenter: 'US2',
    siteName: 'GDC Test Site 2',
    realSiteEquivalent: 'QVC (reference only)',
  },
  'eu-testsiteeu1': {
    id: 'eu-testsiteeu1',
    datacenter: 'EU',
    siteName: 'testsiteeu1',
    realSiteEquivalent: 'Boots UK Prod (reference only)',
  },
};

export function getActiveProfile(): PortalProfile {
  const fromEnv = process.env.BTT_PROFILE;
  if (fromEnv && profiles[fromEnv]) {
    return profiles[fromEnv];
  }
  return profiles[activeProfileId];
}
