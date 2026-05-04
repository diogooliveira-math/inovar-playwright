import { test, expect} from '@playwright/test';    

import { Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
// INFO  — always printed; shows the normal course of events so you can follow
//         what is happening without any extra flags.
// DEBUG — printed only when DEBUG=1; noisy low-level detail.
//
// Usage:
//   log('info',  'Navigating to login page ...');
//   log('debug', 'Raw response headers:', headers);
// ---------------------------------------------------------------------------
const log = (level: 'info' | 'debug', ...args: any[]) => {
  if (level === 'debug' && process.env.DEBUG !== '1') return;
  const prefix = level === 'debug' ? '[debug]' : '[info] ';
  console.error(prefix, ...args);
};

export class BrowserManagement {
  private username: string | undefined;
  private password: string | undefined;

  constructor(private page: Page) {
    this.username = process.env.INOVAR_USERNAME;
    this.password = process.env.INOVAR_PASSWORD;

    // Increase default Playwright timeout to 60 s to tolerate slow pages.
    page.setDefaultTimeout(60000);
    log('debug', 'BrowserManagement initialized. Default timeout set to 60 000 ms.');
  }

  // -------------------------------------------------------------------------
  // Screenshot helper
  // -------------------------------------------------------------------------

  /**
   * Save a screenshot to logs/screenshots/<prefix>_<timestamp>.png.
   * Safe to call in error handlers — will never throw.
   */
  async saveScreenshot(prefix: string): Promise<string | null> {
    try {
      const screenshotsDir = path.join(process.cwd(), 'logs', 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(screenshotsDir, `${prefix}_${timestamp}.png`);
      await this.page.screenshot({ path: filename, fullPage: true });
      log('info', `Screenshot saved: ${filename}`);
      return filename;
    } catch (e) {
      log('debug', `Failed to save screenshot for prefix '${prefix}':`, e);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Click an element, trying `primarySelector` first.
   * If that times out, try `fallbackSelector` (with a shorter probe timeout).
   * Throws if both fail.
   */
  private async clickWithFallback(
    primarySelector: string,
    fallbackSelector: string,
    label: string,
  ): Promise<void> {
    try {
      log('debug', `Waiting for ${label} via primary selector '${primarySelector}' ...`);
      await this.page.waitForSelector(primarySelector, { state: 'visible', timeout: 10000 });
      await this.page.locator(primarySelector).click();
      log('debug', `Clicked ${label} via primary selector.`);
    } catch {
      log('info', `Primary selector '${primarySelector}' not found for ${label}; trying fallback '${fallbackSelector}' ...`);
      await this.page.waitForSelector(fallbackSelector, { state: 'visible', timeout: 30000 });
      await this.page.locator(fallbackSelector).click();
      log('info', `Clicked ${label} via fallback selector.`);
    }
  }

  /**
   * Read the current week label text from the Sumários toolbar.
   * Polls until the element has non-empty text (up to `timeoutMs`).
   * Returns null if the element is not found or stays empty.
   */
  private async readWeekLabel(timeoutMs = 10000): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        // Primary: known ID. Fallback: any visible element with title="Alterar Semana".
        const el = this.page.locator('#VWG_182, [title="Alterar Semana"]').first();
        const text = (await el.textContent({ timeout: 2000 }))?.trim() ?? '';
        if (text) {
          log('debug', `Week label text: "${text}"`);
          return text;
        }
      } catch {
        // element not yet in DOM — keep polling
      }
      await this.page.waitForTimeout(500);
    }
    log('debug', 'readWeekLabel: timed out waiting for non-empty week label.');
    return null;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async openInovar(username?: string, password?: string): Promise<void> {
    const user = username || this.username;
    const pass = password || this.password;

    if (!user || !pass) {
      throw new Error('INOVAR_USERNAME and INOVAR_PASSWORD environment variables are required.');
    }

    const url = 'https://epralima.inovarmais.com/alunos/Inicial.wgx';
    log('info', `Navigating to ${url} ...`);
    await this.page.goto(url);

    // Wait for the Inovar JS framework to render the login form.
    // The page is a thin shell (~2 KB) that bootstraps the full UI after networkidle.
    log('info', 'Waiting for page to reach network idle (Gizmox WebGUI framework bootstrap) ...');
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    log('debug', 'Network idle reached. URL:', this.page.url());

    // Wait for the username input rendered by the JS framework.
    // Confirmed selectors from live DOM inspection: #TRG_62 (text) / #TRG_61 (password).
    // waitForSelector gives a clear error message if the IDs ever drift again.
    log('info', 'Waiting for login form to appear (#TRG_62 username field) ...');
    await this.page.waitForSelector('#TRG_62', { state: 'visible', timeout: 60000 });
    log('info', 'Login form visible. Filling credentials ...');

    await this.page.locator('#TRG_62').click();
    await this.page.locator('#TRG_62').fill(user);
    log('debug', 'Username filled. Pressing Tab to move to password field ...');
    await this.page.locator('#TRG_62').press('Tab');

    await this.page.waitForSelector('#TRG_61', { state: 'visible', timeout: 60000 });
    await this.page.locator('#TRG_61').click();
    await this.page.locator('#TRG_61').fill(pass);
    log('debug', 'Password filled.');

    // Press Enter to submit — the Gizmox framework assigns a new dynamic ID to
    // the "Entrar" button on every session, so Enter is the most reliable method.
    log('info', 'Submitting login form (Enter on password field) ...');
    await this.page.locator('#TRG_61').press('Enter');

    // After login the URL stays at Inicial.wgx but the DOM changes.
    // Wait for any VWG_-prefixed element (framework renders the main app UI).
    log('info', 'Waiting for post-login application UI to load ...');
    await this.page.waitForSelector('div[id^="VWG_"]', { timeout: 60000 });
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    log('info', 'Login complete. Application UI loaded.');
  }

  async openInovarSumario(): Promise<void> {
    // Primary selectors confirmed from live DOM inspection (Feb 2026).
    // Fallback selectors use stable text content / title attributes that are
    // independent of the framework's numeric IDs.

    log('info', 'Opening Área Docente menu ...');
    await this.clickWithFallback(
      '#VWG_116',
      '[data-vwgtype="control"].cda3 >> text="Área Docente"',
      'Área Docente',
    );
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    log('info', 'Área Docente menu open.');

    log('info', 'Opening Sumários tab ...');
    await this.clickWithFallback(
      '#VWG_172',
      '[data-vwgtype="control"].cda3 >> text="Sumários"',
      'Sumários',
    );
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    log('info', 'Sumários tab open.');
  }

  async openInovarNextWeekSumario(): Promise<void> {
    // Read the current week label so we can verify navigation worked.
    const weekBefore = await this.readWeekLabel();
    log('info', `Current week before navigation: "${weekBefore ?? 'unknown'}"`);

    // Primary selector: #VWG_189 (confirmed Feb 2026, title="Semana Seguinte").
    // Fallback: any element whose title is "Semana Seguinte" — stable regardless
    // of the numeric ID assigned by the Gizmox framework.
    log('info', 'Clicking "Semana Seguinte" (next-week) button ...');
    await this.clickWithFallback(
      '#VWG_189',
      '[title="Semana Seguinte"]',
      'Semana Seguinte',
    );
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });

    // Safeguard: confirm the week label actually changed.
    const weekAfter = await this.readWeekLabel();
    log('info', `Week after navigation: "${weekAfter ?? 'unknown'}"`);

    // Only raise if we got a real (non-empty) label both times and it didn't
    // change — an empty string means the element wasn't readable yet, which
    // is not the same as navigation failing.
    if (weekBefore && weekAfter && weekBefore === weekAfter) {
      throw new Error(
        `Next-week navigation appears to have failed: week label did not change (still "${weekAfter}").`,
      );
    }

    log('info', 'Successfully navigated to next week.');
  }

  async getFullHtml(): Promise<string> {
    const html = await this.page.content();
    log('info', `Captured page HTML (${html.length} bytes).`);

    // Safeguard: verify the HTML actually contains schedule date cells before
    // returning, so callers get an early, meaningful error instead of silently
    // processing empty content.
    const datePattern = /\d{2}-\d{2}-\d{4}/;
    if (!datePattern.test(html)) {
      throw new Error(
        'Schedule HTML does not contain any date cells (expected pattern dd-MM-yyyy). ' +
        'The page may not have loaded correctly.',
      );
    }

    log('debug', 'HTML content validation passed (date pattern found).');
    return html;
  }
}
