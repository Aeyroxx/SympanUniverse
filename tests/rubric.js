/* =========================================================================
   RUBRIC GATE — proves the house rules hold in every script.

     · none of the banned built-ins is called anywhere
     · no regular expressions
     · procedural, not object-oriented: no class, this, prototype, or
       new (other than new Date)
     · data lives in memory: no localStorage, sessionStorage, indexedDB,
       cookies or cross-page channels, and there is only one HTML page
     · every function in js/ states its time and space complexity, using
       only the four notations from class: O(1), O(log n), O(n), O(n²)
     · the Date built-in only reads the clock (readClock, Date.now); all
       date maths is our own day-number arithmetic

   The scanner blanks out comments and strings first, so a comment that
   names a built-in ("replaces .indexOf") is not mistaken for a call. It
   is written under the same rules it enforces: character by character,
   with the site's own helpers (js/dsa/) and no regular expressions.
   Run: node tests/rubric.js
   ========================================================================= */

var t = require('./harness');
var check = t.check, section = t.section, fs = t.fs;

var BANNED_CALLS = [
    'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'concat', 'sort', 'reverse', 'indexOf', 'lastIndexOf',
    'includes', 'find', 'findIndex', 'filter', 'map', 'forEach', 'reduce', 'some', 'every', 'join',
    'search', 'split', 'replace', 'trim', 'toLowerCase', 'toUpperCase', 'padStart', 'substring',
    // close relatives that would do the same work by another name
    'replaceAll', 'trimStart', 'trimEnd', 'padEnd', 'substr', 'match', 'matchAll', 'flat', 'flatMap',
    'findLast', 'findLastIndex', 'toSorted', 'toReversed', 'toSpliced', 'localeCompare', 'reduceRight'
];
var FORBIDDEN_WORDS = ['class', 'this', 'prototype', 'RegExp', 'localStorage', 'sessionStorage', 'indexedDB',
                       'cookie', 'BroadcastChannel', 'IntersectionObserver', 'extends', 'super'];
var BEFORE_REGEX = '(,=:[!&|?{};+-*%<>~^';
var ALLOWED_NOTATIONS = ['1', 'log n', 'n', 'n²'];
var DATE_METHODS = ['getFullYear', 'getMonth', 'getDate', 'getDay', 'getHours', 'getMinutes', 'getSeconds', 'setDate', 'setMonth',
                    'setFullYear', 'setHours', 'toISOString', 'toLocaleDateString', 'toLocaleTimeString', 'toDateString'];

/*                                         Time O(1) · Space O(1) */
function isWordChar(c) {
    var code = c.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || c === '_' || c === '$';
}

/* The last non-space character written so far, and the word ending there.
                                           Time O(n) · Space O(n) */
function lastToken(out) {
    var i = out.length - 1;
    while (i >= 0 && isSpace(out.charAt(i))) i--;
    if (i < 0) return { ch: '', word: '' };
    var end = i + 1;
    while (i >= 0 && isWordChar(out.charAt(i))) i--;
    return { ch: out.charAt(end - 1), word: textPart(out, i + 1, end) };
}

/* Blank comments and strings; report regex literals. Newlines are kept,
   so a position in the result is on the same line as in the source.
                                           Time O(n) · Space O(n) */
