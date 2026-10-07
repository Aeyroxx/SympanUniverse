/* =========================================================================
   REVIEWER TRACES — each one runs the REAL site code on the REAL demo data
   and records what happened.

   The site's scripts are loaded into a fresh sandbox and the demo history
   is replayed at a fixed moment (Monday 5 October 2026, noon), so every
   trace is reproducible. Where a trace shows steps inside an algorithm it
   does so by wrapping a function the algorithm already calls by name
   (stackPop, textHas, a sort's compare, sumRecursive…) — the algorithm
   itself is never copied or changed.
   ========================================================================= */

var fs = require('fs');
var vm = require('vm');
var R = require('./render');

var ROOT = __dirname + '/../../';
var BASE = new Date(2026, 9, 5, 12, 0, 0, 0);
var NOW = BASE.getTime();
var HOUR = 3600000;
/* The scripts the traces need, read from index.html so they never drift:
   everything it loads before the shop and desk screens (the DSA code, the
   data, the backend and the UI kit).      Time O(n²) · Space O(n) */
function traceFiles() {
    var pieces = cutText(fs.readFileSync(ROOT + 'index.html', 'utf8'), '<script src="js/'), out = [];
    for (var i = 1; i < pieces.length; i++) {
        var name = cutText(pieces[i], '.js"')[0];
        if (beginsWith(name, 'frontend/shop/') || beginsWith(name, 'frontend/desk/') || name === 'app') break;
        listAdd(out, name);
    }
    return out;
}
var FILES = traceFiles();

/* A fresh sandbox with the site loaded and the demo history replayed.
                                           Time O(n) · Space O(n) */
function freshShop() {
    var box = vm.createContext({ Math: Math, Date: Date, String: String, Number: Number, isNaN: isNaN, JSON: JSON });
    for (var i = 0; i < FILES.length; i++) {
        vm.runInContext(fs.readFileSync(ROOT + 'js/' + FILES[i] + '.js', 'utf8'), box, { filename: FILES[i] + '.js' });
    }
    // The reviewer never uses the shop's real EmailJS account.
    box.EMAIL_CONFIG.serviceId = ''; box.EMAIL_CONFIG.templateId = ''; box.EMAIL_CONFIG.publicKey = '';
    box.seedShop(NOW);
    return box;
}

/* A form for a checkout in the sandbox.   Time O(1) · Space O(1) */
function form(app, changes) {
    return app.copyRecord({ name: 'Lara Mendoza', phone: '0917 555 7788', email: 'lara@gmail.com', handle: '', mode: 'pickup',
        date: '2026-10-08', slot: '', address: '', barangay: '', city: '', courier: '', rush: false, notes: '',
        consent: true, terms: true }, changes);
}

/* Put items in the sandbox's cart.        Time O(n) · Space O(n) */
function fill(app, lines) {
    app.llClear(app.basket);
    for (var i = 0; i < lines.length; i++) {
        var p = app.productById(lines[i][0]);
        var made = p.kind === 'flower' ? app.makeFlowerItem(p, lines[i][1]) : app.makeQuoteItem(p, lines[i][1]);
        app.basketAdd(made.item);
    }
}

/* Order id → "SU-215 Name".               Time O(log n) · Space O(1) */
function refName(app) {
    return function (id) { var o = app.orderById(id); return o ? o.ref + ' ' + cutText(o.customer.name, ' ')[0] : String(id); };
}

/* =========================================================================
   1. BEST SELLERS
   ========================================================================= */
function bestSellers() {
    var app = freshShop(), out = '';
    var tally = app.salesTally();
    var rows = [];
    for (var i = 0; i < tally.length; i++) {
        listAdd(rows, [String(i), tally[i].product.name, String(tally[i].orders), String(tally[i].units), String(app.salesRank(tally[i]))]);
    }
    out += R.traceStep('Input — salesTally() over the 22 demo orders (catalogue order)',
        R.para('One pass over the paid and completed orders and their lines; each line finds its product’s row with one hash-table look-up ' +
            '(hashGet by product id), so the orders are read once, not once per product.') +
        R.table(['#', 'Product', 'Orders', 'Units', 'Rank key'], rows));
    var calls = 0;
    var ranked = app.selectionSortDesc(tally, function (row) { calls++; return app.salesRank(row); });
    var rrows = [];
    for (var k = 0; k < ranked.length; k++) listAdd(rrows, [String(k + 1), ranked[k].product.name, String(ranked[k].units), String(ranked[k].orders)]);
    out += R.traceStep('Process — selectionSortDesc(tally, salesRank)', R.para('The rank function was called ' + calls + ' times: two reads per comparison, so ' +
        (calls / 2) + ' comparisons for n = ' + tally.length + ' — exactly n(n−1)/2 = ' + (tally.length * (tally.length - 1) / 2) + ', the O(n²) of selection sort.') +
        R.table(['Rank', 'Product', 'Units', 'Orders'], rrows));
    var top = app.bestSellers(3);
    out += R.traceStep('Output — bestSellers(3)', R.para(renderEach(top, function (r, i) { return (i + 1) + '. ' + r.product.name + ' (' + r.units + ' sold)'; }, '   ')));
    fill(app, [[102, { arrangement: 'round', count: 12, color: 'purple', quantity: 10, addons: [] }]]);
    app.placeOrder(form(app, { date: '2026-10-09' }), 'gcash-100', '1234567890123', NOW);
    var after = app.bestSellers(3);
    out += R.traceStep('Then — placeOrder() for 10 Plumeria bouquets, paid in full', R.para('bestSellers(3) is now: ' +
        renderEach(after, function (r, i) { return (i + 1) + '. ' + r.product.name + ' (' + r.units + ' sold)'; }, '   ') +
        '. Ten pieces moved Plumeria to first place at once.'));
    return out;
}

