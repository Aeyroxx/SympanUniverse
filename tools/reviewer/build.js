/* =========================================================================
   REVIEWER BUILD — writes docs/reviewer/index.html, the defense reviewer.

   One document, read on screen and printed to the PDF by pdf.js:
     cover · start here (how to use, running the demo, contents) ·
     system overview and the project rules · DSA primer ·
     for each of the four parts: a one-page summary, then its modules ·
     appendices (complexity summary, general questions, glossary, file map)

   Each module answers, in order: 1 Business process · 2 Input · 3 Process
   (with an Input → Process → Output picture) · 4 Output · 5 Complexity
   analysis · 6 Justification · 7 Demonstration (steps, screenshots, a trace
   from the real code) · and a Code walkthrough (the real functions with
   their line numbers and complexity).

   Nothing that can go stale is typed by hand. Code, line numbers and the
   Time / Space notes are read from js/; traces run the real code; the
   screenshots come from tools/reviewer/shots.js. If a function or a
   walkthrough line has moved or gone, the build stops and says where.

   Run: node tools/reviewer/build.js
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');
var ROOT = __dirname + '/../../';
vm.runInThisContext(fs.readFileSync(ROOT + 'js/core.js', 'utf8'), { filename: 'core.js' });
vm.runInThisContext(fs.readFileSync(ROOT + 'js/email-config.js', 'utf8'), { filename: 'email-config.js' });

var R = require('./render');
var C = require('./content');
var MODULES = C.MODULES, PARTS = C.PARTS;
var TRACES = require('./traces');
var OUT = ROOT + 'docs/reviewer/';
var OWNER = EMAIL_CONFIG.adminEmail;
var problems = [];

var QUESTIONS = [
    'What task or problem from the client are you solving?',
    'What data is needed by the module?',
    'What data structure and/or algorithm did you use? How does it work step by step?',
    'What result does the module produce?',
    'What is the time complexity? What is the space complexity?',
    'Why did you choose that data structure or algorithm? Why is it appropriate?',
    'Show that the module works correctly — the input, the process and the output.'
];

/* =========================================================================
   READING THE SOURCE
   ========================================================================= */

var sourceCache = [];

/* A file's lines, read once.              Time O(n) · Space O(n) */
function linesOf(file) {
    var hit = firstWhere(sourceCache, function (s) { return s.file === file; });
    if (hit) return hit.lines;
    var lines = cutText(fs.readFileSync(ROOT + file, 'utf8'), '\n');
    listAdd(sourceCache, { file: file, lines: lines });
    return lines;
}

/* Where a needle starts in a text, or -1. Time O(n²) · Space O(1) */
function posOf(text, needle) {
    for (var start = 0; start + needle.length <= text.length; start++) {
        var k = 0;
        while (k < needle.length && text.charAt(start + k) === needle.charAt(k)) k++;
        if (k === needle.length) return start;
    }
    return -1;
}

/* A top-level function: its first and last line (1-based), its code and
   its Time / Space note.                   Time O(n) · Space O(n) */
function findFunction(file, name) {
    var lines = linesOf(file), start = -1;
    for (var i = 0; i < lines.length && start === -1; i++) {
        if (beginsWith(lines[i], 'function ' + name + '(')) start = i;
    }
    if (start === -1) { listAdd(problems, file + ': function ' + name + ' not found'); return null; }
    var end = start;
    var first = strip(lines[start]);
    if (first.charAt(first.length - 1) !== '}') {
        // A top-level function ends at the first line that starts with "}".
        end = start + 1;
        while (end < lines.length && lines[end].charAt(0) !== '}') end++;
    }
    // The comment above the function: back to the line that opens it.
    var top = start;
    while (top > 0 && top > start - 12 && strip(lines[top - 1]) !== '' && lines[top - 1].charAt(0) !== '}' &&
           !beginsWith(strip(lines[top - 1]), '/* ====')) top--;
    if (top < start && !beginsWith(strip(lines[top]), '/*')) top = start;
    var note = '';
    for (var back = start - 1; back >= 0 && back >= start - 8 && note === ''; back--) {
        var at = posOf(lines[back], 'Time O(');
        if (at !== -1) note = strip(swapText(textPart(lines[back], at), '*/', ''));
    }
    var split = posOf(note, 'Space O(');
    return {
        file: file, name: name, start: start + 1, end: end + 1, top: top + 1, lines: copyRange(lines, top, end + 1),
        time: split === -1 ? note : dropSeparator(strip(textPart(note, 0, split))),
        space: split === -1 ? '' : strip(textPart(note, split))
    };
}

