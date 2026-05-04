# Plan: Porting Browser Services to TypeScript

This plan details how to translate the functionality of `@commands/services/browser_services.py` (Python) into `@typescript/agent-browser/main.ts`.

The goal is to implement a `BrowserAutomationService` class in `main.ts` that wraps the existing `BrowserManager` and provides high-level automation capabilities, table parsing, and specific workflows.

## 1. Class Structure

Create a class `BrowserAutomationService` in `main.ts`.

```typescript
import { BrowserManager } from './src/browser.js';
import { type EnhancedSnapshot } from './src/snapshot.js';

class BrowserAutomationService {
  constructor(private browser: BrowserManager) {}
  // methods go here...
}
```

## 2. Core Navigation & State

Implement these basic wrappers:

- **`getOpenedUrl()`**:
  - **Source**: `get_opened_url`
  - **Implementation**: Return `this.browser.getPage().url()`.

- **`openUrl(url: string)`**:
  - **Source**: `open_url_in_attribute`
  - **Implementation**:
    1. Check `getOpenedUrl()`.
    2. If current URL == target URL, return early (already open).
    3. Call `this.browser.getPage().goto(url)`.

- **`getFullHtml()`**:
  - **Source**: *New request*
  - **Implementation**: Return `await this.browser.getPage().content()`.

## 3. Snapshot & Ref Logic

Leverage `BrowserManager.getSnapshot`:

- **`getInteractiveElementCount()`**:
  - **Source**: `_how_much_interactive_elements`
  - **Implementation**:
    1. Call `await this.browser.getSnapshot({ interactive: true })`.
    2. Return `Object.keys(snapshot.refs).length`.

- **`waitForMinRefs(minRefs: number, timeoutSecs: number = 10)`**:
  - **Source**: `wait_for_min_refs`
  - **Implementation**:
    - Loop with `setTimeout` or `while` loop with delay.
    - Check `getInteractiveElementCount()`.
    - Return count if >= `minRefs` or timeout reached.

- **`getRefsByRole(role: string)`**:
  - **Source**: `get_refs_by_role`
  - **Implementation**:
    1. Get snapshot.
    2. Filter `snapshot.refs` where `value.role === role`.
    3. Return array of `{ ref, name }`.

## 4. Table Parsing & Schedule Logic

This is the most complex part, requiring porting the text-tree parsing logic.

### 4.1. Tree Parsing Helpers (Private)
Port the static methods from Python:
- **`parseSnapshotTree(snapshotText: string)`**:
  - Parses the indented snapshot string into a tree object structure (`{ type, name, ref, children }`).
  - **Logic**: Stack-based indentation parser (mimic `_parse_snapshot_tree`).
- **`parseSnapshotLine(text: string)`**:
  - Helper to extract type, name, and ref from a single line string (regex matching).

### 4.2. Table Extraction
- **`getSnapshotTables(snapshot?: EnhancedSnapshot)`**:
  - **Source**: `get_snapshot_tables`
  - **Implementation**:
    1. Get snapshot (if not provided).
    2. Parse tree using `parseSnapshotTree`.
    3. Traverse tree to find nodes of type "table".
    4. Convert table nodes to 2D string arrays (Table -> RowGroup -> Row -> Cell).

- **`findTablesWithText(text: string)`**:
  - **Source**: `find_tables_with_text`
  - **Implementation**:
    - Get tables.
    - Iterate and search for `text` (case-insensitive option).

### 4.3. Schedule Heuristics
- **`buildScheduleGrid(snapshot?: EnhancedSnapshot)`**:
  - **Source**: `build_schedule_grid`
  - **Implementation**:
    - Regex for Dates (`\d{2}-\d{2}-\d{4}`) and Times (`^\d{3,4}$`).
    - Score tables to find the schedule table (most dates/times).
    - Map columns to dates.
    - extract events: `{ date, time, text }`.

- **`extractScheduleByDate(snapshot?: EnhancedSnapshot)`**:
  - **Source**: `extract_schedule_by_date`
  - **Implementation**:
    - Use `buildScheduleGrid`.
    - Group events by date.
    - Normalize times (e.g., 1425 -> 1400).
    - **Note**: You may need a simple `TeacherDataConverter` stub or implementation if class name normalization is strictly required.

## 5. Specific Workflows

Implement the high-level business logic:

- **`openInovar(username, password)`**:
  - **Source**: `open_inovar`
  - **Implementation**:
    1. `openUrl("epralima.inovarmais.com/alunos/Inicial.wgx")`.
    2. `browser.getPage().fill()` for username/password (using refs or selectors).
    3. `browser.getPage().press('Enter')`.
    4. Return snapshot.

- **`openSumarioInovar()`**:
  - **Source**: `open_sumario_inovar`
  - **Implementation**:
    1. Call `openInovar`.
    2. Check ref count (if high, maybe already there).
    3. Click navigation elements (need specific selectors/refs, e.g., `@e4`, `@e9` from Python code - *Note: Refs are dynamic in the new system, so we might need robust selectors or to find refs by name first*).
    4. `waitForMinRefs(80)`.
    5. Perform scroll actions to ensure lazy loading.

## 6. Implementation Steps in `main.ts`

1.  **Define Interface**: Define the `SnapshotNode` interface for the tree parser.
2.  **Implement Service**: Create the `BrowserAutomationService` class.
3.  **Port Parsing Logic**: Add the tree parsing and table extraction methods.
4.  **Port Business Logic**: Add the schedule grid and workflow methods.
5.  **Main Execution**: Update the `main` execution block to instantiate this service and demonstrate usage (e.g., log into Inovar and print schedule).