/* =========================================================================
   2. CATEGORY TREE
   ========================================================================= */
function tree() {
    var app = freshShop(), t = app.categoryTree, out = '';
    var rows = [];
    for (var i = 0; i < t.nodes.length; i++) {
        var n = t.nodes[i];
        listAdd(rows, [String(i), n.label, n.slug, n.parent === -1 ? 'NIL' : String(n.parent), '[' + glue(n.children, ', ') + ']', String(n.depth)]);
    }
    out += R.traceStep('The tree as built by treeFromOutline(): one array of nodes', R.table(['Index', 'Label', 'Slug', 'Parent', 'Children', 'Depth'], rows));
    var visits = [], realPop = app.stackPop;
    app.stackPop = function (s) { var v = realPop(s); if (v !== null) listAdd(visits, t.nodes[v].label); return v; };
    var found = app.treeFind(t, 'dahlia');
    out += R.traceStep('treeFind(tree, "dahlia") — the nodes popped off the stack, in order', R.para(glue(visits, ' → ') + '   ⇒ index ' + found));
    visits = [];
    var leaves = app.treeLeaves(t, app.treeFind(t, 'flower-bouquets'));
    app.stackPop = realPop;
    out += R.traceStep('treeLeaves(tree, "Flower Bouquets")', R.para('Leaves: ' + glue(leaves, ', ') + '. The catalogue then shows the ' +
        app.countWhere(app.activeProducts(), function (p) { return app.isIn(leaves, p.line); }) + ' products whose line is one of these.'));
    return out;
}

/* =========================================================================
   3. SEARCH AND SORT
   ========================================================================= */
function search() {
    var app = freshShop(), out = '';
    var checks = [], realHas = app.textHas;
    app.textHas = function (h, n) { var r = realHas(h, n); listAdd(checks, { word: n, hit: r, start: textPart(h, 0, 22) }); return r; };
    var found = app.linearSearch(app.activeProducts(), '  Matcha   ROSE ', app.searchText);
    app.textHas = realHas;
    out += R.traceStep('linearSearch(products, "  Matcha   ROSE ") — normalised to the words "matcha", "rose"',
        R.para(checks.length + ' textHas() checks were made across ' + app.activeProducts().length + ' products (a product stops at its first missing word).') +
        R.table(['Product text begins', 'Word', 'Found?'], cutRows(checks), 'compact') +
        R.para('Result: ' + renderEach(found, function (p) { return p.name; }, ', ')));
    var byName = app.firstWhere(app.SORTS, function (s) { return s.id === 'name'; });
    var rows = [], tally = app.salesTally();
    for (var i = 0; i < tally.length; i++) listAdd(rows, tally[i]);
    // Count what the real insertionSort does by wrapping only its compare.
    var passes = [], held = null;
    var sorted = app.insertionSort(rows, function (a, b) {
        if (b !== held) { held = b; listAdd(passes, { item: b, compared: 0, moved: 0 }); }
        var r = byName.compare(a, b), p = passes[passes.length - 1];
        p.compared++;
        if (r > 0) p.moved++;
        return r;
    });
    var prow = [], total = 0;
    for (var k = 0; k < passes.length; k++) {
        total += passes[k].compared;
        listAdd(prow, [String(k + 1), passes[k].item.product.name, String(passes[k].compared), passes[k].moved === 0 ? 'stays' : 'slides ' + passes[k].moved + ' left']);
    }
    out += R.traceStep('insertionSort(10 products, by name) — each pass takes the next product and slides it left past the larger names',
        R.table(['Pass', 'Product taken', 'Comparisons', 'Result'], prow, 'compact') +
        R.para(total + ' comparisons in all. Worst case for 10 items is n(n−1)/2 = 45 (a list in reverse order); best case is n − 1 = 9 (already in order).') +
        R.para('Result: ' + renderEach(sorted, function (r) { return r.product.name; }, ', ')));
    var count = function (list) { var c = 0; app.insertionSort(list, function (a, b) { c++; return a - b; }); return c; };
    out += R.traceStep('Best and worst case, counted on the real function', R.table(['Input (10 numbers)', 'Comparisons', 'Case'], [
        ['1, 2, 3, … 10 (already sorted)', String(count([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])), 'best — O(n)'],
        ['10, 9, 8, … 1 (reversed)', String(count([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])), 'worst — O(n²)']], 'compact') +
        R.para('Orders, emails and receipts are appended in time order, so the "newest first" and "oldest first" lists the shop sorts are close to one of these two cases.'));
    return out;
}