/* "Time O(n²) ·" → "Time O(n²)": only the separator goes.  Time O(n) · Space O(n) */
function dropSeparator(text) {
    var t = strip(text);
    return t.charAt(t.length - 1) === '·' ? strip(textPart(t, 0, t.length - 1)) : t;
}

/* The line number a walkthrough step points at.  Time O(n²) · Space O(1) */
function anchorLine(fn, at) {
    for (var i = 0; i < fn.lines.length; i++) {
        if (textHas(fn.lines[i], at)) return fn.top + i;
    }
    listAdd(problems, fn.file + ' ' + fn.name + ': no line contains "' + at + '"');
    return -1;
}

/* "{OWNER}" → the owner's sign-in email.   Time O(n) · Space O(n) */
function filled(text) {
    return swapText(text, '{OWNER}', OWNER);
}

/* =========================================================================
   SMALL PIECES
   ========================================================================= */

/*                                         Time O(n) · Space O(n) */
function partOf(m) {
    return firstWhere(PARTS, function (p) { return p.no === m.part; });
}

/*                                         Time O(n) · Space O(n) */
function moduleById(id) {
    return firstWhere(MODULES, function (m) { return m.id === id; });
}

/* "Part 1 · The shop window" or the member's name.  Time O(1) · Space O(1) */
function partName(p) {
    return p.member ? p.member : 'Part ' + p.no + ' · ' + p.title;
}

/* "Module 1 Catalogue & Best Sellers · Module 2 …".  Time O(n) · Space O(n) */
function partModules(p) {
    return renderEach(p.modules, function (id) { var m = moduleById(id); return m.no + ' ' + m.title; }, ' · ');
}

/* A numbered list of escaped lines.       Time O(n) · Space O(n) */
function numbered(items, cls) {
    return '<ol class="num ' + (cls || '') + '">' + renderEach(items, function (x, i) {
        return '<li><span class="dot">' + (i + 1) + '</span><span>' + escapeHtml(filled(x)) + '</span></li>';
    }) + '</ol>';
}

/* A table whose cells are already HTML.   Time O(n²) · Space O(n) */
function htmlTable(headers, rows, cls) {
    return '<div class="table-wrap"><table class="tbl ' + (cls || '') + '"><thead><tr>' +
        renderEach(headers, function (h) { return '<th>' + escapeHtml(h) + '</th>'; }) + '</tr></thead><tbody>' +
        renderEach(rows, function (row) { return '<tr>' + renderEach(row, function (c) { return '<td>' + c + '</td>'; }) + '</tr>'; }) +
        '</tbody></table></div>';
}

/* Big-O text with the notations kept on one line.  Time O(n) · Space O(n) */
function cost(text) {
    return '<span class="cost">' + escapeHtml(text) + '</span>';
}

/* Questions and answers.                  Time O(n) · Space O(n) */
function qaHtml(pairs) {
    return '<dl class="qa">' + renderEach(pairs, function (q) {
        return '<dt>' + escapeHtml(q[0]) + '</dt><dd>' + escapeHtml(filled(q[1])) + '</dd>';
    }) + '</dl>';
}

/* A section heading in the panel's order: number, title, the panel's question.
                                           Time O(1) · Space O(1) */
function askHead(no, title) {
    return '<h2 class="ask-head"><span class="qn">' + no + '</span>' + escapeHtml(title) + '</h2>' +
           '<p class="ask">' + escapeHtml(QUESTIONS[no - 1]) + '</p>';
}

/* =========================================================================
   MODULE PIECES
   ========================================================================= */