function codeOnly(source, problems) {
    var out = '', i = 0, line = 1, n = source.length;
    while (i < n) {
        var c = source.charAt(i), next = i + 1 < n ? source.charAt(i + 1) : '';
        if (c === '\n') { out += c; line++; i++; continue; }
        if (c === '/' && next === '/') {
            while (i < n && source.charAt(i) !== '\n') i++;
            continue;
        }
        if (c === '/' && next === '*') {
            i += 2;
            while (i < n && !(source.charAt(i) === '*' && source.charAt(i + 1) === '/')) {
                if (source.charAt(i) === '\n') { out += '\n'; line++; }
                i++;
            }
            i += 2;
            continue;
        }
        if (c === '\'' || c === '"' || c === '`') {
            i++;
            while (i < n && source.charAt(i) !== c) {
                if (source.charAt(i) === '\\') i++;
                else if (source.charAt(i) === '\n') line++;
                i++;
            }
            i++;
            out += '""';
            continue;
        }
        if (c === '/') {
            var before = lastToken(out);
            var regex = before.ch === '' || isIn(cutText(BEFORE_REGEX, ''), before.ch) || textHas(BEFORE_REGEX, before.ch) ||
                        before.word === 'return' || before.word === 'typeof' || before.word === 'case';
            if (regex) {
                listAdd(problems, 'line ' + line + ': regular expression literal');
                i++;
                var inClass = false;
                while (i < n && (source.charAt(i) !== '/' || inClass)) {
                    if (source.charAt(i) === '\\') i++;
                    else if (source.charAt(i) === '[') inClass = true;
                    else if (source.charAt(i) === ']') inClass = false;
                    i++;
                }
                i++;
                while (i < n && isWordChar(source.charAt(i))) i++;
                out += '""';
                continue;
            }
        }
        out += c;
        i++;
    }
    return out;
}

/* Every word in the code with its line.   Time O(n) · Space O(n) */
function wordsOf(code) {
    var words = [], i = 0, line = 1;
    while (i < code.length) {
        var c = code.charAt(i);
        if (c === '\n') { line++; i++; continue; }
        if (!isWordChar(c) || (i > 0 && isWordChar(code.charAt(i - 1)))) { i++; continue; }
        var start = i;
        while (i < code.length && isWordChar(code.charAt(i))) i++;
        var j = i;
        while (j < code.length && (code.charAt(j) === ' ' || code.charAt(j) === '\t')) j++;
        var k = start - 1;
        while (k >= 0 && (code.charAt(k) === ' ' || code.charAt(k) === '\t' || code.charAt(k) === '\n')) k--;
        listAdd(words, { word: textPart(code, start, i), line: line, afterDot: k >= 0 && code.charAt(k) === '.',
                         beforeParen: j < code.length && code.charAt(j) === '(', at: start, end: i });
    }
    return words;
}

/* Banned calls, OOP and storage in one file.  Time O(n²) · Space O(n) */
function scanFile(relative) {
    var problems = [];
    var code = codeOnly(t.readText(relative), problems);
    var words = wordsOf(code);
    for (var w = 0; w < words.length; w++) {
        var word = words[w];
        if (word.afterDot && word.beforeParen && isIn(BANNED_CALLS, word.word)) {
            listAdd(problems, 'line ' + word.line + ': .' + word.word + '(');
        }
        if (isIn(FORBIDDEN_WORDS, word.word)) listAdd(problems, 'line ' + word.line + ': ' + word.word);
        if (word.word === 'new' && !word.afterDot) {
            var following = w + 1 < words.length ? words[w + 1].word : '';
            if (following !== 'Date') listAdd(problems, 'line ' + word.line + ': new ' + following);
        }
    }
    return problems;
}

/* Named functions in a js/ file whose comment lacks "Time O(" and
   "Space O(". Covered: top-level declarations, nested declarations, and
   functions assigned to a variable. A group of one-line top-level look-ups
   may share one comment, so for those the search reaches back up to seven
   lines; a nested or assigned function needs its note on the line just
   above it. Inline callbacks (passed straight to keepWhere and the like)
   are part of the function that calls them.  Time O(n²) · Space O(n) */
function unannotated(relative) {
    var lines = cutText(t.readText(relative), '\n'), out = [];
    for (var i = 0; i < lines.length; i++) {
        var line = strip(lines[i]);
        var topLevel = beginsWith(lines[i], 'function ');
        var named = beginsWith(line, 'function ') && line.charAt(9) !== '(';
        var nested = !topLevel && (named || (beginsWith(line, 'var ') && textHas(line, '= function')));
        if (!topLevel && !nested) continue;
        var reach = topLevel ? 7 : 1, found = false;
        for (var back = i - 1; back >= 0 && back >= i - reach && !found; back--) {
            if (textHas(lines[back], 'Time O(') && textHas(lines[back], 'Space O(')) found = true;
        }
        if (!found) listAdd(out, relative + ':' + (i + 1) + ' ' + textPart(line, 0, 48));
    }
    return out;
}

