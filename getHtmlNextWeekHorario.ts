import { chromium } from '@playwright/test';
import { BrowserManagement } from './browser_management';

// INFO  — always printed; shows the normal course of events.
// DEBUG — printed only when DEBUG=1.
const log = (level: 'info' | 'debug', ...args: any[]) => {
  if (level === 'debug' && process.env.DEBUG !== '1') return;
  const prefix = level === 'debug' ? '[debug]' : '[info] ';
  console.error(prefix, ...args);
};

export async function getHtmlNextWeekHorario() {
  let browser;
  let inovar: BrowserManagement | undefined;

  try {
    log('info', 'getHtmlNextWeekHorario starting.');

    log('info', 'Launching headless browser ...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Forward page-level events so request failures and JS errors surface
    // in the log without requiring DEBUG=1.
    page.on('console', msg => log('debug', `[page ${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => log('info', `[page error] ${err.message}`));
    page.on('requestfailed', req =>
      log('info', `[request failed] ${req.url()} — ${req.failure()?.errorText}`),
    );

    inovar = new BrowserManagement(page);

    log('info', 'Logging in to Inovar ...');
    await inovar.openInovar();

    log('info', 'Navigating to Sumários (current week) ...');
    await inovar.openInovarSumario();

    log('info', 'Navigating to next week ...');
    await inovar.openInovarNextWeekSumario();

    // Extra guard: wait for at least one date cell before grabbing HTML.
    log('info', 'Waiting for schedule date cells to appear ...');
    try {
      await page.waitForSelector('text=/\\d{2}-\\d{2}-\\d{4}/', { timeout: 15000 });
      log('info', 'Schedule date cells found.');
    } catch {
      log('info', 'Warning: schedule date cells not found within 15 s — proceeding anyway.');
    }

    log('info', 'Fetching page HTML ...');
    const html = await inovar.getFullHtml();

    const output = {
      success: true,
      html,
      html_length: html.length,
      timestamp: new Date().toISOString(),
    };

    log('info', `getHtmlNextWeekHorario finished successfully (${html.length} bytes).`);
    console.log(JSON.stringify(output, null, 2));

  } catch (error) {
    log('info', 'Error in getHtmlNextWeekHorario:', error);

    if (inovar) {
      log('info', 'Saving failure screenshot ...');
      await inovar.saveScreenshot('getHtmlNextWeekHorario_failure');
    }

    const errorOutput = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(errorOutput, null, 2));
    process.exit(1);

  } finally {
    if (browser) {
      log('info', 'Closing browser.');
      await browser.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getHtmlNextWeekHorario();
}