/* The code with line numbers and numbered step markers.  Time O(n²) · Space O(n) */
function codeBlock(fn, marks) {
    var out = '';
    for (var i = 0; i < fn.lines.length; i++) {
        var no = fn.top + i, mark = firstWhere(marks, function (m) { return m.line === no; });
        out += '<span class="code-line' + (mark ? ' is-marked' : '') + (no < fn.start ? ' is-comment' : '') + '"><span class="ln">' + no + '</span>' +
            (mark ? '<span class="step-badge">' + mark.n + '</span>' : '<span class="step-gap"></span>') +
            '<code>' + escapeHtml(fn.lines[i]) + '</code></span>';
    }
    return '<pre class="code">' + out + '</pre>';
}

/* One function in the walkthrough.        Time O(n²) · Space O(n) */
function walkthroughHtml(w) {
    var fn = findFunction(w.file, w.fn);
    if (!fn) return '';
    var marks = [];
    for (var i = 0; i < w.steps.length; i++) listAdd(marks, { n: i + 1, line: anchorLine(fn, w.steps[i].at), text: w.steps[i].text });
    return '<div class="walk"><p class="walk-where"><strong>' + escapeHtml(fn.file) + '</strong> · lines ' + fn.top + '–' + fn.end +
        ' · <code>' + escapeHtml(fn.name) + '()</code> — ' + escapeHtml(w.about) + '</p>' + codeBlock(fn, marks) +
        '<ol class="walk-steps">' + renderEach(marks, function (m) {
            return '<li><span class="step-badge">' + m.n + '</span><span><span class="walk-line">line ' + m.line + '</span> ' + escapeHtml(m.text) + '</span></li>';
        }) + '</ol><p class="walk-cost">' + cost(fn.time) + ' · ' + cost(fn.space) + '</p></div>';
}

/* The complexity table, read from the notes above each function.
                                           Time O(n²) · Space O(n) */
function complexityHtml(m) {
    var rows = [];
    for (var i = 0; i < m.walk.length; i++) {
        var fn = findFunction(m.walk[i].file, m.walk[i].fn);
        if (fn) listAdd(rows, ['<code>' + escapeHtml(fn.name) + '()</code>', cost(swapText(fn.time, 'Time ', '')),
                               cost(swapText(fn.space, 'Space ', '')), escapeHtml(m.walk[i].about)]);
    }
    return htmlTable(['Operation', 'Time', 'Space', 'Note'], rows) +
        '<p class="note"><strong>What n means here:</strong> ' + escapeHtml(m.nMeaning) + '</p>' +
        '<p class="note">Each Time and Space is read from the comment above the function in the source, where every function in js/ states its own cost.</p>';
}

/* Screenshots, two to a row.              Time O(n) · Space O(n) */
function shotsHtml(m) {
    return '<div class="shots' + (m.shots.length === 1 ? ' is-single' : '') + '">' + renderEach(m.shots, function (s) {
        var file = 'shots/' + s[0] + '.jpg';
        if (!fs.existsSync(OUT + file)) {
            listAdd(problems, 'screenshot missing: ' + file + ' (run tools/reviewer/shots.js)');
            return '<figure class="shot is-missing"><figcaption>' + escapeHtml(s[1]) + ' — screenshot not taken yet</figcaption></figure>';
        }
        return '<figure class="shot"><img src="' + file + '" alt="' + escapeHtml(s[1]) + '"><figcaption>' + escapeHtml(s[1]) + '</figcaption></figure>';
    }) + '</div>';
}

/* The Input → Process → Output picture, E3 style: three lists.  Time O(n) · Space O(n) */
function ipoHtml(ipo) {
    /*                                     Time O(n) · Space O(n) */
    function column(title, items, cls) {
        return '<div class="ipo-col ' + cls + '"><p class="ipo-title">' + title + '</p><ul>' +
            renderEach(items, function (x) { return '<li>' + escapeHtml(x) + '</li>'; }) + '</ul></div>';
    }
    return '<div class="ipo">' + column('Input', ipo.input, 'ipo-in') + '<div class="ipo-arrow" aria-hidden="true">→</div>' +
        column('Process', ipo.process, 'ipo-pr') + '<div class="ipo-arrow" aria-hidden="true">→</div>' +
        column('Output', ipo.output, 'ipo-out') + '</div>';
}

var traceCache = [];

/* A module's trace, run once.             Time O(n²) · Space O(n) */
function traceOf(m) {
    var hit = firstWhere(traceCache, function (t) { return t.id === m.id; });
    if (hit) return hit.html;
    var html = TRACES[m.trace]();
    listAdd(traceCache, { id: m.id, html: html });
    return html;
}