/* Every "O(…)" written in a file whose inside is not one of the four
   notations from class.                  Time O(n) · Space O(n) */
function otherNotations(relative) {
    var text = t.readText(relative), out = [], line = 1;
    for (var i = 0; i < text.length; i++) {
        var c = text.charAt(i);
        if (c === '\n') { line++; continue; }
        if (c !== 'O' || text.charAt(i + 1) !== '(' || (i > 0 && isWordChar(text.charAt(i - 1)))) continue;
        var end = i + 2;
        while (end < text.length && text.charAt(end) !== ')' && text.charAt(end) !== '\n') end++;
        var inside = textPart(text, i + 2, end);
        if (!isIn(ALLOWED_NOTATIONS, inside)) listAdd(out, relative + ':' + line + ' O(' + inside + ')');
    }
    return out;
}

/* Uses of the Date built-in other than reading the clock: "new Date" is
   allowed only inside readClock in js/dsa/dates.js, Date.now() anywhere, and none
   of Date's calendar methods at all.     Time O(n) · Space O(n) */
function dateMaths(relative) {
    var problems = [], code = codeOnly(t.readText(relative), problems), words = wordsOf(code), out = [];
    var lines = cutText(t.readText(relative), '\n');
    for (var w = 0; w < words.length; w++) {
        var word = words[w];
        if (word.afterDot && word.beforeParen && isIn(DATE_METHODS, word.word)) listAdd(out, relative + ':' + word.line + ' .' + word.word + '(');
        if (word.word === 'new' && w + 1 < words.length && words[w + 1].word === 'Date') {
            var inClock = relative === 'js/dsa/dates.js' && textHas(lines[word.line - 2] || '', 'function readClock');
            if (!inClock) listAdd(out, relative + ':' + word.line + ' new Date');
        }
    }
    return out;
}

/* *.js files in a folder and every folder inside it.
                                           Time O(n) · Space O(n) */
function scriptsIn(folder) {
    var names = fs.readdirSync(t.ROOT + folder), out = [];
    for (var i = 0; i < names.length; i++) {
        var name = names[i], inner = folder + '/' + name;
        if (fs.statSync(t.ROOT + inner).isDirectory()) {
            var deeper = scriptsIn(inner);
            for (var d = 0; d < deeper.length; d++) listAdd(out, deeper[d]);
        } else if (name.length > 3 && textPart(name, name.length - 3) === '.js') listAdd(out, inner);
    }
    return out;
}

/* ===================================================================== */
var appFiles = scriptsIn('js'), testFiles = scriptsIn('tests');
var loaded = t.siteScripts(), notLoaded = [];
for (var af = 0; af < appFiles.length; af++) {
    if (!isIn(loaded, textPart(appFiles[af], 3, appFiles[af].length - 3))) listAdd(notLoaded, appFiles[af]);
}
var toolFiles = t.fs.existsSync(t.ROOT + 'tools/reviewer') ? scriptsIn('tools/reviewer') : [];
for (var tf = 0; tf < toolFiles.length; tf++) listAdd(testFiles, toolFiles[tf]);

section('banned built-ins, regular expressions, OOP and storage — js/');
for (var a = 0; a < appFiles.length; a++) {
    var appProblems = scanFile(appFiles[a]);
    check(appFiles[a], appProblems.length === 0, glue(appProblems, '; '));
}

check('every script in js/ is loaded by index.html', notLoaded.length === 0, glue(notLoaded, ', '));

section('the same rules — tests/ and tools/');
for (var b = 0; b < testFiles.length; b++) {
    var testProblems = scanFile(testFiles[b]);
    check(testFiles[b], testProblems.length === 0, glue(testProblems, '; '));
}

