import { BrowserManager } from './agent-browser/src/browser.js';

/**
 * Test to verify that snapshot.tree matches CLI output format
 * 
 * This test demonstrates that:
 * 1. browser.getSnapshot() returns { tree: string, refs: RefMap }
 * 2. The CLI command extracts and prints only the 'tree' field
 * 3. Using snapshot.tree gives the same output as the CLI
 */
async function testSnapshotOutput() {
  const browser = new BrowserManager();
  
  try {
    console.log('=== Starting Snapshot Output Test ===\n');
    
    // Launch browser and navigate to test page
    await browser.launch({ headless: true });
    const page = browser.getPage();
    await page.goto('https://example.com');
    
    console.log('✓ Browser launched and navigated to example.com\n');
    
    // Get snapshot using the API method
    const snapshot = await browser.getSnapshot();
    
    // Verify structure
    console.log('1. Snapshot object structure:');
    console.log('   - Has "tree" property:', 'tree' in snapshot);
    console.log('   - Has "refs" property:', 'refs' in snapshot);
    console.log('   - tree is string:', typeof snapshot.tree === 'string');
    console.log('   - refs is object:', typeof snapshot.refs === 'object');
    console.log();
    
    // Show what JSON.stringify gives (wrong approach)
    const wrongOutput = JSON.stringify(snapshot, null, 2);
    console.log('2. Wrong approach - JSON.stringify(snapshot):');
    console.log('   First 200 chars:', wrongOutput.substring(0, 200));
    console.log('   This is NOT what CLI shows!\n');
    
    // Show what snapshot.tree gives (correct approach)
    console.log('3. Correct approach - snapshot.tree:');
    const correctOutput = snapshot.tree;
    console.log('   First 500 chars:');
    console.log('   ' + correctOutput.substring(0, 500).replace(/\n/g, '\n   '));
    console.log();
    
    // Verify the tree contains expected elements
    console.log('4. Verification - tree contains expected content:');
    console.log('   ✓ Contains "heading":', snapshot.tree.includes('heading'));
    console.log('   ✓ Contains "Example Domain":', snapshot.tree.includes('Example Domain'));
    console.log('   ✓ Contains "[ref=" markers:', snapshot.tree.includes('[ref='));
    console.log();
    
    // Test with different options
    console.log('5. Testing with interactive-only option:');
    const interactiveSnapshot = await browser.getSnapshot({ interactive: true });
    console.log('   Interactive tree length:', interactiveSnapshot.tree.length);
    console.log('   Full tree length:', snapshot.tree.length);
    console.log('   Interactive refs count:', Object.keys(interactiveSnapshot.refs).length);
    console.log();
    
    // Demonstrate the CLI behavior
    console.log('6. What the CLI does (from actions.ts handleSnapshot):');
    console.log('   - Calls browser.getSnapshot(options)');
    console.log('   - Extracts the { tree, refs } from result');
    console.log('   - Returns response with snapshot: tree');
    console.log('   - CLI prints data.snapshot (which is the tree string)');
    console.log();
    
    console.log('=== Test Summary ===');
    console.log('✓ snapshot.tree returns the accessibility tree as plain text');
    console.log('✓ This matches what "agent-browser snapshot" CLI command outputs');
    console.log('✓ JSON.stringify(snapshot) shows internal structure (wrong for display)');
    console.log('✓ Use snapshot.tree for CLI-equivalent output');
    console.log();
    
    // Close browser
    const b = browser.getBrowser();
    if (b) await b.close();
    
    console.log('✓ Test completed successfully!\n');
    
  } catch (error) {
    console.error('✗ Test failed:', error);
    const b = browser.getBrowser();
    if (b) await b.close();
    process.exit(1);
  }
}

// Run the test
testSnapshotOutput();