/* One module, every section in the panel's order.  Time O(n²) · Space O(n) */
function moduleHtml(m) {
    var p = partOf(m);
    return '<article class="module" id="' + m.id + '">' +
        '<header class="mod-head tint-' + p.tint + '"><p class="kicker">Module ' + m.no + ' · ' + escapeHtml(partName(p)) + '</p>' +
        '<h1>' + escapeHtml(m.title) + '</h1><dl class="meta">' +
        '<dt>Screens</dt><dd>' + escapeHtml(m.screens) + '</dd>' +
        '<dt>Files</dt><dd class="mono">' + escapeHtml(m.files) + '</dd>' +
        '<dt>Data</dt><dd>' + escapeHtml(m.data) + '</dd>' +
        '<dt>DSA</dt><dd><strong>' + escapeHtml(m.structure) + '</strong></dd></dl></header>' +

        '<section class="ask-sec">' + askHead(1, 'Business process') + renderEach(m.business, R.para) + '</section>' +
        '<section class="ask-sec">' + askHead(2, 'Input') + R.table(['Input', 'What it is'], m.inputs) + '</section>' +
        '<section class="ask-sec">' + askHead(3, 'Process') + ipoHtml(m.ipo) +
            '<p class="lead-in"><strong>Step by step</strong> (' + escapeHtml(m.structure) + '):</p>' + numbered(m.steps) + '</section>' +
        '<section class="ask-sec">' + askHead(4, 'Output') + '<ul class="plain">' +
            renderEach(m.outputs, function (o) { return '<li>' + escapeHtml(o) + '</li>'; }) + '</ul></section>' +
        '<section class="ask-sec">' + askHead(5, 'Complexity analysis') + complexityHtml(m) + '</section>' +
        '<section class="ask-sec">' + askHead(6, 'Justification') + renderEach(m.justification, R.para) + '</section>' +
        '<section class="ask-sec">' + askHead(7, 'Demonstration') + numbered(m.demo) + shotsHtml(m) +
            '<h3 class="trace-head">Trace — ' + escapeHtml(m.traceTitle) + ' (computed by our code)</h3><div class="trace">' + traceOf(m) + '</div></section>' +
        '<section class="walk-sec"><h2 class="walk-title">Code walkthrough</h2>' +
            '<p class="note">The real functions, with their line numbers in the files today. The numbered markers in the code match the explanation under it.</p>' +
            renderEach(m.walk, walkthroughHtml) + '</section>' +
        '</article>';
}

/* =========================================================================
   FRONT MATTER
   ========================================================================= */

/*                                         Time O(n) · Space O(n) */
function coverHtml() {
    var cards = renderEach(PARTS, function (p) {
        return '<div class="team-card tint-' + p.tint + '"><p class="team-name">' + escapeHtml(partName(p)) + '</p>' +
            (p.member ? '<p class="team-part">Part ' + p.no + ' · ' + escapeHtml(p.title) + '</p>' : '') +
            '<p class="team-mods">' + escapeHtml(partModules(p)) + '</p></div>';
    });
    return '<section class="cover page">' +
        '<p class="cover-kicker">Data Structures &amp; Algorithms · Project Defense</p>' +
        '<h1 class="cover-title">Sýmpan Universe<br>Defense Reviewer</h1>' +
        '<p class="cover-sub">Our module-by-module manual: the problem each part solves, its input, process and output, the data structures and ' +
        'algorithms inside, their time and space complexity, why we chose them, how to demonstrate them live — and a plain-language walk through the code.</p>' +
        (fs.existsSync(OUT + 'shots/cover-home.jpg') ? '<div class="cover-shot"><img src="shots/cover-home.jpg" alt="The Sýmpan Universe home page"></div>' : '') +
        '<div class="team">' + cards + '</div>' +
        '<p class="cover-foot">Sýmpan Universe — handcrafted ribbon bouquets and gift cakes, Lawa, Meycauayan, Bulacan · Built with HTML, CSS, Bootstrap 5 and ' +
        'JavaScript, with every data structure and algorithm written by hand · ' + escapeHtml(MONTH_NAMES[readNumber(todayIso(), 5, 7) - 1] + ' ' + textPart(todayIso(), 0, 4)) + '</p>' +
        '</section>';
}