section('the scanner catches what it should');
var trap = [];
var probe = 'tests/rubric-probe.tmp.js';
fs.writeFileSync(t.ROOT + probe, 'var a = [];\n// a.push(1) in a comment is fine\nvar s = "x.sort()";\na.push(1);\n' +
    'var r = /ab+c/g;\nfunction F() { this.x = 1; }\nvar d = new Date();\nvar m = new Map();\nlocalStorage.x = 1;\nvar q = 4 / 2;\n');
trap = scanFile(probe);
fs.unlinkSync(t.ROOT + probe);
var trapText = glue(trap, '|');
check('finds a real call', textHas(trapText, 'line 4: .push('), trapText);
check('ignores comments and strings', !textHas(trapText, 'line 2') && !textHas(trapText, 'line 3'), trapText);
check('finds a regex literal, not a division', textHas(trapText, 'line 5: regular') && !textHas(trapText, 'line 10'), trapText);
check('finds this, new and storage', textHas(trapText, 'line 6: this') && textHas(trapText, 'line 8: new Map') &&
      !textHas(trapText, 'line 7') && textHas(trapText, 'line 9: localStorage'), trapText);

section('data lives in memory, on one page');
var pages = fs.readdirSync(t.ROOT), html = [];
for (var p = 0; p < pages.length; p++) {
    var page = pages[p];
    if (page.length > 5 && textPart(page, page.length - 5) === '.html') listAdd(html, page);
}
check('one HTML page holds the shop and the order desk', html.length === 1 && html[0] === 'index.html', glue(html, ', '));
var indexHtml = t.readText('index.html');
check('index.html has no inline script', !textHas(indexHtml, '<script>') && !textHas(indexHtml, 'onclick='));
var shopPart = cutText(indexHtml, 'id="adminView"')[0], hrefs = cutText(shopPart, 'href="'), adminLinks = 0;
for (var h = 1; h < hrefs.length; h++) {
    if (textHas(toLower(cutText(hrefs[h], '"')[0]), 'admin')) adminLinks++;
}
check('no link to the order desk anywhere in the shop', adminLinks === 0 && !textHas(shopPart, '>Admin<') && !textHas(shopPart, 'Order desk<'));

section('every function states its complexity');
var missing = [];
for (var f = 0; f < appFiles.length; f++) {
    var gaps = unannotated(appFiles[f]);
    for (var g = 0; g < gaps.length; g++) listAdd(missing, gaps[g]);
}
check('time and space noted on every function in js/', missing.length === 0, missing.length + ' missing:\n    ' + glue(missing, '\n    '));
var notations = [];
for (var nf = 0; nf < appFiles.length; nf++) {
    var odd = otherNotations(appFiles[nf]);
    for (var o = 0; o < odd.length; o++) listAdd(notations, odd[o]);
}
check('only O(1), O(log n), O(n) and O(n²) are used in js/', notations.length === 0, notations.length + ' other:\n    ' + glue(notations, '\n    '));

section('the Date built-in only reads the clock');
var dateUses = [];
for (var dt = 0; dt < appFiles.length; dt++) {
    var uses = dateMaths(appFiles[dt]);
    for (var u = 0; u < uses.length; u++) listAdd(dateUses, uses[u]);
}
check('new Date only in readClock, no Date calendar methods anywhere', dateUses.length === 0, glue(dateUses, '; '));
var probeOdd = 'tests/rubric-notation.tmp.js';
fs.writeFileSync(t.ROOT + probeOdd, '/* Time O(n log n) · Space O(k) */\n/* Time O(n²) · Space O(1) */\nvar d = new Date(); d.getDay();\n');
var oddFound = otherNotations(probeOdd), dateFound = dateMaths(probeOdd);
fs.unlinkSync(t.ROOT + probeOdd);
check('the notation and Date checks catch what they should', oddFound.length === 2 && dateFound.length === 2,
      glue(oddFound, '|') + ' / ' + glue(dateFound, '|'));

t.finish('rubric');
