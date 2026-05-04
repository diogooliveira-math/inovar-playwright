import { BrowserManager } from './agent-browser/src/browser.js';
import { type EnhancedSnapshot } from './agent-browser/src/snapshot.js';


// In the future this will need better plan. This file must be divided
// In a good project. 
// For now the main.ts will be a god script!

const debug = (...args: any[]) => {
  if (process.env.DEBUG === "1") {
    console.error("[debug]", ...args);
  }
};

interface SnapshotNode {
  type: string;
  name?: string;
  ref?: string;
  children: SnapshotNode[];
}

export class BrowserAutomationService {
  constructor(private browser: BrowserManager) {}

  /**
   * Get the currently opened URL in the browser.
   */
  getOpenedUrl(): string {
    if (!this.browser.isLaunched()) {
      return '';
    }
    return this.browser.getPage().url();
  }

  /**
   * Get the full HTML content of the current page.
   */
  async getFullHtml(): Promise<string> {
    if (!this.browser.isLaunched()) {
      return '';
    }
    return await this.browser.getPage().content();
  }

  /**
   * Get the current snapshot from the browser.
   */
  async getSnapshot(): Promise<EnhancedSnapshot> {
    return await this.browser.getSnapshot();
  }

  /**
   * Open browser with configured URL, checking if it's already open.
   */
  async openUrl(url: string): Promise<void> {
    if (!this.browser.isLaunched()) {
      // If not launched, we can't check URL, so just launch and go? 
      // Assuming browser is launched externally or via main script.
      // But for safety let's throw or handle.
      throw new Error("Browser not launched");
    }

    const currentUrl = this.getOpenedUrl();
    // Simple check - in reality might need more complex URL matching
    if (currentUrl && currentUrl.includes(url)) {
      debug(`URL ${url} is already open, skipping open operation`);
      return;
    }

    debug(`Opening URL: ${url}`);
    // Wait for page to load completely including network activity
    await this.browser.getPage().goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Give extra time for dynamic content to render
    await this.browser.getPage().waitForTimeout(2000);
  }

  /**
   * Get count of interactive elements on the page.
   */
  async getRefCount(): Promise<number> {
    const snapshot = await this.getSnapshot();
    return Object.keys(snapshot.refs).length;
  }