/*                                         Time O(n) · Space O(n) */
function startHtml() {
    var cards = [
        ['1 · Business process', 'What task or problem of the client (Sýmpan Universe) the module solves.'],
        ['2 · Input', 'The data the module needs — what the user types or picks, and the stored records it reads.'],
        ['3 · Process', 'The data structure and algorithm used, step by step, with an Input → Process → Output picture.'],
        ['4 · Output', 'What the module produces: records, screens, messages.'],
        ['5 · Complexity analysis', 'Time and space complexity of each operation, and what n means.'],
        ['6 · Justification', 'Why that data structure or algorithm, and why it fits the problem better than the alternatives.'],
        ['7 · Demonstration', 'How to show it live, real screenshots, and a trace computed from the real code and data.'],
        ['Code walkthrough', 'The actual functions from our files (with line numbers), a basic explanation of each step, and their time and space complexity.']
    ];
    var contents = ['System overview and the project rules', 'Data structures and algorithms used — a primer'];
    for (var i = 0; i < PARTS.length; i++) listAdd(contents, partName(PARTS[i]) + ' — ' + renderEach(PARTS[i].modules, function (id) {
        var m = moduleById(id); return 'Module ' + m.no + ' ' + m.title; }, ' · '));
    listAdd(contents, 'Appendix — complexity summary, general panel questions, glossary, file map');
    return '<section class="page start">' +
        '<p class="kicker">Start here</p><h1>How to use this reviewer</h1>' +
        '<p class="lead">Every module has the same layout, in the same order the panel asks the questions:</p>' +
        '<div class="grid-2">' + renderEach(cards, function (c) { return '<div class="card"><h4>' + escapeHtml(c[0]) + '</h4><p>' + escapeHtml(c[1]) + '</p></div>'; }) + '</div>' +
        '<div class="callout">Each of the four parts also has a <strong>one-page summary</strong> before its modules: a short pitch, the structures to be able to explain, ' +
        'and likely panel questions with answers. All numbers in the traces were computed by running our real JavaScript on the demo data — they match the screenshots.</div>' +
        '<h3>Running the demo</h3><ol class="plain-num">' +
        '<li>Open <span class="mono">index.html</span> by double-clicking it (Edge or Chrome). No server is needed; the internet is used only for Bootstrap’s stylesheet and for sending email.</li>' +
        '<li>The order desk is at <span class="mono">index.html#admin</span> — nothing on the shop links to it. Sign in with:' +
            htmlTable(['Role', 'E-mail', 'Password', 'Then'], [['Owner', '<span class="mono">' + escapeHtml(OWNER) + '</span>', '<span class="mono">admin123</span>',
                'the six-digit code sent to that address (shown on screen, clearly labelled, while EmailJS is not set up)']]) + '</li>' +
        '<li>Sample order for <em>Track order</em>: <span class="mono">SU-201</span> with mobile <span class="mono">0917 555 0142</span>. For a payment, any 13-digit GCash reference not used before, e.g. <span class="mono">1234567890123</span>.</li>' +
        '<li><strong>Reloading the page resets all data</strong> to the demo history (the arrays live in memory). Demo dates are relative to today, so there are always orders due this week, quotations waiting, and so on.</li>' +
        '<li>"Undo last" in the order desk reverses the last "Mark ready".</li></ol>' +
        '<h3>Contents</h3><ol class="toc">' + renderEach(contents, function (c) { return '<li>' + escapeHtml(c) + '</li>'; }) + '</ol>' +
        '</section>';
}

