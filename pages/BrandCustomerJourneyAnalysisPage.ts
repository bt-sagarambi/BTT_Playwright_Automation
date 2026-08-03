import { Page } from '@playwright/test';
import { CustomerJourneyAnalysisPage } from './CustomerJourneyAnalysisPage';

/**
 * Brand Customer Journey Analysis (conversion-type=brand).
 * Extends sales CJA page object; Brand ($) currency and brand route identity.
 */
export class BrandCustomerJourneyAnalysisPage extends CustomerJourneyAnalysisPage {
  constructor(page: Page) {
    super(page, 'brand');
  }
}
