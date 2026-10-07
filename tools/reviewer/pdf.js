/* =========================================================================
   REVIEWER PDF — prints docs/reviewer/index.html to
   docs/reviewer/Sympan-Universe-Defense-Reviewer.pdf with Chrome.

   Run after build.js. Needs Chrome and puppeteer-core (NODE_PATH, as for
   tests/smoke.js).
   Run: node tools/reviewer/pdf.js
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');
var ROOT = __dirname + '/../../';
// The site's own helpers (js/dsa/ and escapeHtml), loaded into this process.
var SITE_HELPERS = ['dsa/arrays', 'dsa/strings', 'dsa/numbers', 'dsa/dates', 'dsa/hashing', 'frontend/ui/dom'];
for (var sh = 0; sh < SITE_HELPERS.length; sh++) {
    vm.runInThisContext(fs.readFileSync(ROOT + 'js/' + SITE_HELPERS[sh] + '.js', 'utf8'), { filename: SITE_HELPERS[sh] + '.js' });
}
var puppeteer = require('puppeteer-core');

var CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
var SOURCE = 'file:///' + swapText(ROOT, '\\', '/') + 'docs/reviewer/index.html';
var OUTPUT = ROOT + 'docs/reviewer/Sympan-Universe-Defense-Reviewer.pdf';

async function run() {
    var browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
    var page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto(SOURCE, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: OUTPUT, format: 'A4', printBackground: true, preferCSSPageSize: true, outline: true, tagged: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="font-size:7pt;color:#888;width:100%;padding:0 13mm;display:flex;justify-content:space-between;">' +
            '<span>Sýmpan Universe · Defense Reviewer</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
    });
    await browser.close();
    console.log('wrote docs/reviewer/Sympan-Universe-Defense-Reviewer.pdf (' + Math.round(fs.statSync(OUTPUT).size / 1024) + ' KB)');
}

run().then(function () {}, function (e) { console.log(e); process.exitCode = 1; });