/*                                         Time O(n) · Space O(n) */
function systemHtml() {
    var S = C.SYSTEM;
    /*                                     Time O(n) · Space O(n) */
    function flow(steps) {
        return '<div class="flow">' + renderEach(steps, function (s) { return '<span class="flow-step">' + escapeHtml(s) + '</span>'; }, '<span class="flow-arrow">→</span>') + '</div>';
    }
    return '<section class="page system">' +
        '<p class="kicker">The whole system</p><h1>System overview</h1>' + R.para(S.problem) +
        '<h3>The customer and owner flow</h3>' + flow(S.customerFlow) +
        '<div class="flow-split"><div><p class="flow-label">A cart of flowers or picture bouquets (priced from the price list)</p>' + flow(S.priceFlow) + '</div>' +
        '<div><p class="flow-label">A cart with a money, makeup, sweets, diaper or beer gift (quoted by the owner)</p>' + flow(S.quoteFlow) + '</div></div>' +
        R.para(S.ownerFlow) +
        '<h3>How the program is built</h3><div class="grid-2">' +
        '<div class="card"><h4>One page, many screens</h4><p>Arrays live in the browser’s memory, and memory is wiped whenever a new page opens — data cannot transfer between ' +
        'separate HTML files. So the whole site is one index.html: the shop and the order desk (#admin) are sections shown and hidden. The arrays survive every screen change.</p></div>' +
        '<div class="card"><h4>Layers</h4>' + renderEach(S.layers, function (l) { return '<p><span class="mono">' + escapeHtml(l[0]) + '</span> — ' + escapeHtml(l[1]) + '</p>'; }) + '</div></div>' +
        '<h3>The data</h3>' + R.table(['Array / structure', 'Key', 'How it stays in order', 'Used by modules'], S.data) +
        '<h3>The project rules and how we met them</h3>' + R.table(['Rule from our instructor', 'How the code follows it'], S.rules) +
        '<p class="note">' + escapeHtml(S.builtins) + '</p>' +
        '</section>';
}

/* Little drawn cells for the primer.      Time O(n) · Space O(n) */
function cells(items) {
    return '<div class="mini">' + renderEach(items, function (c) {
        return '<span class="mini-cell ' + (c[2] || '') + '"><b>' + escapeHtml(c[0]) + '</b>' + (c[1] ? '<i>' + escapeHtml(c[1]) + '</i>' : '') + '</span>';
    }) + '</div>';
}

