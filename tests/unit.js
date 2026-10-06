/* =========================================================================
   UNIT TESTS — core helpers, the six structures and the algorithms.
   Run: node tests/unit.js
   ========================================================================= */

var t = require('./harness');
var check = t.check, section = t.section;
var app = t.loadApp(['core', 'structures', 'algorithms']);

/* Same values in the same order?          Time O(n) · Space O(1) */
function sameList(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

section('core: strings');
check('toLower', app.toLower('Wine RED 2') === 'wine red 2');
check('strip', app.strip('  \t hello  \n') === 'hello');
check('strip of null', app.strip(null) === '');
check('isBlank', app.isBlank('   ') && !app.isBlank(' a '));
check('textHas finds', app.textHas('money bouquet', 'bouq'));
check('textHas misses', !app.textHas('money', 'monkey'));
check('beginsWith', app.beginsWith('image/png', 'image/') && !app.beginsWith('text', 'image/'));
check('cutText', sameList(app.cutText('a,b,,c', ','), ['a', 'b', '', 'c']));
check('cutText multi-char', sameList(app.cutText('a--b', '--'), ['a', 'b']));
check('swapText', app.swapText('a\nb\nc', '\n', ',') === 'a,b,c');
check('leftPad', app.leftPad(7, 4, '0') === '0007');
check('digitsOnly', app.digitsOnly('+63 917-555 0101') === '639175550101');
check('normaliseKey', app.normaliseKey('  Quezon   City. ') === 'quezon city');
check('textPart', app.textPart('abcdef', 2, 4) === 'cd');

section('core: arrays');
var nums = [3, 1, 2];
check('positionIn', app.positionIn(nums, 2) === 2 && app.positionIn(nums, 9) === -1);
check('isIn', app.isIn(nums, 1) && !app.isIn(nums, 7));
check('keepWhere', sameList(app.keepWhere(nums, function (n) { return n > 1; }), [3, 2]));
check('firstWhere', app.firstWhere(nums, function (n) { return n < 3; }) === 1);
check('countWhere', app.countWhere(nums, function (n) { return n !== 1; }) === 2);
check('removeValue leaves input alone', sameList(app.removeValue(nums, 1), [3, 2]) && nums.length === 3);
check('withAdded leaves input alone', sameList(app.withAdded(nums, 4), [3, 1, 2, 4]) && nums.length === 3);
check('backwards', sameList(app.backwards(nums), [2, 1, 3]));
check('glue', app.glue(['a', 'b', 'c'], ', ') === 'a, b, c');
check('renderEach', app.renderEach([1, 2], function (n, i) { return n + ':' + i; }, '|') === '1:0|2:1');
var rec = { a: 1, b: 2 }, copy = app.copyRecord(rec, { b: 3 });
check('copyRecord applies changes without touching the original', copy.b === 3 && rec.b === 2 && copy.a === 1);

section('core: money, dates, html, hashing');
check('peso', app.peso(1234.5) === '₱1,234.50', app.peso(1234.5));
check('peso negative', app.peso(-20) === '−₱20.00', app.peso(-20));
check('pesoWhole', app.pesoWhole(1135) === '₱1,135');
check('roundMoney', app.roundMoney(0.1 + 0.2) === 0.3);
check('toNumber blank is NaN', isNaN(app.toNumber('  ')));
check('dateFromIso rejects junk', app.dateFromIso('2026-13-01') === null && app.dateFromIso('nope') === null &&
      app.dateFromIso('2026-04-31') === null && app.dateFromIso('2026-02-29') === null && app.dateFromIso('2028-02-29') !== null);
check('day numbers: 1 Jan 1970 is day 0', app.dayNumber(1970, 1, 1) === 0 && app.dayNumber(2000, 3, 1) === 11017);
var roundTrip = true;
for (var dn = -800; dn < 30000; dn += 37) {
    var back = app.dateOfDayNumber(dn);
    if (app.dayNumber(back.year, back.month, back.day) !== dn) roundTrip = false;
}
check('day numbers convert both ways', roundTrip);
check('leap years', app.isLeapYear(2024) && !app.isLeapYear(2026) && !app.isLeapYear(1900) && app.isLeapYear(2000));
check('addDays crosses a year and a leap day', app.addDays('2026-12-30', 3) === '2027-01-02' && app.addDays('2028-02-28', 1) === '2028-02-29');
check('addDays crosses a month', app.addDays('2026-01-30', 3) === '2026-02-02');
check('weekdayOf', app.weekdayOf('2026-10-09') === 5);
check('formatDateShort', app.formatDateShort('2026-10-05') === '5 Oct 2026');
check('escapeHtml', app.escapeHtml('<img src=x onerror="a">&\'') === '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
check('fnv1a is stable', app.fnv1a('admin123') === 1883603724);

section('singly linked list');
var list = app.llCreate();
var a = app.llAppend(list, 'a'), b = app.llAppend(list, 'b'), c = app.llAppend(list, 'c');
check('append keeps order', sameList(app.llValues(list), ['a', 'b', 'c']) && list.size === 3);
check('remove the middle relinks', app.llRemove(list, b) && sameList(app.llValues(list), ['a', 'c']));
check('remove the tail moves the tail', app.llRemove(list, c) && list.tail === a);
app.llAppend(list, 'd');
check('append after removing the tail', sameList(app.llValues(list), ['a', 'd']));
check('remove the head', app.llRemove(list, a) && sameList(app.llValues(list), ['d']));
check('removing twice fails', !app.llRemove(list, a));
check('update', app.llUpdate(list, list.head, 'D') && app.llGet(list, list.head) === 'D');
app.llClear(list);
check('clear', app.llIsEmpty(list) && list.size === 0);

section('circular queue');
var q = app.cqCreate(2);
app.cqEnqueue(q, 1); app.cqEnqueue(q, 2); app.cqEnqueue(q, 3);
check('grows past capacity', q.capacity === 4 && sameList(app.cqValues(q), [1, 2, 3]));
check('first in, first out', app.cqDequeue(q) === 1 && app.cqFront(q) === 2);
app.cqEnqueue(q, 4); app.cqEnqueue(q, 5);
check('wraps around the buffer', sameList(app.cqValues(q), [2, 3, 4, 5]));
app.cqRequeueFront(q, 9);
check('requeue at the front', app.cqFront(q) === 9 && q.count === 5);
check('remove from the middle keeps order', app.cqRemove(q, 4) && sameList(app.cqValues(q), [9, 2, 3, 5]));
check('remove a missing value', !app.cqRemove(q, 42));
var drained = [];
while (!app.cqIsEmpty(q)) app.listAdd(drained, app.cqDequeue(q));
check('drains in order', sameList(drained, [9, 2, 3, 5]) && app.cqDequeue(q) === null);

section('min-heap');
var heap = app.heapCreate();
var keys = [5, 3, 8, 1, 9, 2, 7];
for (var k = 0; k < keys.length; k++) app.heapInsert(heap, 'p' + keys[k], keys[k]);
check('peek is the minimum', app.heapPeek(heap) === 'p1');
check('values in order, heap untouched', sameList(app.heapValues(heap), ['p1', 'p2', 'p3', 'p5', 'p7', 'p8', 'p9']) && heap.size === 7);
check('remove an arbitrary value', app.heapRemove(heap, 'p3') && sameList(app.heapValues(heap), ['p1', 'p2', 'p5', 'p7', 'p8', 'p9']));
var out = [];
while (heap.size > 0) app.listAdd(out, app.heapExtractMin(heap));
check('extracts in ascending order', sameList(out, ['p1', 'p2', 'p5', 'p7', 'p8', 'p9']));
var tie = app.heapCreate();
app.heapInsert(tie, 'first', 1); app.heapInsert(tie, 'second', 1); app.heapInsert(tie, 'third', 1);
check('equal keys leave in arrival order', app.heapExtractMin(tie) === 'first' && app.heapExtractMin(tie) === 'second');
app.heapInsert(tie, 'back', 1, 0);
check('re-inserting with the old arrival number restores its place', app.heapExtractMin(tie) === 'back');

section('stack');
var s = app.stackCreate();
app.stackPush(s, 'x'); app.stackPush(s, 'y');
check('last in, first out', app.stackPeek(s) === 'y' && app.stackPop(s) === 'y' && app.stackPop(s) === 'x');
check('empty pop is null', app.stackPop(s) === null && app.stackSize(s) === 0);

section('n-ary tree');
var tree = app.treeFromOutline('All', [
    { label: 'Flowers', slug: 'flowers', children: [{ label: 'Rose', slug: 'rose' }, { label: 'Dahlia', slug: 'dahlia' }] },
    { label: 'Cakes', slug: 'cakes', children: [{ label: 'Diaper', slug: 'diaper' }] }
]);
check('find by slug', app.treeNode(tree, app.treeFind(tree, 'dahlia')).label === 'Dahlia');
check('missing slug', app.treeFind(tree, 'tulip') === app.NIL);
check('leaves under a branch', sameList(app.treeLeaves(tree, app.treeFind(tree, 'flowers')), ['rose', 'dahlia']));
check('leaves under the root', app.treeLeaves(tree, tree.root).length === 3);
check('path from the root', sameList(app.treePath(tree, app.treeFind(tree, 'diaper')), ['All', 'Cakes', 'Diaper']));
check('depth', app.treeNode(tree, app.treeFind(tree, 'rose')).depth === 2);

section('hash table with chaining');
var table = app.hashCreate(3);
var words = ['manila', 'marilao', 'bocaue', 'obando', 'valenzuela', 'malolos', 'pasig'];
for (var w = 0; w < words.length; w++) app.hashPut(table, words[w], w);
var allFound = true;
for (var w2 = 0; w2 < words.length; w2++) if (app.hashGet(table, words[w2]) !== w2) allFound = false;
check('every key found despite collisions', allFound);
check('collisions chain', app.hashStats(table).longestChain >= 3);
app.hashPut(table, 'pasig', 99);
check('put overwrites', app.hashGet(table, 'pasig') === 99 && table.size === 7);
check('missing key', app.hashGet(table, 'cebu') === null && !app.hashHas(table, 'cebu'));

section('sorting');
var people = [{ n: 'b', k: 2 }, { n: 'a', k: 1 }, { n: 'c', k: 2 }, { n: 'd', k: 1 }];
var sorted = app.insertionSort(people, function (x, y) { return x.k - y.k; });
var names = [];
for (var p = 0; p < sorted.length; p++) app.listAdd(names, sorted[p].n);
check('insertion sort orders and is stable', sameList(names, ['a', 'd', 'b', 'c']), app.glue(names, ''));
check('insertion sort leaves the input alone', people[0].n === 'b');
var inOrder = 0, backwardsCount = 0;
app.insertionSort([1, 2, 3, 4, 5], function (x, y) { inOrder++; return x - y; });
app.insertionSort([5, 4, 3, 2, 1], function (x, y) { backwardsCount++; return x - y; });
check('insertion sort: sorted input is the best case, n − 1 comparisons', inOrder === 4, String(inOrder));
check('insertion sort: reversed input is the worst case, n(n − 1)/2', backwardsCount === 10, String(backwardsCount));
var ranked = app.selectionSortDesc(people, function (x) { return x.k; });
var rankedNames = [];
for (var r = 0; r < ranked.length; r++) app.listAdd(rankedNames, ranked[r].n);
check('selection sort, descending and stable', sameList(rankedNames, ['b', 'c', 'a', 'd']), app.glue(rankedNames, ''));
check('compareText', app.compareText('Apple', 'banana') < 0 && app.compareText('b', 'B') === 0 && app.compareText('ab', 'a') > 0);

section('searching');
var ids = [{ id: 201 }, { id: 205 }, { id: 209 }, { id: 214 }, { id: 230 }];
var keyOf = function (o) { return o.id; };
check('binary search finds the middle', app.binarySearch(ids, 209, keyOf) === 2);
check('binary search finds both ends', app.binarySearch(ids, 201, keyOf) === 0 && app.binarySearch(ids, 230, keyOf) === 4);
check('binary search misses', app.binarySearch(ids, 210, keyOf) === -1 && app.binarySearch([], 1, keyOf) === -1);
var catalogue = [{ t: 'Rose Bouquet red' }, { t: 'Money Bouquet' }, { t: 'Diaper Cake' }];
var textOf = function (x) { return x.t; };
check('linear search, every word must match', app.linearSearch(catalogue, '  BOUQUET red ', textOf).length === 1);
check('linear search, blank returns all', app.linearSearch(catalogue, '', textOf).length === 3);

section('recursion and greedy');
check('sumRecursive', app.sumRecursive([{ v: 1 }, { v: 2 }, { v: 3.5 }], function (x) { return x.v; }) === 6.5);
check('sumRecursive of nothing', app.sumRecursive([], function (x) { return x; }) === 0);
var bills = app.breakIntoBills(1870, [1000, 500, 200, 100, 50, 20]);
check('greedy uses one of each note', bills.total === 6 && bills.remainder === 0);
var big = app.breakIntoBills(5000, [1000, 500, 200, 100, 50, 20]);
check('greedy prefers the largest note', big.total === 5 && big.bills[0].note === 1000);
check('greedy reports what cannot be made', app.breakIntoBills(15, [1000, 500, 200, 100, 50, 20]).remainder === 15);
check('describeBills', app.describeBills(big) === '₱1,000 × 5');

t.finish('unit');
