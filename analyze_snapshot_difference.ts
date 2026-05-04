import { BrowserManager } from './agent-browser/src/browser.js';

/**
 * Demonstrate that snapshots are different because of:
 * 1. Different browser instances
 * 2. Different page states
 * 3. Different timing
 */
async function demonstrateDifference() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SNAPSHOT DIFFERENCE ANALYSIS                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 UNDERSTANDING THE DIFFERENCE\n');
  console.log('The CLI command `agent-browser snapshot` and your code are');
  console.log('taking snapshots of DIFFERENT browser instances!\n');
  
  console.log('─'.repeat(70));
  console.log();
  
  const browser = new BrowserManager();
  await browser.launch({ headless: true });
  
  // Test 1: Blank page
  console.log('TEST 1: Snapshot of blank page (default)\n');
  let snapshot = await browser.getSnapshot();
  console.log('URL:', browser.getPage().url());
  console.log('Snapshot length:', snapshot.tree.length);
  console.log('Snapshot:', snapshot.tree);
  console.log();
  
  console.log('─'.repeat(70));
  console.log();
  
  // Test 2: Simple page
  console.log('TEST 2: Snapshot right after navigation\n');
  await browser.getPage().goto('https://example.com');
  snapshot = await browser.getSnapshot();
  console.log('URL:', browser.getPage().url());
  console.log('Snapshot length:', snapshot.tree.length);
  console.log('Refs count:', Object.keys(snapshot.refs).length);
  console.log('First 300 chars:', snapshot.tree.substring(0, 300));
  console.log();
  
  console.log('─'.repeat(70));
  console.log();
  
  // Test 3: After wait
  console.log('TEST 3: Snapshot after waiting for load state\n');
  await browser.getPage().waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  snapshot = await browser.getSnapshot();
  console.log('URL:', browser.getPage().url());
  console.log('Snapshot length:', snapshot.tree.length);
  console.log('Refs count:', Object.keys(snapshot.refs).length);
  console.log();
  
  console.log('─'.repeat(70));
  console.log();
  
  console.log('🔍 THE REAL ISSUE:\n');
  console.log('1. CLI `agent-browser snapshot`:');
  console.log('   - Connects to an ALREADY RUNNING browser (PID 4352)');
  console.log('   - That browser is on: https://epralima.inovarmais.com/...');
  console.log('   - The page has LOADED DYNAMIC CONTENT');
  console.log('   - Taking snapshot of THAT page state\n');
  
  console.log('2. Your main.ts code:');
  console.log('   - Creates a NEW browser instance');
  console.log('   - Navigates to the same URL');
  console.log('   - Takes snapshot IMMEDIATELY after navigation');
  console.log('   - Page may not have fully loaded yet\n');
  
  console.log('─'.repeat(70));
  console.log();
  
  console.log('✅ SOLUTIONS:\n');
  console.log('Option 1: Wait for page to load completely');
  console.log('  await page.goto(url, { waitUntil: "networkidle" });');
  console.log('  await page.waitForTimeout(2000); // Extra time for JS\n');
  
  console.log('Option 2: Wait for specific elements');
  console.log('  await page.waitForSelector("table", { timeout: 10000 });\n');
  
  console.log('Option 3: Connect to the SAME browser the CLI uses');
  console.log('  Use CDP connection to existing browser\n');
  
  console.log('Option 4: Use the CLI method within your code');
  console.log('  Launch daemon, then use CLI commands\n');
  
  await browser.getBrowser()?.close();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Analysis Complete                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

demonstrateDifference();
