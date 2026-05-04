# Snapshot Difference Explained ✅

## Problem Summary

The snapshot from `browser.getSnapshot()` in your code differs from `agent-browser snapshot` CLI output.

## Root Cause: Different Browser Instances & Page States

### CLI Browser Status
```bash
$ agent-browser get url
https://epralima.inovarmais.com/alunos/Inicial.wgx

$ agent-browser get title  
Inovar Alunos (2012.488 r10585) - 2025/26 (2.º Período)

$ agent-browser snapshot | head -30
- document:
  - table:
    - rowgroup:
      - row "PESSOAL DOCENTE Diogo Freitas Oliveira":
        - cell "PESSOAL DOCENTE Diogo Freitas Oliveira" [ref=e1]
  - table:
    - rowgroup:
      - row "Área Docente Área Administrativa":
        - cell "Área Docente" [ref=e4]
        - cell "Área Administrativa" [ref=e5]
  - table:
    - rowgroup:
      - row "Eventos Inicial Sumários Avaliações...":
        ...
```

**Status:** ✅ LOGGED IN and on the main application page with full UI

### Your main.ts Code Status
```typescript
await service.openInovar();
const snapshot = await browser.getSnapshot();

Output:
=== SNAPSHOT ===
Snapshot length: 750
Refs count: 4

Snapshot tree:
- document:
  - textbox [ref=e2]: "250558122"
  - textbox [ref=e3] [nth=1]: V4!Dgv7SHWynSDq
  - text: Inovar +AZ - Sistemas de Informação...
```

**Status:** ❌ STILL ON LOGIN PAGE (showing username/password fields)

## The Differences Explained

### 1. **Different Browser Instances**
- **CLI**: Connects to a long-running browser process (PID 4352)
- **Your Code**: Creates a fresh new browser instance each time

### 2. **Different Page States**
- **CLI**: Already logged in, viewing the main dashboard/menu
- **Your Code**: On the login page, hasn't submitted credentials yet

### 3. **Different Timing**
- **CLI**: Page has been loaded for a while, all dynamic content rendered
- **Your Code**: Just navigated, may still be loading JavaScript/dynamic content

## Why Your Code Stops at Login Page

Looking at your `openInovar()` method:

```typescript
async openInovar(): Promise<any> {
    const username = process.env.INOVAR_USERNAME;
    const password = process.env.INOVAR_PASSWORD;

    if (!username || !password) {
        console.error("Username or password missing");  // ← This is the issue!
        return { error: "Missing credentials" };
    }

    const url = "https://epralima.inovarmais.com/alunos/Inicial.wgx";
    await this.openUrl(url);
    
    // ... login code that isn't executing ...
}
```

**Check:** Are `INOVAR_USERNAME` and `INOVAR_PASSWORD` environment variables set?

If not, the method returns early and never fills in the credentials!

## Solutions

### Solution 1: Set Environment Variables

```bash
export INOVAR_USERNAME="your_username"
export INOVAR_PASSWORD="your_password"
npx tsx main.ts
```

Or in your terminal session:
```bash
INOVAR_USERNAME="user" INOVAR_PASSWORD="pass" npx tsx main.ts
```

### Solution 2: Wait for Login Page to Load Completely

The current fix (added `waitUntil: 'networkidle'`) helps, but you also need:

```typescript
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

    // Wait for login form to be fully loaded
    await this.browser.getPage().waitForSelector('input[type="text"], input[type="password"]', 
      { timeout: 10000 }
    );
    
    const snapshot = await this.browser.getSnapshot({ interactive: true });
    const textboxes = Object.entries(snapshot.refs)
      .filter(([_, info]) => info.role === 'textbox');
    
    if (textboxes.length >= 2) {
         const [userRef, _] = textboxes[0];
         const [passRef, __] = textboxes[1];
         
         const userLocator = this.browser.getLocatorFromRef(userRef);
         const passLocator = this.browser.getLocatorFromRef(passRef);

         if (userLocator) await userLocator.fill(username);
         if (passLocator) await passLocator.fill(password);
         
         await this.browser.getPage().keyboard.press('Enter');
         
         // Wait for navigation after login
         await this.browser.getPage().waitForLoadState('networkidle', { timeout: 30000 });
         await this.browser.getPage().waitForTimeout(2000); // Extra time for dynamic content
    } else {
        console.warn("Could not find enough input fields for Inovar login");
    }
    
    return await this.browser.getSnapshot();
}
```

### Solution 3: Connect to Existing Browser (Like CLI Does)

The CLI uses a daemon mode where the browser stays open. You can do the same:

```bash
# In one terminal - start the daemon
cd /home/prof/typescript/agent-browser
./bin/agent-browser-linux-x64 daemon &

# In another terminal - use it
./bin/agent-browser-linux-x64 open "https://example.com"
./bin/agent-browser-linux-x64 snapshot
```

## Verification Steps

### Check if credentials are set:
```bash
echo $INOVAR_USERNAME
echo $INOVAR_PASSWORD
```

### Check what your code sees:
Add debug logging:
```typescript
console.log('Username:', process.env.INOVAR_USERNAME ? '✓ SET' : '✗ NOT SET');
console.log('Password:', process.env.INOVAR_PASSWORD ? '✓ SET' : '✗ NOT SET');
```

### Compare snapshots at same page state:
To get a fair comparison, both should be:
1. On the same page (both on login OR both on dashboard)
2. With the same wait time for content to load
3. Using the same snapshot options

## Summary

| Aspect | CLI Browser | Your Code |
|--------|-------------|-----------|
| Browser Instance | Existing (PID 4352) | New instance |
| Page | Logged in dashboard | Login page |
| Content Loaded | ✅ Full | ⚠️ Partial |
| Credentials | Already used | ❌ Missing/Not applied |
| Snapshot Method | ✅ Same | ✅ Same |

**The snapshot METHOD (`getSnapshot()` vs CLI) is identical.**  
**The DIFFERENCE is in what page you're looking at!**

## Next Steps

1. ✅ Set environment variables for credentials
2. ✅ Add waits for page load (`networkidle`)
3. ✅ Wait after login for dashboard to load
4. ✅ Then compare snapshots again

Both should show similar content when viewing the same page state.
