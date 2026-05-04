import { chromium } from '@playwright/test';
import { BrowserManagement } from './browser_management';

async function main() {
  console.log('Starting browser automation test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const inovar = new BrowserManagement(page);
    
    console.log('Opening Inovar login page...');
    await inovar.openInovar();
    
    console.log('Waiting for login to complete...');
    await page.waitForTimeout(5000);
    
    console.log('Opening Inovar Sumario...');
    await inovar.openInovarSumario();
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    console.log('Opening next week Sumario...');
    await inovar.openInovarNextWeekSumario();
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

main();
