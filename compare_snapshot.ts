import { BrowserManager } from './agent-browser/src/browser.js';

async function compareBrowserStates() {
  const browser = new BrowserManager();
  
  try {
    await browser.launch({ headless: true });
    const page = browser.getPage();
    
    console.log('=== Browser State Comparison ===\n');
    console.log('Current URL:', page.url());
    console.log('');
    
    const snapshot = await browser.getSnapshot();
    console.log('Snapshot tree length:', snapshot.tree.length);
    console.log('Refs count:', Object.keys(snapshot.refs).length);
    console.log('');
    console.log('First 1000 chars of snapshot.tree:');
    console.log('─'.repeat(70));
    console.log(snapshot.tree.substring(0, 1000));
    console.log('─'.repeat(70));
    console.log('');
    console.log('Full snapshot:');
    console.log(snapshot.tree);
    
    await browser.getBrowser()?.close();
  } catch (error) {
    console.error('Error:', error);
    const b = browser.getBrowser();
    if (b) await b.close();
  }
}

compareBrowserStates();
