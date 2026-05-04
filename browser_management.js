"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManagement = void 0;
class BrowserManagement {
    constructor(page) {
        this.page = page;
        this.username = process.env.INOVAR_USERNAME;
        this.password = process.env.INOVAR_PASSWORD;
    }
    async openInovar(username, password) {
        const user = username || this.username;
        const pass = password || this.password;
        if (!user || !pass) {
            throw new Error('Username and password are required');
        }
        await this.page.goto('https://epralima.inovarmais.com/alunos/Inicial.wgx');
        await this.page.locator('#TRG_60').click();
        await this.page.locator('#TRG_60').fill(user);
        await this.page.locator('#TRG_60').press('Tab');
        await this.page.locator('#TRG_59').click();
        await this.page.locator('#TRG_59').fill(pass);
        await this.page.locator('#VWG_68 span').click();
    }
    async openInovarSumario() {
        await this.page
            .locator('div')
            .filter({ hasText: /^Área Docente$/ })
            .nth(5)
            .click();
        await this.page
            .locator('#VWG_170 > .cbl1 > div > div > div > .cbl3')
            .click();
    }
    async openInovarNextWeekSumario() {
        await this.page
            .locator('#VWG_187 > .ct2 > .cb9 > .cb20 > .cb52 > tbody > tr > td')
            .click();
    }
    async getFullHtml() {
        const html = await this.page.content();
        return html;
    }
}
exports.BrowserManagement = BrowserManagement;
// Example usage (commented out - set environment variables first)
// const browser = await chromium.launch();
// const page = await browser.newPage();
// const inovar = new BrowserManagement(page);
// await inovar.openInovar();
// await inovar.openInovarSumario();
// await inovar.openInovarNextWeekSumario();
//test('test', async ({ page }) => {
//  await page.goto('https://epralima.inovarmais.com/alunos/Inicial.wgx');
//  await page.locator('#TRG_60').click();
//  await page.locator('#TRG_60').fill('250558122');
//  await page.locator('#TRG_60').press('Tab');
//  await page.locator('#TRG_59').click();
//  await page.locator('#TRG_59').fill('V4!Dgv7SHWynSDq');
//  await page.locator('#VWG_68 span').click();
//  await page.locator('div').filter({ hasText: /^Área Docente$/ }).nth(5).click();
//  await page.locator('#VWG_170 > .cbl1 > div > div > div > .cbl3').click();
//  await page.locator('#VWG_187 > .ct2 > .cb9 > .cb20 > .cb52 > tbody > tr > td').click();
//});
//
//export class BrowserManagement{
//    constructor() {}
//
//      async openInovar(): Promise<any> {
//    const username = process.env.INOVAR_USERNAME;
//    const password = process.env.INOVAR_PASSWORD;
//
//    if (!username || !password) {
//        console.error("Username or password missing");
//        console.error("Set INOVAR_USERNAME and INOVAR_PASSWORD environment variables");
//        return { error: "Missing credentials" };
//    }
//
//    const url = "https://epralima.inovarmais.com/alunos/Inicial.wgx";
//    await this.openUrl(url);
//
//    debug("Waiting for login form to load...");
//    // Wait for the page to fully load and inputs to be available
//    await this.browser.getPage().waitForTimeout(2000);
//    
//    // Get snapshot to find login fields
//    const snapshot = await this.browser.getSnapshot();
//    debug("Interactive elements found:", Object.keys(snapshot.refs).length);
//    
//    // Find textbox elements
//    const textboxes = Object.entries(snapshot.refs)
//      .filter(([_, info]) => info.role === 'textbox');
//    
//    debug("Textboxes found:", textboxes.length);
//    
//    if (textboxes.length >= 2) {
//         const [userRef, _] = textboxes[0];
//         const [passRef, __] = textboxes[1];
//         
//         debug(`Filling username into ${userRef}...`);
//         const userLocator = this.browser.getLocatorFromRef(userRef);
//         if (userLocator) {
//           await userLocator.clear();
//           await userLocator.fill(username);
//         }
//         
//         debug(`Filling password into ${passRef}...`);
//         const passLocator = this.browser.getLocatorFromRef(passRef);
//         if (passLocator) {
//           await passLocator.clear();
//           await passLocator.fill(password);
//         }
//         
//         debug("Submitting login form...");
//         await this.browser.getPage().keyboard.press('Enter');
//         
//         // Wait for navigation after login
//         debug("Waiting for page to load after login...");
//         await this.browser.getPage().waitForLoadState('networkidle', { timeout: 30000 });
//         await this.browser.getPage().waitForTimeout(3000); // Extra time for dynamic content
//         
//         debug("Login complete!");
//    } else {
//        console.warn("Could not find enough input fields for Inovar login");
//        console.warn("Found textboxes:", textboxes);
//    }
//    
//    return await this.browser.getSnapshot();
//  }
//
//    async openSumarioInovar(): Promise<any> {
//      // Open the Sumario Inovar page
//      const result = await this.page.goto('epralima.inovarmais.com/alunos/Inicial.wgx');
//      return result;
//  }
//
//    async getFullHtml(): Promise<string> {
//        // Get the full HTML content
//        const html = await this.page.content();
//        return html;
//    }
//
//    async getNextWeekHtmlHorario(): Promise<{ result_openSumarioInovar: any; html: string }> {
//      // Open the Sumario Inovar page
//      const result_openSumarioInovar = await this.openSumarioInovar();
//      
//      // Go to next week 
//      
//
//      // Get the full HTML content
//      const html = await this.getFullHtml();
//
//      return {
//        result_openSumarioInovar,
//        html
//      };
//  }
//}