/* textHas() checks as table rows.          Time O(n) · Space O(n) */
function cutRows(checks) {
    var out = [];
    for (var i = 0; i < checks.length; i++) listAdd(out, [checks[i].start + '…', checks[i].word, checks[i].hit ? 'yes' : 'no']);
    return out;
}

/* =========================================================================
   4. HASH TABLE OF PHOTOS + RECURSION
   ========================================================================= */
function hash() {
    var app = freshShop(), out = '', table = app.referenceIndex;
    var key = app.referenceKey('rose', 'layered', 'matcha');
    var h = app.fnv1a(key), b = app.hashIndex(table, key), chain = table.buckets[b];
    var at = -1;
    for (var i = 0; i < chain.length; i++) if (chain[i].key === key) at = i;
    out += R.traceStep('referenceImage("rose", "layered", "matcha")', R.table(['Step', 'Value'], [
        ['1. referenceKey()', key], ['2. fnv1a(key)', String(h)], ['3. hashIndex = fnv1a mod ' + table.bucketCount, String(b)],
        ['4. chain length in bucket ' + b, String(chain.length)], ['5. compared keys until found', String(at + 1)],
        ['Result', chain[at].value.src + (chain[at].value.real ? ' (real photo)' : ' (colour preview)')]]) +
        R.bucketPicture(table, [b]));
    var real = app.referenceImage('rose', 'round', 'red');
    var stats = app.hashStats(table), lengths = [0, 0, 0, 0, 0];
    for (var k = 0; k < table.bucketCount; k++) { var len = table.buckets[k].length; lengths[len > 4 ? 4 : len]++; }
    out += R.traceStep('The whole table after buildReferenceIndex()', R.para(stats.size + ' keys in ' + stats.buckets + ' buckets: load factor ' +
        roundMoney(stats.loadFactor) + ', longest chain ' + stats.longestChain + '. Real photographs overwrote 14 previews (e.g. rose|round|red → ' + real.src + ').') +
        R.table(['Chain length', '0', '1', '2', '3', '4+'], [['Buckets', String(lengths[0]), String(lengths[1]), String(lengths[2]), String(lengths[3]), String(lengths[4])]], 'compact'));
    var calls = [], realSum = app.sumRecursive;
    app.sumRecursive = function (items, valueOf, index) {
        var at2 = index === undefined ? 0 : index;
        var r = realSum(items, valueOf, index);
        listAdd(calls, ['sumRecursive(…, ' + at2 + ')', at2 >= items.length ? '(empty — base case)' : items[at2] + ' = ₱' + valueOf(items[at2]), '₱' + r]);
        return r;
    };
    var total = app.addonsTotal(['lights', 'card', 'glitter'], 12);
    app.sumRecursive = realSum;
    out += R.traceStep('addonsTotal(["lights", "card", "glitter"], 12 flowers) — the recursive calls, innermost first',
        R.table(['Call', 'This item', 'Returns'], calls, 'compact') + R.para('Total add-ons: ₱' + total + ' (glitter for 12 flowers is ₱' + app.glitterPrice(12) + ').'));
    return out;
}

/* =========================================================================
   5. GREEDY BILLS
   ========================================================================= */
function greedy() {
    var app = freshShop(), out = '';
    var amounts = [5870, 3460, 15];
    for (var a = 0; a < amounts.length; a++) {
        var r = app.breakIntoBills(amounts[a], app.DENOMINATIONS), rows = [], left = amounts[a];
        for (var d = 0; d < app.DENOMINATIONS.length; d++) {
            var note = app.DENOMINATIONS[d];
            var hit = app.firstWhere(r.bills, function (x) { return x.note === note; });
            var count = hit ? hit.count : 0;
            listAdd(rows, ['₱' + note, '₱' + left, String(count), '₱' + (left - note * count)]);
            left = left - note * count;
        }
        out += R.traceStep('breakIntoBills(' + amounts[a] + ', [1000, 500, 200, 100, 50, 20])',
            R.table(['Note', 'Remaining before', 'Taken', 'Remaining after'], rows, 'compact') +
            R.para('Result: ' + (r.total > 0 ? app.describeBills(r) : 'no bills') + ' = ' + r.total + ' bills' +
                (r.remainder > 0 ? '; ₱' + r.remainder + ' cannot be made in bills.' : '.')));
    }
    return out;
}

/* =========================================================================
   6. LINKED LIST CART
   ========================================================================= */
function linkedList() {
    var app = freshShop(), out = '';
    app.llClear(app.basket);
    var name = function (item) { return item.productName + ' ×' + item.quantity; };
    function add(id, choice) {
        var p = app.productById(id);
        return app.basketAdd(p.kind === 'flower' ? app.makeFlowerItem(p, choice).item : app.makeQuoteItem(p, choice).item);
    }
    var rose = add(101, { arrangement: 'round', count: 12, color: 'red', quantity: 1, addons: [] });
    add(203, { size: 'Standard', count: 8, detail: '', provided: false, quantity: 1, addons: [] });
    var dahlia = add(103, { arrangement: 'round', count: 9, color: 'navy-blue', quantity: 1, addons: [] });
    out += R.traceStep('After basketAdd() three times', R.listPicture(app.basket, name));
    app.basketRemove(dahlia - 1);
    out += R.traceStep('basketRemove(1) — the middle node: node 0 now points past it; nothing moved', R.listPicture(app.basket, name));
    add(201, { size: 'Medium', count: 20, detail: '5000', provided: true, quantity: 1, addons: [] });
    app.basketSetQuantity(rose, 2);
    out += R.traceStep('basketAdd(Money Bouquet) at the tail, and basketSetQuantity(0, 2)', R.listPicture(app.basket, name));
    app.basketRemove(rose);
    out += R.traceStep('basketRemove(0) — the head: head moves to node 2', R.listPicture(app.basket, name) +
        R.para('Walking from the head (llEntries): ' + renderEach(app.basketEntries(), function (e) { return name(e.value); }, ' → ')));
    return out;
}

