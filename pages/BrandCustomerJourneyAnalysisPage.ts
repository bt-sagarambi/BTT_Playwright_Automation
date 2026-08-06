import { Page } from '@playwright/test';
import { CustomerJourneyAnalysisPage } from './CustomerJourneyAnalysisPage';

/**
 * Brand Customer Journey Analysis (conversion-type=brand).
 * Extends sales CJA page object; Brand currency column (site-localized symbol) and brand route identity.
 */
export class BrandCustomerJourneyAnalysisPage extends CustomerJourneyAnalysisPage {
  constructor(page: Page) {
    super(page, 'brand');
  }
}
