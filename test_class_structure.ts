import { chromium } from '@playwright/test';
import { BrowserManagement } from './browser_management';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const inovar = new BrowserManagement(page);
  
  console.log("BrowserManagement instance:", inovar);
  console.log("Methods available:", Object.getOwnPropertyNames(Object.getPrototypeOf(inovar)));
  console.log("Has openInovar:", typeof inovar.openInovar);
  console.log("Has openInovarSumario:", typeof inovar.openInovarSumario);
  console.log("Has openInovarNextWeekSumario:", typeof inovar.openInovarNextWeekSumario);
  console.log("Has getFullHtml:", typeof inovar.getFullHtml);
  
  await browser.close();
}

test();