/* =========================================================================
   7. DELIVERY AREAS
   ========================================================================= */
function areas() {
    var app = freshShop(), out = '', table = app.areaIndex;
    var tries = [['  quezon   CITY ', '', 'lalamove'], ['Marilao, Bulacan', 'Saog', ''], ['Meycauayan', 'Brgy. Lawa', ''], ['meycauayan city', 'Malhacan', ''],
                 ['QC', '', 'flash'], ['Davao', '', 'flash']];
    var rows = [];
    for (var i = 0; i < tries.length; i++) {
        var city = tries[i][0], key = app.normaliseKey(city), area = app.lookupArea(city);
        var dq = app.deliveryQuote({ mode: 'delivery', city: city, barangay: tries[i][1], courier: tries[i][2] });
        listAdd(rows, ['"' + city + '"', key, String(app.hashIndex(table, key)), area ? area.city : 'not found', dq.label, '₱' + dq.fee, dq.status]);
    }
    out += R.traceStep('lookupArea() and deliveryQuote() for six typed addresses',
        R.table(['Typed', 'normaliseKey', 'Bucket', 'Area', 'Label', 'Fee', 'Status'], rows, 'compact'));
    var stats = app.hashStats(table);
    out += R.traceStep('The table built by buildAreaIndex()', R.para(stats.size + ' names and aliases in ' + stats.buckets + ' buckets; ' + stats.used +
        ' buckets in use; longest chain ' + stats.longestChain + '; load factor ' + roundMoney(stats.loadFactor) + '.') +
        R.bucketPicture(table, [app.hashIndex(table, 'quezon city'), app.hashIndex(table, 'qc'), app.hashIndex(table, 'marilao')]));
    fill(app, [[101, { arrangement: 'round', count: 12, color: 'red', quantity: 1, addons: [] }]]);
    var errs = app.validateRequest(form(app, { date: '2026-10-11', email: 'not-an-email' }), app.basketItems(), '2026-10-05');
    out += R.traceStep('validateRequest() — a pickup on Sunday 11 October with a bad email',
        R.table(['Field', 'Message'], renderRows(errs)));
    return out;
}

/* Errors as table rows.                    Time O(n) · Space O(n) */
function renderRows(errs) {
    var out = [];
    for (var i = 0; i < errs.length; i++) listAdd(out, [errs[i].field, errs[i].message]);
    return out;
}

/* =========================================================================
   8. QUOTE QUEUE
   ========================================================================= */
function queue() {
    var app = freshShop(), out = '', name = refName(app);
    out += R.traceStep('The quote queue after the demo history', R.queuePicture(app.quoteQueue, name));
    var made = [];
    for (var i = 0; i < 7; i++) {
        fill(app, [[201, { size: 'Medium', count: 10 + i, detail: '', provided: true, quantity: 1, addons: [] }]]);
        listAdd(made, app.submitRequest(form(app, { phone: '0917 555 70' + twoDigits(i), date: '2026-10-09' }), NOW + i * 60000).order);
        if (i === 5) out += R.traceStep('After 6 more requests: the buffer is full (count = capacity)', R.queuePicture(app.quoteQueue, name));
    }
    out += R.traceStep('The 7th request: cqEnqueue() finds it full, cqGrow() doubles it and unrolls it so the head is at 0', R.queuePicture(app.quoteQueue, name));
    var front = app.cqFront(app.quoteQueue);
    app.sendQuote(front, withPrices(app, front), NOW + HOUR);
    out += R.traceStep('sendQuote() on the front request: leaveQueue() dequeues it in O(1)', R.queuePicture(app.quoteQueue, name));
    var item = made[0].items[0];
    var history = app.quoteHistory(made[0].id), rows = [];
    var seen = app.recentQuotes(history, item, true);
    for (var s = 0; s < seen.length; s++) listAdd(rows, [formatStamp(seen[s].stamp), '₱' + roundMoney(seen[s].materials), '₱' + roundMoney(seen[s].labor)]);
    var past = app.pastQuoteFrom(history, item);
    out += R.traceStep('quoteDraft() for a Medium Money Bouquet — the owner’s past quotes, per piece without add-ons',
        R.para('quoteHistory() read every quoted order once and insertion-sorted its ' + history.length + ' quoted lines newest first. ' +
            'recentQuotes() then walked that list and stopped after the first five for this product and size:') +
        R.table(['Quoted on', 'Materials', 'Labour'], rows, 'compact') +
        R.para('Their average: materials ₱' + past.materials + ', labour ₱' + past.labor + ' per piece (from ' + past.count + ' ' +
            plural(past.count, 'quote') + '). quoteDraft() fills these in for the owner, scaled by the quantity.'));
    return out;
}