/*                                         Time O(n) · Space O(n) */
function primerHtml() {
    var cards = [
        ['Array (our "table")', cells([['201', '[0]'], ['202', '[1]'], ['203', '[2]'], ['204', '[3] new', 'is-hot']]),
         'listAdd writes at index length: O(1). Order numbers only grow, so appending keeps the orders array sorted. Reading a[i]: O(1).'],
        ['Linear search — O(n)', cells([['Rose', '1st', 'is-seen'], ['Plumeria', '2nd', 'is-seen'], ['Dahlia', 'match', 'is-hot'], ['Sunflower', '', 'is-dim'], ['Money', '', 'is-dim']]),
         'Check the items one by one until one matches. Works on any array, sorted or not. Best case O(1), worst O(n). The search box and many look-ups use it.'],
        ['Binary search — O(log n)', cells([['203', '', 'is-dim'], ['204', '', 'is-dim'], ['205', ''], ['206', 'middle', 'is-hot'], ['207', ''], ['208', '']]),
         'Needs a sorted array. Look at the middle; if the target is bigger keep the right half, else the left. Each step halves the range: 22 orders need at most 5 steps. Finds an order by number.'],
        ['Insertion sort — best O(n), worst O(n²), stable', cells([['Beer', ''], ['Dahlia', ''], ['Rose', '', 'is-seen'], ['Money', 'held', 'is-hot']]),
         'Take the next item and slide the larger items before it one place right until its place is found. Very fast when the list is already almost in order — ours usually are — so it is our general sort.'],
        ['Selection sort — always O(n²)', cells([['Rose 7', 'largest', 'is-hot'], ['Dahlia 3', ''], ['Money 5', ''], ['Diaper 2', '']]),
         'For each position, scan the rest for the item that belongs there and move it in. Always n(n−1)/2 comparisons. Ranks the best sellers; ours shifts instead of swapping, so it is stable.'],
        ['Naive string matching — O(n²)', cells([['m', ''], ['a', ''], ['t', ''], ['c', ''], ['h', ''], ['a', ''], ['·', '', 'is-dim'], ['r', 'start?', 'is-hot']]),
         'Try the search word at every starting position of the text and compare letter by letter. "matcha" finds the four flower bouquets through their colour names.'],
        ['Singly linked list — O(1) append', cells([['Rose', 'head'], ['→', '', 'is-arrow'], ['Picture', ''], ['→', '', 'is-arrow'], ['Money', 'tail', 'is-hot']]),
         'Nodes in one array, each with the index of the next. Adding at the tail is O(1); removing re-points one link. The cart.'],
        ['Stack — LIFO, push / pop O(1)', cells([['SU-214', ''], ['SU-215', ''], ['SU-216', 'top', 'is-hot']]),
         'Record { items, top }. "Mark ready" pushes { order, its place }; Undo pops the newest. Also the depth-first walks of the category tree.'],
        ['Circular queue — FIFO, O(1)', cells([['SU-220', 'head', 'is-hot'], ['SU-221', ''], ['SU-222', ''], ['·', 'tail', 'is-dim']]),
         'Record { items, head, tail, count, capacity }; the tail moves to (tail + 1) % capacity, so nothing is shifted. Quote requests, standard production and outgoing email.'],
        ['Min-heap — O(log n)', cells([['Oct 6', 'root', 'is-hot'], ['Oct 7', ''], ['Oct 9', '']]),
         'An array where every parent comes before its children; the earliest due date is always at index 0. Insert sifts up, extract sifts down: O(log n). The rush lane.'],
        ['N-ary tree — O(n) walk', cells([['All gifts', 'root', 'is-hot'], ['Flowers', ''], ['Other', ''], ['Cakes', '']]),
         'Each node keeps its parent and its children’s indices. The shop’s three columns and their ten lines; "everything under a branch" is its leaves.'],
        ['Hash table — O(1) average', cells([['[0]', 'empty', 'is-dim'], ['[1]', 'rose|round|red', 'is-hot'], ['[2]', '2 keys']]),
         'FNV-1a turns a key into a bucket number; keys that share a bucket (a collision) form a short chain. The 160 photographs and the delivery areas.'],
        ['Recursion — O(n)', cells([['sum(a, b, c)', ''], ['= a + sum(b, c)', ''], ['… + sum() = 0', 'base', 'is-hot']]),
         'A function that calls itself on the rest of the list, ending at the empty list. Adds up the add-ons and the quote lines.'],
        ['Greedy — O(n)', cells([['₱5,870', ''], ['1000 × 5', '', 'is-hot'], ['500 × 1', ''], ['200, 100, 50, 20', '']]),
         'Take the largest note that fits, then the next. For the peso this always gives the fewest bills. The money bouquet.']
    ];
    return '<section class="page primer"><p class="kicker">Shared knowledge — every member should know this page</p>' +
        '<h1>Data structures &amp; algorithms primer</h1><p class="note">n = the size of whatever an operation goes through (records, items in a queue, ' +
        'or the characters of a text). Only the four notations from class are used: O(1), O(log n), O(n), O(n²). All of these live in js/structures.js and js/algorithms.js.</p>' +
        '<div class="primer-grid">' + renderEach(cards, function (c) {
            return '<div class="card primer-card"><h4>' + escapeHtml(c[0]) + '</h4>' + c[1] + '<p>' + escapeHtml(c[2]) + '</p></div>';
        }) + '<div class="card primer-card"><h4>Why procedural?</h4><p>Every structure is a plain record plus functions that receive it — stackPush(stack, value), ' +
        'cqEnqueue(queue, value), hashPut(table, key, value) — instead of objects with methods. This follows the project rule and makes each step of the algorithm visible.</p></div>' +
        '</div></section>';
}

/* A part's one-page summary.              Time O(n) · Space O(n) */
function partHtml(p) {
    return '<section class="page part-page" id="part' + p.no + '"><header class="part-head tint-' + p.tint + '">' +
        '<p class="kicker">Part ' + p.no + (p.member ? ' · ' + escapeHtml(p.title) : '') + '</p>' +
        '<h1>' + escapeHtml(p.member || p.title) + '</h1><p>' + escapeHtml(renderEach(p.modules, function (id) {
            var m = moduleById(id); return 'Module ' + m.no + ' ' + m.title; }, ' · ')) + '</p></header>' +
        '<h3>60-second pitch</h3>' + R.para(p.pitch) +
        '<h3>Structures and algorithms to be able to explain</h3>' +
        htmlTable(['Where', 'Structure / algorithm', 'Time', 'Space'], renderEachRows(p.structures)) +
        '<h3>Likely panel questions</h3>' + qaHtml(p.questions) + '</section>';
}

