/* =========================================================================
   TEST HARNESS — loads the site's scripts into a fresh sandbox and keeps
   score. The test files follow the same house rules as the site (no
   banned built-ins, no regular expressions), so core.js is loaded into
   the test process too and its helpers are used here.
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');

var ROOT = __dirname + '/../';
var score = { passed: 0, failed: 0, failures: [] };

/* Read a project file as text.            Time O(n) · Space O(n) */
function readText(relative) {
    return fs.readFileSync(ROOT + relative, 'utf8');
}

/* Load core.js into this Node process so the tests can use its helpers. */
vm.runInThisContext(readText('js/core.js'), { filename: 'core.js' });

/* A fresh sandbox with the named js/ files loaded in order.
                                           Time O(n) · Space O(n) */
function loadApp(files) {
    var sandbox = vm.createContext({ Math: Math, Date: Date, String: String, Number: Number, isNaN: isNaN });
    for (var i = 0; i < files.length; i++) {
        vm.runInContext(readText('js/' + files[i] + '.js'), sandbox, { filename: files[i] + '.js' });
    }
    // Tests never touch the shop's real EmailJS account: whatever is in
    // js/email-config.js, the sandbox starts as "not set up".
    if (sandbox.EMAIL_CONFIG) {
        sandbox.EMAIL_CONFIG.serviceId = ''; sandbox.EMAIL_CONFIG.templateId = ''; sandbox.EMAIL_CONFIG.publicKey = '';
    }
    return sandbox;
}

/* Everything the data layer needs.        Time O(n) · Space O(n) */
function loadStore() {
    return loadApp(['core', 'structures', 'algorithms', 'data', 'email-config', 'store', 'orders', 'notify', 'editing', 'reports', 'seed']);
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

module.exports = { ROOT: ROOT, readText: readText, loadApp: loadApp, loadStore: loadStore,
                   check: check, section: section, finish: finish, exists: exists, fs: fs };