/* A draft with every line priced.          Time O(n) · Space O(n) */
function withPrices(app, id) {
    var d = app.quoteDraft(app.orderById(id));
    for (var i = 0; i < d.lines.length; i++) if (app.lineTotal(d.lines[i]) <= 0) d.lines[i] = { materials: 400, labor: 400, itemExpense: 0 };
    return d;
}

/* =========================================================================
   9. PAYMENT, RECEIPT, EMAIL QUEUE
   ========================================================================= */
function payment() {
    var app = freshShop(), out = '';
    app.mailEnabled = true;
    fill(app, [[101, { arrangement: 'round', count: 12, color: 'red', quantity: 1, addons: ['card'], cardFlower: 'Rose' }]]);
    var bad = app.placeOrder(form(app, {}), 'gcash-50', '12345', NOW);
    out += R.traceStep('placeOrder() with a 5-digit reference', R.para('Refused before anything is created: "' + bad.errors[0].message + '". Orders still: ' + app.orders.length + '.'));
    var r = app.placeOrder(form(app, {}), 'gcash-50', '1234 567 890123', NOW);
    var rec = r.receipt;
    out += R.traceStep('placeOrder() with "1234 567 890123", 50% down payment', R.table(['Receipt field', 'Value'], [
        ['Receipt no.', rec.no], ['Order (tracking) no.', rec.ref], ['Customer', rec.customer.name + ', ' + rec.customer.phone + ', ' + rec.customer.email],
        ['Items', renderEach(rec.items, function (x) { return x.name + ' × ' + x.quantity + ' — ' + glue(x.specs, ', '); }, '; ')],
        ['Subtotal', peso(rec.subtotal)], ['Delivery & handling', peso(rec.deliveryFee)], ['Total', peso(rec.total)], ['Method', rec.method],
        ['Amount paid', peso(rec.amount)], ['Remaining balance', peso(rec.balance)], ['Status', rec.status]]) +
        R.para('Order ' + r.order.ref + ' is now "' + app.statusLabel(r.order) + '".'));
    var dup = app.payBalance(r.order.id, '1234567890123', NOW + HOUR);
    out += R.traceStep('payBalance() with the same reference', R.para('"' + dup.error + '"'));
    var mail = app.outbox[app.outbox.length - 1];
    out += R.traceStep('queueEmail() — the confirmation joins the mail queue',
        R.para('outbox[' + (app.outbox.length - 1) + ']: to ' + mail.to + ', subject "' + mail.subject + '", status ' + mail.status + '.') +
        R.queuePicture(app.mailQueue, function (i) { return 'outbox[' + i + ']'; }) + R.mono(mail.body));
    app.drainMail();
    out += R.traceStep('drainMail() with EmailJS not set up', R.para('Dequeued; status is now "' + mail.status + '" — kept in the Outbox, not sent. Queue count: ' + app.mailQueue.count + '.'));
    return out;
}

/* =========================================================================
   10. RUSH HEAP + BINARY SEARCH
   ========================================================================= */
function heap() {
    var app = freshShop(), out = '', name = refName(app);
    out += R.traceStep('The rush lane after the demo history', R.heapPicture(app.rushLane, name));
    var dates = ['2026-10-10', '2026-10-06', '2026-10-08', '2026-10-06'];
    for (var i = 0; i < dates.length; i++) {
        fill(app, [[101, { arrangement: 'round', count: 7, color: 'red', quantity: 1, addons: [] }]]);
        var r = app.placeOrder(form(app, { rush: true, date: dates[i], phone: '0917 555 71' + twoDigits(i) }), 'gcash-100', '55500000000' + twoDigits(i), NOW + i * 60000);
        out += R.traceStep('heapInsert() for ' + r.order.ref + ', due ' + dates[i] + ' (key ' + app.dueKey(r.order) + ')', R.heapPicture(app.rushLane, name));
    }
    var released = app.completeNext(NOW + HOUR);
    out += R.traceStep('completeNext() — "Mark ready" takes ' + released.order.ref + ', the earliest due date; the last leaf sinks from the root',
        R.heapPicture(app.rushLane, name) + R.para('Equal dates are served in payment order, because the key\'s second part is the arrival number.'));
    var steps = [];
    var at = app.binarySearch(app.orders, 215, function (o) { listAdd(steps, o.id); return o.id; });
    out += R.traceStep('binarySearch(orders, 215) — the order numbers looked at', R.para(glue(steps, ' → ') + '   ⇒ index ' + at + ' (' + app.orders[at].ref + ') in ' +
        steps.length + ' steps among ' + app.orders.length + ' orders; a linear scan would need ' + (at + 1) + '.'));
    return out;
}

/* =========================================================================
   11. STACK UNDO + RECORDS BY DATE
   ========================================================================= */