/* Rows for htmlTable with the last two cells as costs.  Time O(n) · Space O(n) */
function renderEachRows(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i++) listAdd(out, [escapeHtml(rows[i][0]), escapeHtml(rows[i][1]), cost(rows[i][2]), cost(rows[i][3])]);
    return out;
}

/* =========================================================================
   APPENDICES
   ========================================================================= */

/*                                         Time O(n) · Space O(n) */
function appendixHtml() {
    var rows = [];
    for (var i = 0; i < MODULES.length; i++) {
        var m = MODULES[i], p = partOf(m);
        listAdd(rows, [String(m.no), escapeHtml(m.title), escapeHtml(p.member || 'Part ' + p.no), escapeHtml(m.summary[0]), cost(m.summary[1]), cost(m.summary[2])]);
    }
    var a = '<section class="page appendix"><p class="kicker">Appendix A</p><h1>Complexity summary — all 12 modules</h1>' +
        '<p class="note">The main operation of each module, written with only the four notations from class: O(1), O(log n), O(n) and O(n²). Details are on each module’s pages.</p>' +
        htmlTable(['#', 'Module', 'Part', 'Main structure / algorithm', 'Time', 'Space'], rows) +
        '<h3>How we count</h3><ul class="plain">' + renderEach(C.COUNTING, function (c) { return '<li>' + escapeHtml(c) + '</li>'; }) + '</ul>' +
        '<h3>Reading Big-O in one minute</h3><div class="grid-2">' +
        '<div class="card"><h4>What it means</h4><p>Big-O describes how the work grows when the data grows, ignoring fixed costs. O(log n) grows very slowly ' +
        '(double the data → one more step); O(n) grows in step with the data; O(n²) grows with the square (double the data → four times the work).</p></div>' +
        '<div class="card"><h4>Time vs. space</h4><p>Time counts the steps (comparisons, moves). Space counts the extra memory a function needs besides its input — ' +
        'a sort that works on a copy is O(n) space; a binary search is O(1).</p></div></div></section>';
    var b = '<section class="page appendix"><p class="kicker">Appendix B</p><h1>General questions — any member may be asked</h1>' + qaHtml(C.GENERAL_QUESTIONS) + '</section>';
    var map = [];
    for (var k = 0; k < C.FILE_MAP.length; k++) {
        var part = PARTS[k], label = part.member ? part.member + ' (part ' + part.no + ')' : C.FILE_MAP[k][0];
        listAdd(map, [label, C.FILE_MAP[k][1], C.FILE_MAP[k][2]]);
    }
    var c = '<section class="page appendix"><p class="kicker">Appendix C</p><h1>Glossary</h1>' + R.table(['Term', 'Meaning'], C.GLOSSARY) +
        '<h3>File map — who explains what</h3>' + R.table(['Part', 'Rules and structures (js/)', 'Screens (js/)'], map) + '</section>';
    return a + b + c;
}

/* =========================================================================
   THE DOCUMENT
   ========================================================================= */

/*                                         Time O(n²) · Space O(n) */
function documentHtml() {
    var body = coverHtml() + startHtml() + systemHtml() + primerHtml();
    for (var i = 0; i < PARTS.length; i++) {
        body += partHtml(PARTS[i]);
        for (var j = 0; j < PARTS[i].modules.length; j++) body += moduleHtml(moduleById(PARTS[i].modules[j]));
    }
    body += appendixHtml();
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>Sýmpan Universe — Defense Reviewer</title>\n<link rel="stylesheet" href="reviewer.css">\n</head>\n<body>\n<main class="doc">\n' +
        body + '\n</main>\n</body>\n</html>\n';
}

/* =========================================================================
   BUILD
   ========================================================================= */
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + 'index.html', documentHtml());
if (problems.length > 0) {
    console.log('Problems:\n  ' + glue(problems, '\n  '));
    process.exitCode = 1;
} else {
    console.log('Reviewer built: docs/reviewer/index.html (print it with tools/reviewer/pdf.js)');
}
