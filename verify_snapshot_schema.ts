import { BrowserManager } from './agent-browser/src/browser.js';

/**
 * Comprehensive verification test demonstrating the difference between
 * snapshot.tree and JSON.stringify(snapshot)
 */
async function verifySnapshotBehavior() {
  const browser = new BrowserManager();
  
  try {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   SNAPSHOT OUTPUT VERIFICATION TEST                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    await browser.launch({ headless: true });
    const page = browser.getPage();
    await page.goto('https://example.com');
    
    // Get snapshot
    const snapshot = await browser.getSnapshot();
    
    console.log('📋 PART 1: Understanding the Data Structure\n');
    console.log('browser.getSnapshot() returns an EnhancedSnapshot object with:');
    console.log('  • tree: string    - The accessibility tree text');
    console.log('  • refs: RefMap    - Element reference mappings');
    console.log();
    
    console.log('Actual structure:');
    console.log('  typeof snapshot:', typeof snapshot);
    console.log('  typeof snapshot.tree:', typeof snapshot.tree);
    console.log('  typeof snapshot.refs:', typeof snapshot.refs);
    console.log('  Object.keys(snapshot):', Object.keys(snapshot).join(', '));
    console.log();
    
    console.log('─'.repeat(70));
    console.log();
    
    console.log('📋 PART 2: WRONG Approach - JSON.stringify(snapshot)\n');
    console.log('When you do: JSON.stringify(await browser.getSnapshot(), null, 2)');
    console.log('You get the OBJECT structure, not the tree text:\n');
    
    const wrongOutput = JSON.stringify(snapshot, null, 2);
    const wrongLines = wrongOutput.split('\n').slice(0, 15);
    wrongLines.forEach(line => console.log('  ' + line));
    console.log('  ...(truncated)...\n');
    
    console.log('❌ This is NOT what the CLI shows!');
    console.log('❌ This is the internal object representation');
    console.log();
    
    console.log('─'.repeat(70));
    console.log();
    
    console.log('📋 PART 3: CORRECT Approach - snapshot.tree\n');
    console.log('When you do: const snapshot = await browser.getSnapshot();');
    console.log('            console.log(snapshot.tree);\n');
    console.log('You get the TREE TEXT, matching the CLI output:\n');
    
    const correctOutput = snapshot.tree;
    const correctLines = correctOutput.split('\n').slice(0, 15);
    correctLines.forEach(line => console.log('  ' + line));
    console.log('  ...(truncated)...\n');
    
    console.log('✅ This matches what "agent-browser snapshot" shows!');
    console.log('✅ This is the accessibility tree as plain text');
    console.log();
    
    console.log('─'.repeat(70));
    console.log();
    
    console.log('📋 PART 4: How the CLI Works (Internally)\n');
    console.log('From agent-browser/src/actions.ts (handleSnapshot function):');
    console.log('  1. const { tree, refs } = await browser.getSnapshot(options);');
    console.log('  2. return successResponse(command.id, {');
    console.log('       snapshot: tree,  // ← Extracts just the tree string');
    console.log('       refs: simpleRefs');
    console.log('     });');
    console.log();
    console.log('From agent-browser/cli/src/output.rs:');
    console.log('  if let Some(snapshot) = data.get("snapshot") {');
    console.log('    println!("{}", snapshot);  // ← Prints the tree string');
    console.log('  }');
    console.log();
    
    console.log('─'.repeat(70));
    console.log();
    
    console.log('📋 PART 5: Verification Results\n');
    
    // Test 1: Structure check
    const hasTreeProperty = 'tree' in snapshot;
    const hasRefsProperty = 'refs' in snapshot;
    const treeIsString = typeof snapshot.tree === 'string';
    const refsIsObject = typeof snapshot.refs === 'object';
    
    console.log(`Test 1: Object structure checks`);
    console.log(`  ${hasTreeProperty ? '✅' : '❌'} Has 'tree' property`);
    console.log(`  ${hasRefsProperty ? '✅' : '❌'} Has 'refs' property`);
    console.log(`  ${treeIsString ? '✅' : '❌'} tree is a string`);
    console.log(`  ${refsIsObject ? '✅' : '❌'} refs is an object`);
    console.log();
    
    // Test 2: Content verification
    const hasHeading = snapshot.tree.includes('heading');
    const hasExampleDomain = snapshot.tree.includes('Example Domain');
    const hasRefs = snapshot.tree.includes('[ref=');
    const notJSON = !snapshot.tree.startsWith('{');
    
    console.log(`Test 2: Content format checks`);
    console.log(`  ${hasHeading ? '✅' : '❌'} Contains accessibility roles (e.g., "heading")`);
    console.log(`  ${hasExampleDomain ? '✅' : '❌'} Contains text content`);
    console.log(`  ${hasRefs ? '✅' : '❌'} Contains ref markers`);
    console.log(`  ${notJSON ? '✅' : '❌'} Is NOT JSON (is plain text tree)`);
    console.log();
    
    // Test 3: Options work correctly
    const interactiveSnapshot = await browser.getSnapshot({ interactive: true });
    const hasInteractiveTree = 'tree' in interactiveSnapshot;
    const interactiveIsString = typeof interactiveSnapshot.tree === 'string';
    
    console.log(`Test 3: Options work correctly`);
    console.log(`  ${hasInteractiveTree ? '✅' : '❌'} Interactive mode returns same structure`);
    console.log(`  ${interactiveIsString ? '✅' : '❌'} Interactive tree is also a string`);
    console.log(`  ${interactiveSnapshot.tree.length < snapshot.tree.length ? '✅' : '❌'} Interactive tree is shorter (filtered)`);
    console.log();
    
    console.log('─'.repeat(70));
    console.log();
    
    console.log('🎯 CONCLUSION:\n');
    console.log('  To match CLI output:  console.log(snapshot.tree)');
    console.log('  NOT:                  console.log(JSON.stringify(snapshot))');
    console.log();
    console.log('  In your main.ts:');
    console.log('    ✅ const snapshot = await browser.getSnapshot();');
    console.log('    ✅ console.log("snapshot:", snapshot.tree);');
    console.log();
    console.log('    ❌ console.log("snapshot:", JSON.stringify(');
    console.log('         await browser.getSnapshot(), null, 2));');
    console.log();
    
    // Summary
    const allPassed = hasTreeProperty && hasRefsProperty && treeIsString && 
                      refsIsObject && hasHeading && hasExampleDomain && 
                      hasRefs && notJSON && hasInteractiveTree && interactiveIsString;
    
    if (allPassed) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ ALL TESTS PASSED - Verification Complete!               ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('❌ Some tests failed - Check output above\n');
    }
    
    // Cleanup
    const b = browser.getBrowser();
    if (b) await b.close();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    const b = browser.getBrowser();
    if (b) await b.close();
    process.exit(1);
  }
}

verifySnapshotBehavior();