function stack() {
    var app = freshShop(), out = '', name = function (e) { return app.orderById(e.id).ref + ' (place ' + e.position + ')'; };
    app.payBalance(217, '1234567890123', NOW);
    var a = app.completeNext(NOW + HOUR);
    var b = app.completeNext(NOW + 2 * HOUR);
    out += R.traceStep('Two "Mark ready": ' + a.order.ref + ' then ' + b.order.ref + ' are pushed', R.stackPicture(app.completedStack, name));
    var undo = app.undoCompletion(NOW + 3 * HOUR);
    out += R.traceStep('undoCompletion() pops ' + undo.order.ref + ' (last in, first out) and puts it back in its lane', R.stackPicture(app.completedStack, name) +
        R.para(undo.order.ref + ' is "' + app.statusLabel(undo.order) + '" again.'));
    // Count the comparisons the real insertionSort makes inside completedByDate().
    var compared = 0, realSort = app.insertionSort;
    app.insertionSort = function (list, cmp) { return realSort(list, function (x, y) { compared++; return cmp(x, y); }); };
    var groups = app.completedByDate(), rows = [];
    app.insertionSort = realSort;
    var done = app.ordersWithStatus('completed').length;
    for (var g = 0; g < groups.length && g < 6; g++) listAdd(rows, [formatDateLong(groups[g].date), renderEach(groups[g].orders, function (o) { return o.ref; }, ', '), peso(groups[g].total)]);
    out += R.traceStep('completedByDate() — insertion sort newest first, then grouped by day (first six days)', R.table(['Day', 'Orders', 'Day total'], rows, 'compact') +
        R.para('insertionSort made ' + compared + ' comparisons for the ' + done + ' completed orders. They are read back to front first, so the list is already ' +
            'nearly newest first — close to the best case, n − 1 = ' + (done - 1) + '. Sorting the oldest-first array directly would be the worst case, n(n − 1)/2 = ' +
            (done * (done - 1) / 2) + '.'));
    var vrows = [], voided = app.voidedOrders();
    for (var v = 0; v < voided.length; v++) listAdd(vrows, [voided[v].ref, voided[v].voidReason, voided[v].voidedBy, peso(voided[v].amountPaid)]);
    out += R.traceStep('voidedOrders() — kept on record as VOIDED – NON-REFUNDABLE', R.table(['Order', 'Reason', 'By', 'Retained'], vrows, 'compact'));
    var expired = app.expireQuotes(NOW + 4 * 24 * HOUR);
    out += R.traceStep('expireQuotes(four days later)', R.para('Voided automatically: ' + (expired.length ? renderEach(expired, function (o) { return o.ref + ' — "' + o.voidReason + '" by ' + o.voidedBy; }, '; ') : 'none') + '.'));
    return out;
}

/* =========================================================================
   12. ORDER DESK & ACCOUNTS
   ========================================================================= */

/* The credentials array as a table.       Time O(n) · Space O(n) */
function accountRows(app) {
    var rows = [];
    for (var i = 0; i < app.staffAccounts.length; i++) {
        var a = app.staffAccounts[i];
        listAdd(rows, [String(a.id), a.name, a.email, a.role, a.active ? 'active' : 'disabled', a.salt, String(a.passHash)]);
    }
    return R.table(['id', 'Name', 'Email', 'Role', 'Status', 'Salt', 'passHash'], rows, 'compact');
}

