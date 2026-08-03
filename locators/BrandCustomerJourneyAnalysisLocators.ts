import { Page } from '@playwright/test';
import { CustomerJourneyAnalysisLocators } from './CustomerJourneyAnalysisLocators';

/**
 * Locators for Brand Customer Journey Analysis (conversion-type=brand).
 * Same hosts as sales CJA; brandAttribution lives on the shared locator class.
 */
export class BrandCustomerJourneyAnalysisLocators extends CustomerJourneyAnalysisLocators {
  constructor(page: Page) {
    super(page);
  }
}
