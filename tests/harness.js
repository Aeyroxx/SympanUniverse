/* =========================================================================
   TEST HARNESS — loads the site's scripts into a fresh sandbox and keeps
   score. The test files follow the same house rules as the site (no
   banned built-ins, no regular expressions), so the site's own helpers
   (js/dsa/ and escapeHtml) are loaded into the test process too.
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');

var ROOT = __dirname + '/../';
var score = { passed: 0, failed: 0, failures: [] };

/* Read a project file as text.            Time O(n) · Space O(n) */
function readText(relative) {
    return fs.readFileSync(ROOT + relative, 'utf8');
}

/* The site's helpers, loaded into this Node process so the tests can use them. */
var HELPERS = ['dsa/arrays', 'dsa/strings', 'dsa/numbers', 'dsa/dates', 'dsa/hashing', 'frontend/ui/dom'];
for (var hp = 0; hp < HELPERS.length; hp++) vm.runInThisContext(readText('js/' + HELPERS[hp] + '.js'), { filename: HELPERS[hp] + '.js' });

/* Every script of the site, in the order index.html loads them, as paths
   under js/ without ".js" — so the tests always load what the page loads.
                                           Time O(n²) · Space O(n) */
function siteScripts() {
    var pieces = cutText(readText('index.html'), '<script src="js/'), out = [];
    for (var i = 1; i < pieces.length; i++) out[out.length] = cutText(pieces[i], '.js"')[0];
    return out;
}

/* The scripts before the screens: the DSA code, the data and the backend.
                                           Time O(n²) · Space O(n) */
function backendScripts() {
    var all = siteScripts(), out = [];
    for (var i = 0; i < all.length && !beginsWith(all[i], 'frontend/') && all[i] !== 'app'; i++) out[out.length] = all[i];
    return out;
}

/* Only the DSA folder.                    Time O(n²) · Space O(n) */
function dsaScripts() {
    var all = siteScripts(), out = [];
    for (var i = 0; i < all.length; i++) if (beginsWith(all[i], 'dsa/')) out[out.length] = all[i];
    return out;
}

/* All of the site's code as one text (to check what it must never hold).
                                           Time O(n) · Space O(n) */
function siteSource() {
    var all = siteScripts(), text = '';
    for (var i = 0; i < all.length; i++) text += readText('js/' + all[i] + '.js') + '\n';
    return text;
}

/* A fresh sandbox with the named js/ files loaded in order.
                                           Time O(n) · Space O(n) */
function loadApp(files) {
    var sandbox = vm.createContext({ Math: Math, Date: Date, String: String, Number: Number, isNaN: isNaN });
    for (var i = 0; i < files.length; i++) {
        vm.runInContext(readText('js/' + files[i] + '.js'), sandbox, { filename: files[i] + '.js' });
    }
    // Tests never touch the shop's real EmailJS account: whatever is in
    // js/data/email-config.js, the sandbox starts as "not set up".
    if (sandbox.EMAIL_CONFIG) {
        sandbox.EMAIL_CONFIG.serviceId = ''; sandbox.EMAIL_CONFIG.templateId = ''; sandbox.EMAIL_CONFIG.publicKey = '';
    }
    return sandbox;
}

/* Everything the backend needs: the DSA code, the data and the modules.
                                           Time O(n²) · Space O(n) */
function loadStore() {
    return loadApp(backendScripts());
}

/*                                         Time O(1) · Space O(1) */
function check(name, condition, detail) {
    if (condition) {
        score.passed++;
        return;
    }
    score.failed++;
    score.failures[score.failures.length] = name + (detail === undefined ? '' : '  →  ' + detail);
    console.log('  ✗ ' + name + (detail === undefined ? '' : '  →  ' + detail));
}

/*                                         Time O(1) · Space O(1) */
function section(title) {
    console.log('· ' + title);
}

/* Print the score and set the exit code.  Time O(n) · Space O(1) */
function finish(suite) {
    console.log('\n' + suite + ': ' + score.passed + ' passed, ' + score.failed + ' failed');
    process.exitCode = score.failed === 0 ? 0 : 1;
}

/* Does a project file exist?              Time O(1) · Space O(1) */
function exists(relative) {
    return fs.existsSync(ROOT + relative);
}

module.exports = { ROOT: ROOT, readText: readText, loadApp: loadApp, loadStore: loadStore, siteScripts: siteScripts,
                   backendScripts: backendScripts, dsaScripts: dsaScripts, siteSource: siteSource,
                   check: check, section: section, finish: finish, exists: exists, fs: fs };