/*                                         Time O(n²) · Space O(n) */
function desk() {
    var app = freshShop(), out = '';
    var owner = app.EMAIL_CONFIG.adminEmail, first = app.staffAccounts[0];
    out += R.traceStep('staffAccounts — the credentials array, in id order', accountRows(app) +
        R.para('staffEmailIndex (hash table email → id): "' + owner + '" → ' + app.hashGet(app.staffEmailIndex, app.accountEmailKey(owner)) +
            ', "bea.cruz@example.com" → ' + app.hashGet(app.staffEmailIndex, 'bea.cruz@example.com') + '. No password is stored: passwordHash(' +
            first.salt + ', "admin123") = ' + app.passwordHash(first.salt, 'admin123') + ' matches the owner’s passHash; the same password with ' +
            'another salt gives ' + app.passwordHash('su-other-salt', 'admin123') + '.'));
    var rows = [];
    var attempts = [[owner, 'wrong'], ['someone@gmail.com', 'guess1'], ['someone@gmail.com', 'guess2'], ['someone@gmail.com', 'guess3'],
                    ['someone@gmail.com', 'guess4'], ['someone@gmail.com', 'guess5'], ['bea.cruz@example.com', 'Staff2026'], [' ' + owner + ' ', 'admin123']];
    for (var i = 0; i < attempts.length; i++) {
        var found = app.accountByEmail(attempts[i][0]);
        var msg = app.deskSignIn(attempts[i][0], attempts[i][1], NOW + i * 1000);
        listAdd(rows, ['"' + attempts[i][0] + '" / "' + attempts[i][1] + '"', found ? found.name + ' (id ' + found.id + ')' : 'none',
                       msg === '' ? 'accepted → code step' : msg]);
    }
    out += R.traceStep('deskSignIn() — step 1: accountByEmail(), then checkPassword()', R.table(['Email / password', 'Account found', 'Result'], rows, 'compact') +
        R.para('Five wrong passwords in a row paused only someone@gmail.com; the owner could still sign in. Spaces around an email are ignored.'));
    var code = app.issueOtp(NOW + 9000);
    var wrong = code === '000000' ? '111111' : '000000';
    out += R.traceStep('issueOtp() and verifyOtp() — step 2', R.table(['Action', 'Result'], [
        ['issueOtp()', 'code ' + code + ' — only its hash ' + app.deskState.otp.hash + ' is kept; expires in 5 minutes'],
        ['verifyOtp("' + wrong + '")', app.verifyOtp(wrong, NOW + 10000)],
        ['verifyOtp("' + code + '")', app.verifyOtp(code, NOW + 11000) === '' ? 'signed in as ' + app.deskActor() + ' (deskUserId = ' + app.deskUserId + ')' : 'refused']], 'compact'));
    var me = app.currentAccount(), bea = app.accountByEmail('bea.cruz@example.com');
    var byStaff = app.addStaffAccount({ name: 'Paolo Santos', email: 'paolo@gmail.com', role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' }, bea, NOW);
    var lia = app.addStaffAccount({ name: 'Lia Reyes', email: 'lia.reyes@gmail.com', role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' }, me, NOW + 12000);
    var again = app.addStaffAccount({ name: 'Lia R', email: 'LIA.reyes@gmail.com', role: 'staff', password: 'Temp2026x', confirm: 'Temp2026x' }, me, NOW + 13000);
    var steps = [];
    var at = app.binarySearch(app.staffAccounts, 3, function (acc) { listAdd(steps, acc.id); return acc.id; });
    out += R.traceStep('addStaffAccount() — appended with the next id, indexed by email', R.table(['Who adds', 'Result'], [
        ['Bea Cruz (staff)', byStaff.ok ? 'added' : byStaff.error],
        [me.name + ' (owner): Lia Reyes', lia.ok ? 'added with id ' + lia.account.id : lia.error],
        [me.name + ' (owner): LIA.reyes@gmail.com again', again.ok ? 'added' : again.error]], 'compact') + accountRows(app) +
        R.para('accountById(3): binarySearch looked at ids ' + glue(steps, ' → ') + ' ⇒ index ' + at + '.'));
    var disabled = app.setAccountActive(3, false, me, NOW + 14000);
    var self = app.setAccountActive(me.id, false, me, NOW + 14000);
    out += R.traceStep('setAccountActive() — disable, never delete', R.table(['Action', 'Result'], [
        ['Disable Lia Reyes', disabled.ok ? 'disabled' : disabled.error],
        ['Lia signs in with the right password', app.deskSignIn('lia.reyes@gmail.com', 'Temp2026x', NOW + 15000) || 'accepted'],
        ['The owner disables their own account', self.ok ? 'disabled' : self.error]], 'compact'));
    var bucketCalls = 0, realBucket = app.bucketOf;
    app.bucketOf = function (stamp, key, part) { bucketCalls++; return realBucket(stamp, key, part); };
    var month = app.periodReport('month', '2026-09'), t = month.totals;
    app.bucketOf = realBucket;
    var active = keepWhere(month.rows, function (r) { return r.totals.placed + r.totals.payments + r.totals.completed > 0; }), mrows = [];
    for (var m = 0; m < active.length; m++) listAdd(mrows, [active[m].key, String(active[m].totals.placed), String(active[m].totals.units), String(active[m].totals.completed), peso(active[m].totals.collected)]);
    out += R.traceStep('periodReport("month", "2026-09")', R.table(['Figure', 'Value'], [['Collected', peso(t.collected) + ' (' + t.payments + ' payments)'],
        ['Sales', peso(t.sales)], ['Orders placed', String(t.placed)], ['Pieces sold', String(t.units)], ['Made ready', String(t.completed)],
        ['Voided', t.voided + ' (' + peso(t.retained) + ' retained)']], 'compact') +
        R.para('Day by day (days with activity). All 30 day rows were filled by one tallyPeriods() pass: bucketOf() read each order’s and receipt’s date ' +
            'and returned its day number as the row index — ' + bucketCalls + ' bucketOf() calls in all for the month view, instead of one scan of every order per day.') +
        R.table(['Day', 'Orders', 'Pieces', 'Ready', 'Collected'], mrows, 'compact'));
    var year = app.periodReport('year', '2026');
    var sum = roundMoney(app.sumRecursive(year.rows, function (r) { return r.totals.collected; }));
    out += R.traceStep('periodReport("year", "2026") — a year is the sum of its months', R.para('Year collected: ' + peso(year.totals.collected) +
        '; sum of the 12 month rows: ' + peso(sum) + '. Best sellers of the year: ' +
        renderEach(year.best, function (r) { return r.product.name + ' (' + r.units + ')'; }, ', ') + '.'));
    return out;
}

/* =========================================================================
   13. SECURITY & AUDIT LOGS
   ========================================================================= */

/* The newest log entries as a table.      Time O(n) · Space O(n) */
function logRows(app, entries, count) {
    var rows = [];
    for (var i = 0; i < entries.length && i < count; i++) {
        var e = entries[i];
        listAdd(rows, [String(e.id), e.kind, e.level, e.actor, e.action + (e.ref ? ' · ' + e.ref : '')]);
    }
    return R.table(['#', 'Kind', 'Level', 'Who', 'What'], rows, 'compact');
}

/*                                         Time O(n²) · Space O(n) */
function logs() {
    var app = freshShop(), out = '';
    var owner = app.EMAIL_CONFIG.adminEmail, replayed = app.auditLog.length;
    app.deskSignIn(owner, 'wrong', NOW);
    app.deskSignIn('stranger@gmail.com', 'guess1', NOW + 1000);
    app.deskSignIn('stranger@gmail.com', 'guess2', NOW + 2000);
    app.deskSignIn(owner, 'admin123', NOW + 3000);
    app.verifyOtp(app.issueOtp(NOW + 3000), NOW + 4000);
    app.payBalance(217, '1234567890999', NOW + 5000, app.deskActor());
    var total = app.auditLog.length;
    out += R.traceStep('logEvent() — every event appended at the end', R.para('The demo history wrote ' + replayed + ' entries; three sign-in attempts, the code ' +
        'and one payment recorded at the desk added ' + (total - replayed) + ' more, numbered ' + (replayed + 1) + ' to ' + total + '. The newest, read from the back:') +
        logRows(app, app.logEntries('all', ''), 7));
    var frows = [], failed = app.failedSignInRows();
    for (var f = 0; f < failed.length; f++) listAdd(frows, [failed[f].email, String(failed[f].count), String(failed[f].streak),
                                                             app.accountByEmail(failed[f].email) ? 'yes' : 'no']);
    out += R.traceStep('noteFailedSignIn() — the failedSignIns hash table', R.table(['Email typed', 'Wrong in all', 'In a row now', 'Has an account'], frows, 'compact') +
        R.para('The owner’s right password set its streak back to 0; the total stays for the Logs tab.'));
    var security = app.logEntries('security', ''), su217 = app.logEntries('all', 'SU-217');
    out += R.traceStep('logEntries() — backwards, keep one kind, then search', R.para('logEntries("security", "") keeps ' + security.length + ' of ' + total +
        ' entries. logEntries("all", "SU-217") finds ' + su217.length + ', each with who acted:') + logRows(app, su217, 8));
    var inDay = 0;
    for (var d = app.auditLog.length - 1; d >= 0 && NOW + 6000 - app.auditLog[d].stamp <= app.DAY_MS; d--) inDay++;
    var c = app.recentSecurityCounts(NOW + 6000);
    out += R.traceStep('recentSecurityCounts() — the last 24 hours', R.table(['Figure', 'Value'], [['Security events', String(c.total)],
        ['Wrong passwords', String(c.failedPasswords)], ['Pauses', String(c.locks)], ['Wrong or expired codes', String(c.failedCodes)],
        ['Password changes', String(c.passwordChanges)], ['Failed order look-ups', String(c.failedLookups)]], 'compact') +
        R.para('The walk started at the newest entry and stopped after ' + (inDay + 1) + ' of the ' + total + ' entries — the first one older than a day ends it.'));
    var nobody = app.startPasswordReset('stranger@gmail.com', NOW + 7000);
    var nobodyState = app.deskState.reset;
    var resetCode = app.startPasswordReset(owner, NOW + 8000);
    var wrongCode = resetCode === '000000' ? '111111' : '000000';
    var rrows = [
        ['startPasswordReset("stranger@gmail.com")', nobody === '' ? 'no code made (known = ' + nobodyState.known + '); the screen says the same as for a real account' : 'code made'],
        ['startPasswordReset(owner)', 'code ' + resetCode + ' — only its hash ' + app.deskState.reset.hash + ' is kept; expires in 10 minutes'],
        ['completePasswordReset("' + wrongCode + '", …)', app.completePasswordReset(wrongCode, 'Ribbon2026', 'Ribbon2026', NOW + 9000)],
        ['completePasswordReset(code, "short")', app.completePasswordReset(resetCode, 'short', 'short', NOW + 10000)],
        ['completePasswordReset(code, "Ribbon2026")', app.completePasswordReset(resetCode, 'Ribbon2026', 'Ribbon2026', NOW + 11000) === '' ? 'changed' : 'refused']
    ];
    var ownerAccount = app.accountByEmail(owner);
    out += R.traceStep('A password reset', R.table(['Call', 'Result'], rrows, 'compact') +
        R.para('Afterwards checkPassword(owner, "Ribbon2026") = ' + app.checkPassword(ownerAccount, 'Ribbon2026') + ' and checkPassword(owner, "admin123") = ' +
            app.checkPassword(ownerAccount, 'admin123') + '; the owner’s salt is now ' + ownerAccount.salt + '. The last entry: "' +
            app.auditLog[app.auditLog.length - 1].action + '" (' + app.auditLog[app.auditLog.length - 1].level + ').'));
    out += R.traceStep('csvField() — a typed text never runs as a spreadsheet formula', R.table(['Text', 'In the CSV'], [
        ['=HYPERLINK("http://x")', app.csvField('=HYPERLINK("http://x")')], ['Lara "LM" Mendoza', app.csvField('Lara "LM" Mendoza')]], 'compact'));
    return out;
}

module.exports = {
    bestSellers: bestSellers, tree: tree, search: search, hash: hash, greedy: greedy, linkedList: linkedList,
    areas: areas, queue: queue, payment: payment, heap: heap, stack: stack, desk: desk, logs: logs
};