  /**
   * Wait until snapshot has at least min_refs refs or timeout expires.
   */
  async waitForMinRefs(minRefs: number, timeoutSecs: number = 10): Promise<number> {
    const start = Date.now();
    let lastCount = 0;
    debug(`Checking for at least ${minRefs} refs in snapshot...`);
    while ((Date.now() - start) < timeoutSecs * 1000) {
      lastCount = await this.getRefCount();
      debug(`  Current refs: ${lastCount}`);
      if (lastCount >= minRefs) {
        return lastCount;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return lastCount;
  }

  /**
   * Return refs filtered by role from snapshot.
   */
  async getRefsByRole(role: string): Promise<Array<{ ref: string; name?: string }>> {
    const snapshot = await this.browser.getSnapshot();
    const results: Array<{ ref: string; name?: string }> = [];

    for (const [ref, info] of Object.entries(snapshot.refs)) {
      if (info.role === role) {
        results.push({ ref, name: info.name });
      }
    }
    return results;
  }

  // --- Parsing Logic ---

  /**
   * Parse snapshot text into a tree structure.
   */
  private parseSnapshotTree(snapshotText: string): SnapshotNode {
    const root: SnapshotNode = { type: 'root', children: [] };
    const stack: { indent: number; node: SnapshotNode }[] = [{ indent: -1, node: root }];

    const lines = snapshotText.split('\n');
    const lineRegex = /^(?<indent>\s*)-\s+(?<rest>.+)$/;

    for (const line of lines) {
      const match = line.match(lineRegex);
      if (!match || !match.groups) continue;

      const indent = match.groups.indent.length;
      const rest = match.groups.rest;
      const node = this.parseSnapshotLine(rest);

      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack.length > 0 ? stack[stack.length - 1].node : root;
      parent.children.push(node);
      stack.push({ indent, node });
    }

    return root;
  }

  private parseSnapshotLine(rest: string): SnapshotNode {
    // Example: button "Submit" [ref=e2]
    // Example: table [ref=e10]
    
    // Split type from the rest (simplistic approach)
    // TypeScript regex doesn't support named groups in all environments cleanly in one go for this complex pattern
    // so we'll do manual parsing similar to Python
    
    const parts = rest.split(' ');
    const type = parts[0].replace(':', ''); // remove trailing colon if any
    
    let name: string | undefined;
    let ref: string | undefined;

    // Search for ref
    const refMatch = rest.match(/\[ref=(e\d+)\]/);
    if (refMatch) {
      ref = refMatch[1];
    }

    // Search for name (quoted string)
    const nameMatch = rest.match(/"(.*?)"/);
    if (nameMatch) {
      name = nameMatch[1];
    } else if (rest.includes('text:')) {
      name = rest.split('text:')[1].trim().replace(/"/g, '');
    }

    return { type, name, ref, children: [] };
  }

  /**
   * Extract tables from the tree.
   */
  private extractTablesFromTree(tree: SnapshotNode): string[][][] {
    const tables: string[][][] = [];

    const walk = (node: SnapshotNode) => {
      if (node.type === 'table') {
        tables.push(this.tableNodeToRows(node));
      }
      for (const child of node.children) {
        walk(child);
      }
    };

    walk(tree);
    return tables;
  }

  private tableNodeToRows(tableNode: SnapshotNode): string[][] {
    const rowsOut: string[][] = [];
    
    for (const child of tableNode.children) {
      if (child.type !== 'rowgroup') continue;
      
      for (const rowNode of child.children) {
        if (rowNode.type !== 'row') continue;
        
        const rowCells: string[] = [];
        for (const cellNode of rowNode.children) {
          if (cellNode.type === 'cell' || cellNode.type === 'columnheader' || cellNode.type === 'rowheader') {
            rowCells.push(cellNode.name || '');
          }
        }
        rowsOut.push(rowCells);
      }
    }
    return rowsOut;
  }

  /**
   * Parse snapshot text into tables -> rows -> cells.
   */
  async getSnapshotTables(snapshot?: EnhancedSnapshot): Promise<string[][][]> {
    if (!snapshot) {
      snapshot = await this.browser.getSnapshot();
    }
    const tree = this.parseSnapshotTree(snapshot.tree);
    return this.extractTablesFromTree(tree);
  }

  /**
   * Return tables that contain the given text in any cell.
   */
  async findTablesWithText(text: string, snapshot?: EnhancedSnapshot, caseSensitive: boolean = false): Promise<string[][][]> {
    if (!text) return [];
    
    const tables = await this.getSnapshotTables(snapshot);
    const needle = caseSensitive ? text : text.toLowerCase();
    const matches: string[][][] = [];

    for (const table of tables) {
      let found = false;
      for (const row of table) {
        for (const cell of row) {
          const hay = caseSensitive ? cell : cell.toLowerCase();
          if (hay.includes(needle)) {
            matches.push(table);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    return matches;
  }

  // --- Schedule Logic ---

  /**
   * Try to build a timetable grid from the snapshot.
   */
  async buildScheduleGrid(snapshot?: EnhancedSnapshot): Promise<{ headers: string[], rows: string[][], events: any[] }> {
    const tables = await this.getSnapshotTables(snapshot);
    if (!tables.length) {
      return { headers: [], rows: [], events: [] };
    }

    const dateRe = /\b\d{2}-\d{2}-\d{4}\b/;
    const timeRe = /^\d{3,4}$/;

    let targetTable: string[][] | null = null;
    let headerRow: string[] = [];
    let bestScore = -1;

    // Heuristic: find the best table
    for (const table of tables) {
      const dateRows: { row: string[], count: number }[] = [];
      let timeRows = 0;

      for (const row of table) {
        const dates = row.filter(cell => dateRe.test(cell));
        if (dates.length >= 3) {
            dateRows.push({ row, count: dates.length });
        }
        if (row.some(cell => timeRe.test(cell))) {
            timeRows++;
        }
      }

      if (dateRows.length === 0) continue;

      const score = (dateRows.length * 10) + timeRows + table.length;
      if (score > bestScore) {
        bestScore = score;
        targetTable = table;
        // find max date row
        const bestDateRow = dateRows.reduce((prev, current) => (prev.count > current.count) ? prev : current);
        headerRow = bestDateRow.row;
      }
    }

    if (!targetTable) {
        return { headers: [], rows: [], events: [] };
    }

    // Map column index to date
    const colToDate: Record<number, string> = {};
    headerRow.forEach((cell, idx) => {
        if (dateRe.test(cell)) {
            colToDate[idx] = cell;
        }
    });

    const headers = Object.values(colToDate);
    const events: Array<{ date: string, time: string, text: string }> = [];
    const rows: string[][] = [];

    let currentTime: string | null = null;

    for (const row of targetTable) {
        rows.push(row);
        const rowTime = row.find(cell => timeRe.test(cell));
        if (rowTime) {
            currentTime = rowTime;
        }

        if (!currentTime) continue;

        row.forEach((cell, idx) => {
            const text = cell.trim();
            if (!text) return;
            
            // Skip markers
            if (dateRe.test(text) || timeRe.test(text)) return;

            const date = colToDate[idx];
            if (date) {
                events.push({ date, time: currentTime!, text });
            }
        });
    }

    return { headers, rows, events };
  }

  async extractScheduleByDate(snapshot?: EnhancedSnapshot): Promise<Record<string, any[]>> {
    const grid = await this.buildScheduleGrid(snapshot);
    if (!grid.events.length) {
        return {};
    }

    const scheduleByDate: Record<string, any[]> = {};

    for (const event of grid.events) {
        const { date, time, text } = event;
        
        let hour = 0;
        try {
            const timeInt = parseInt(time, 10);
            hour = Math.floor(timeInt / 100) * 100;
        } catch {
            continue;
        }

        if (!scheduleByDate[date]) {
            scheduleByDate[date] = [];
        }

        // Mock class info conversion since we don't have TeacherDataConverter
        // In a real port, this logic would need to be added or imported
        scheduleByDate[date].push({
            class_name: text, // Raw text for now
            hour: hour
        });
    }

    return scheduleByDate;
  }

  // --- Workflows ---

  async openInovar(): Promise<any> {
    const username = process.env.INOVAR_USERNAME;
    const password = process.env.INOVAR_PASSWORD;

    if (!username || !password) {
        console.error("Username or password missing");
        console.error("Set INOVAR_USERNAME and INOVAR_PASSWORD environment variables");
        return { error: "Missing credentials" };
    }

    const url = "https://epralima.inovarmais.com/alunos/Inicial.wgx";
    await this.openUrl(url);

    debug("Waiting for login form to load...");
    // Wait for the page to fully load and inputs to be available
    await this.browser.getPage().waitForTimeout(2000);
    
    // Get snapshot to find login fields
    const snapshot = await this.browser.getSnapshot();
    debug("Interactive elements found:", Object.keys(snapshot.refs).length);
    
    // Find textbox elements
    const textboxes = Object.entries(snapshot.refs)
      .filter(([_, info]) => info.role === 'textbox');
    
    debug("Textboxes found:", textboxes.length);
    
    if (textboxes.length >= 2) {
         const [userRef, _] = textboxes[0];
         const [passRef, __] = textboxes[1];
         
         debug(`Filling username into ${userRef}...`);
         const userLocator = this.browser.getLocatorFromRef(userRef);
         if (userLocator) {
           await userLocator.clear();
           await userLocator.fill(username);
         }
         
         debug(`Filling password into ${passRef}...`);
         const passLocator = this.browser.getLocatorFromRef(passRef);
         if (passLocator) {
           await passLocator.clear();
           await passLocator.fill(password);
         }
         
         debug("Submitting login form...");
         await this.browser.getPage().keyboard.press('Enter');
         
         // Wait for navigation after login
         debug("Waiting for page to load after login...");
         await this.browser.getPage().waitForLoadState('networkidle', { timeout: 30000 });
         await this.browser.getPage().waitForTimeout(3000); // Extra time for dynamic content
         
         debug("Login complete!");
    } else {
        console.warn("Could not find enough input fields for Inovar login");
        console.warn("Found textboxes:", textboxes);
    }
    
    return await this.browser.getSnapshot();
  }

  async openSumarioInovar(): Promise<any> {
    const loginResult = await this.openInovar();
    
    // Check if we are already there (heuristic from Python: high ref count)
    const initialRefs = await this.getRefCount();
    
    if (initialRefs > 50) {
        debug("Already on summary page (refs > 50)");
        return { already_on_page: true, snapshot: await this.browser.getSnapshot() };
    }

    // Navigation (mimicking Python's click @e4, @e9)
    // Click on the navigation refs to reach summary page
    debug("Clicking navigation element @e4...");
    const ref4Locator = this.browser.getLocator("e4");
    await ref4Locator.click();
    await this.browser.getPage().waitForTimeout(1000);
    
    // Refresh snapshot to get new refs after navigation
    await this.browser.getSnapshot();
    
    debug("Clicking navigation element @e9...");
    const ref9Locator = this.browser.getLocator("e9");
    await ref9Locator.click();
    await this.browser.getPage().waitForTimeout(1000);
    
    // Wait for load
    await this.waitForMinRefs(80);

    // Scroll sequence to ensure lazy loading
    const page = this.browser.getPage();
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.evaluate(() => window.scrollBy(500, 0));
    await page.evaluate(() => window.scrollBy(-500, 0));

    return await this.browser.getSnapshot();
  }

  async getHtmlHorario(): Promise<{ result_openSumarioInovar: any; html: string }> {
      // Open the Sumario Inovar page
      const result_openSumarioInovar = await this.openSumarioInovar();
      
      // Get the full HTML content
      const html = await this.getFullHtml();

      return {
        result_openSumarioInovar,
        html
      };
  }
}

// --- Main Execution Example ---

async function main() {
  const browser = new BrowserManager();
  
  // Example usage
  try {
      await browser.launch({ headless: true });
      const service = new BrowserAutomationService(browser);
      
      // Example: Print full HTML
      await service.openSumarioInovar();
      
      debug("Opened URL:", service.getOpenedUrl());
      debug("Full HTML length:", (await service.getFullHtml()).length);
      debug("Full HTML:", (await service.getFullHtml()));
      debug("Full snapshot:", (await service.getSnapshot()));
      debug("Number of interactive elements:", await service.getRefCount());
      
      const snapshot = await service.getSnapshot();
      debug("Snapshot refs count:", Object.keys(snapshot.refs).length);

      debug("Full HTML:", (await service.getFullHtml()));
      // Example: Schedule logic (Mock)
      // await service.openInovar(process.env.INOVAR_USERNAME, process.env.INOVAR_PASSWORD);
      // const schedule = await service.extractScheduleByDate();
      // debug("Schedule:", JSON.stringify(schedule, null, 2));
      
  } catch (error) {
      console.error("Error in main:", error);
  } finally {
      // await browser.close(); // BrowserManager doesn't expose close directly on instance in the snippet provided, 
      // but usually we'd want to close it. 
      // Checking browser.ts again... it has closeTab but not explicit closeBrowser? 
      // browser.ts doesn't export a close() method for the browser instance itself easily?
      // Ah, browser.ts has close() logic inside launch checks but maybe not public?
      // Actually `browser.getBrowser()?.close()` works if exposed.
      const b = browser.getBrowser();
      if (b) await b.close();
  }
}

// Run main only if directly executed
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
