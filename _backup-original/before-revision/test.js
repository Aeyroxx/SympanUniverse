require('./harness.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL: ' + name + ' ' + (extra === undefined ? '' : JSON.stringify(extra))); }
}
function eq(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), { got: a, want: b }); }

console.log('== LinkedList ==');
{
  var L = new Structures.LinkedList();
  var a = L.append({ n: 'a', qty: 1 });
  var b = L.append({ n: 'b', qty: 1 });
  var c = L.append({ n: 'c', qty: 1 });
  eq('order after 3 appends', L.toArray().map(function (v) { return v.n; }), ['a', 'b', 'c']);
  eq('head/tail', [L.head, L.tail], [a, c]);

  L.removeAt(b);
  eq('after removing middle', L.toArray().map(function (v) { return v.n; }), ['a', 'c']);
  eq('tail unchanged', L.tail, c);

  L.removeAt(a);
  eq('after removing head', L.toArray().map(function (v) { return v.n; }), ['c']);
  eq('head is c', L.head, c);
  eq('tail is c', L.tail, c);

  var d = L.append({ n: 'd', qty: 1 });
  eq('append after head removal', L.toArray().map(function (v) { return v.n; }), ['c', 'd']);
  eq('tail is d', L.tail, d);

  L.removeAt(d);
  eq('after removing tail', L.toArray().map(function (v) { return v.n; }), ['c']);
  eq('tail back to c', L.tail, c);

  L.removeAt(c);
  ok('empty list', L.isEmpty() && L.head === -1 && L.tail === -1, { head: L.head, tail: L.tail });
  eq('length zero', L.length, 0);

  var L2 = new Structures.LinkedList();
  var i = L2.append({ n: 'x', qty: 1 });
  var before = L2.nodes[i];
  L2.updateAt(i, { qty: 5 });
  ok('update replaces node without mutating the old one', before.value.qty === 1 && L2.get(i).qty === 5);

  var revived = Structures.LinkedList.from(JSON.parse(JSON.stringify(L2.toJSON())));
  eq('survives serialisation', revived.toArray().map(function (v) { return v.n; }), ['x']);
  eq('revived tail correct', revived.tail, L2.tail);
  ok('revived list still appends correctly', (function () {
    revived.append({ n: 'y', qty: 1 });
    return revived.toArray().map(function (v) { return v.n; }).join() === 'x,y';
  })());
}

console.log('== CircularQueue ==');
{
  var Q = new Structures.CircularQueue(4);
  [1, 2, 3].forEach(function (n) { Q.enqueue(n); });
  eq('fifo order', Q.toArray(), [1, 2, 3]);
  eq('dequeue returns front', Q.dequeue(), 1);
  Q.enqueue(4); Q.enqueue(5);
  eq('wraps around', Q.toArray(), [2, 3, 4, 5]);
  ok('head advanced past zero', Q.head === 1, { head: Q.head });

  Q.enqueue(6);
  eq('grows and keeps order', Q.toArray(), [2, 3, 4, 5, 6]);
  eq('capacity doubled', Q.capacity, 8);

  var R = new Structures.CircularQueue(4);
  for (var k = 0; k < 100; k++) { R.enqueue(k); R.dequeue(); }
  ok('indices stay bounded after 100 cycles', R.head < R.capacity && R.capacity <= 8,
     { head: R.head, cap: R.capacity });
  eq('empty at the end', R.count, 0);
  eq('dequeue on empty is null', R.dequeue(), null);

  var revivedQ = Structures.CircularQueue.from(JSON.parse(JSON.stringify(Q.toJSON())));
  eq('survives serialisation', revivedQ.toArray(), [2, 3, 4, 5, 6]);

  // requeueFront: dequeue then put back must leave the queue untouched.
  var F = new Structures.CircularQueue(4);
  ['a', 'b', 'c'].forEach(function (v) { F.enqueue(v); });
  var taken = F.dequeue();
  F.requeueFront(taken);
  eq('dequeue then requeueFront is an exact inverse', F.toArray(), ['a', 'b', 'c']);
  eq('count restored', F.count, 3);

  // It must work when the head is already at index 0 (wrapping backwards).
  var G = new Structures.CircularQueue(4);
  G.enqueue('x'); G.enqueue('y');
  G.requeueFront('w');
  eq('requeueFront wraps the head backwards', G.toArray(), ['w', 'x', 'y']);
  ok('head wrapped to the end of the buffer', G.head === 3, { head: G.head });

  // And when the buffer is full, so it has to grow first.
  var H2 = new Structures.CircularQueue(2);
  H2.enqueue(1); H2.enqueue(2);
  H2.requeueFront(0);
  eq('requeueFront grows a full buffer', H2.toArray(), [0, 1, 2]);
}

console.log('== MinHeap ==');
{
  var H = new Structures.MinHeap();
  ['a', 'b', 'c', 'd'].forEach(function (v) { H.push(v, 1); });
  eq('equal priority keeps arrival order', H.toArray(), ['a', 'b', 'c', 'd']);

  var H2 = new Structures.MinHeap();
  H2.push('low', 5); H2.push('urgent', 1); H2.push('mid', 3);
  eq('priority wins', H2.toArray(), ['urgent', 'mid', 'low']);
  eq('peek is smallest', H2.peek(), 'urgent');
  eq('pop order', [H2.pop(), H2.pop(), H2.pop()], ['urgent', 'mid', 'low']);
  ok('empty after draining', H2.isEmpty() && H2.pop() === null);

  var H3 = new Structures.MinHeap();
  ['x', 'y', 'z'].forEach(function (v) { H3.push(v, 1); });
  var revivedH = Structures.MinHeap.from(JSON.parse(JSON.stringify(H3.toJSON())));
  eq('survives serialisation', revivedH.toArray(), ['x', 'y', 'z']);
  revivedH.push('w', 1);
  eq('later pushes still sort after', revivedH.toArray(), ['x', 'y', 'z', 'w']);

  // Larger randomised check of the heap invariant.
  var H4 = new Structures.MinHeap(), expected = [];
  for (var j = 0; j < 200; j++) {
    var p = Math.floor(Math.random() * 5);
    H4.push(j, p);
    expected.push({ v: j, p: p, s: j });
  }
  expected.sort(function (m, n) { return m.p - n.p || m.s - n.s; });
  eq('200 random pushes drain in key order', H4.toArray(), expected.map(function (e) { return e.v; }));
}

console.log('== Stack ==');
{
  var S = new Structures.Stack();
  S.push('one'); S.push('two'); S.push('three');
  eq('newest first', S.toArray(), ['three', 'two', 'one']);
  eq('peek', S.peek(), 'three');
  eq('pop', S.pop(), 'three');
  eq('size', S.size(), 2);
  eq('backing array truncated', S.items.length, 2);
  S.pop(); S.pop();
  ok('empty', S.isEmpty() && S.pop() === null);
}

console.log('== CategoryTree ==');
{
  var T2 = Structures.CategoryTree.fromOutline('Shop', DATA.categoryOutline);

  eq('root is index 0', T2.root, 0);
  eq('three branches hang off the root', T2.childrenOf(T2.root).length, 3);
  eq('fifteen nodes in total (1 root + 3 branches + 11 leaves)', T2.size(), 15);

  var flowers = T2.indexOfSlug('flower-bouquets');
  ok('branch found by slug', flowers !== -1);
  ok('a branch is not a leaf', !T2.isLeaf(flowers));
  eq('five lines under Flower Bouquets', T2.childrenOf(flowers).length, 5);

  var rose = T2.indexOfSlug('rose');
  ok('a line is a leaf', T2.isLeaf(rose));
  eq('leaf has no children', T2.childrenOf(rose).length, 0);
  eq('unknown slug returns NIL', T2.indexOfSlug('nope'), Structures.NIL);

  // Collecting a subtree is what the catalogue filter runs on.
  eq('leaves under Flower Bouquets', T2.leafSlugsUnder(flowers).sort(),
     ['custom', 'dahlia', 'plumeria', 'rose', 'sunflower']);
  eq('leaves under a leaf are just itself', T2.leafSlugsUnder(rose), ['rose']);
  eq('every leaf under the root', T2.leafSlugsUnder(T2.root).length, 11);
  eq('NIL yields nothing', T2.leafSlugsUnder(Structures.NIL), []);

  eq('path to a leaf', T2.pathTo(rose), ['Shop', 'Flower Bouquets', 'Rose']);
  eq('path to the root', T2.pathTo(T2.root), ['Shop']);

  // Depth is derived, not stored by hand.
  eq('root depth', T2.node(T2.root).depth, 0);
  eq('branch depth', T2.node(flowers).depth, 1);
  eq('leaf depth', T2.node(rose).depth, 2);

  // Pre-order walk must reach every node exactly once, root first.
  var visited = [];
  T2.walk(function (node) { visited.push(node.slug); });
  eq('walk reaches every node', visited.length, 15);
  eq('walk starts at the root', visited[0], 'root');
  var unique = {};
  visited.forEach(function (slug) { unique[slug] = (unique[slug] || 0) + 1; });
  var repeated = Object.keys(unique).filter(function (k) { return unique[k] > 1; });
  eq('no node visited twice', repeated, []);

  // A walk from a branch stays inside that branch.
  var sub = [];
  T2.walk(function (node) { sub.push(node.slug); }, flowers);
  eq('walking a branch covers it and its leaves', sub.length, 6);
  ok('a walk from one branch never reaches another',
     sub.indexOf('diaper-cake') === -1 && sub.indexOf('makeup') === -1);

  // Every product line in the catalogue maps onto a leaf, and vice versa.
  var lines = {};
  DATA.catalog.forEach(function (p) { lines[p.line] = true; });
  var orphanLeaves = T2.leafSlugsUnder(T2.root).filter(function (slug) { return !lines[slug]; });
  eq('every leaf has a product', orphanLeaves, []);
}

console.log('== HashTable ==');
{
  var T = Algorithms.indexBy(DATA.catalog, 'occasion', 5);
  DATA.occasions.forEach(function (o) {
    var viaHash = T.get(o).map(function (p) { return p.id; }).sort();
    var viaScan = DATA.catalog.filter(function (p) { return p.occasion === o; })
                              .map(function (p) { return p.id; }).sort();
    eq('hash lookup matches full scan for ' + o, viaHash, viaScan);
  });
  ok('every product indexed', T.count === DATA.catalog.length, { count: T.count });
  var s = T.stats();
  ok('stats shape', s.rows.length === 5 && typeof s.longestChain === 'number');
  eq('unknown key returns nothing', T.get('Nonexistent'), []);
  console.log('   buckets: ' + s.rows.map(function (r) { return r.size; }).join(',') +
              ' | colliding: ' + s.collidingBuckets + ' | longest chain: ' + s.longestChain);
}

console.log('== Sorting and searching ==');
{
  var before = DATA.catalog.map(function (p) { return p.id; }).join();
  var asc = Algorithms.mergeSort(DATA.catalog, Algorithms.compare.priceAsc);
  ok('sorted ascending', asc.every(function (p, i) { return i === 0 || asc[i - 1].price <= p.price; }));
  eq('sort does not mutate the source', DATA.catalog.map(function (p) { return p.id; }).join(), before);

  var items = [{ k: 1, t: 'a' }, { k: 0, t: 'b' }, { k: 1, t: 'c' }, { k: 0, t: 'd' }, { k: 1, t: 'e' }];
  eq('stable on ties', Algorithms.mergeSort(items, function (x, y) { return x.k - y.k; })
      .map(function (i) { return i.t; }), ['b', 'd', 'a', 'c', 'e']);

  var top = Algorithms.topBySales(DATA.catalog, 3);
  eq('top three are in descending order', top.map(function (p) { return p.sales; }),
     top.map(function (p) { return p.sales; }).slice().sort(function (a, b) { return b - a; }));
  eq('top seller is the paper bills bouquet', top[0].id, 201);

  var sorted = [{ id: 2 }, { id: 5 }, { id: 9 }, { id: 14 }, { id: 21 }];
  var keyOf = function (o) { return o.id; };
  eq('binary search finds middle', Algorithms.binarySearch(sorted, 14, keyOf), 3);
  eq('binary search finds first', Algorithms.binarySearch(sorted, 2, keyOf), 0);
  eq('binary search finds last', Algorithms.binarySearch(sorted, 21, keyOf), 4);
  eq('binary search reports a miss', Algorithms.binarySearch(sorted, 7, keyOf), -1);
  eq('binary search on empty', Algorithms.binarySearch([], 1, keyOf), -1);

  eq('search finds dahlia', Algorithms.searchCatalog(DATA.catalog, 'dahlia').length, 1);
  eq('search ignores case', Algorithms.searchCatalog(DATA.catalog, 'DAHLIA').length, 1);
  eq('search matches a line slug', Algorithms.searchCatalog(DATA.catalog, 'plumeria').length, 1);
  eq('empty term returns everything', Algorithms.searchCatalog(DATA.catalog, '').length, DATA.catalog.length);

  eq('recursive sum', Algorithms.sumPrices([{ price: 20 }, { price: 5 }, { price: 20 }], 0), 45);
  eq('recursive sum of nothing', Algorithms.sumPrices([], 0), 0);
}

console.log('== Denominations ==');
{
  var b = Algorithms.breakIntoDenominations(1500, DATA.denominations);
  eq('1500 breaks greedily', b.bills, [{ note: 1000, count: 1 }, { note: 500, count: 1 }]);
  eq('no remainder', b.remainder, 0);
  eq('bill count', Algorithms.totalBills(b), 2);

  var b2 = Algorithms.breakIntoDenominations(1875, DATA.denominations);
  var total = b2.bills.reduce(function (t, x) { return t + x.note * x.count; }, 0) + b2.remainder;
  eq('breakdown always sums back', total, 1875);
  eq('1875 leaves 5 that no note can make', b2.remainder, 5);
  eq('1870 is exactly makeable', Algorithms.breakIntoDenominations(1870, DATA.denominations).remainder, 0);
  eq('zero is empty', Algorithms.breakIntoDenominations(0, DATA.denominations).bills, []);

  // Every amount must reconstruct exactly.
  var allGood = true;
  for (var amt = 0; amt <= 5000; amt += 7) {
    var r = Algorithms.breakIntoDenominations(amt, DATA.denominations);
    var back = r.bills.reduce(function (t, x) { return t + x.note * x.count; }, 0) + r.remainder;
    if (back !== amt) { allGood = false; break; }
  }
  ok('reconstructs for every sampled amount up to 5000', allGood);
}

console.log('== Catalog data ==');
{
  var fs = require('fs');
  var path = require('path');
  var ROOT = path.join(__dirname, '..');
  var tree = Structures.CategoryTree.fromOutline(DATA.shop.name, DATA.categoryOutline);
  var seen = {}, dupes = [], missing = [];

  DATA.catalog.forEach(function (p) {
    if (seen[p.id]) dupes.push(p.id);
    seen[p.id] = true;
    ok('product ' + p.id + ' has a blurb', !!p.blurb && !!p.story);
    ok('product ' + p.id + ' price is positive', p.price > 0);
    ok('product ' + p.id + ' sits on a real leaf of the tree',
       tree.indexOfSlug(p.line) !== -1, p.line);
    ok('product ' + p.id + ' leaf really is a leaf',
       tree.isLeaf(tree.indexOfSlug(p.line)), p.line);
    ok('product ' + p.id + ' occasion is known', DATA.occasions.indexOf(p.occasion) !== -1);

    p.gallery.forEach(function (src) {
      if (!fs.existsSync(path.join(ROOT, src))) missing.push(src);
    });
    p.variants.forEach(function (v) {
      ok('variant ' + v.name + ' of ' + p.id + ' points into the gallery',
         p.gallery.indexOf(v.img) !== -1, v.img);
    });

    // Anything the shop has not priced must say so rather than pretend.
    if (p.priceProvisional) {
      ok('provisional price on ' + p.id + ' is disclosed in the copy',
         /placeholder/i.test(p.story), p.name);
    }
  });
  eq('no duplicate product ids', dupes, []);
  eq('every referenced photo exists on disk', missing, []);

  var noPhoto = DATA.catalog.filter(function (p) { return p.gallery.length === 0; });
  eq('only the two unshot lines have no photograph',
     noPhoto.map(function (p) { return p.line; }).sort(), ['beer-cake', 'sweets']);

  // Are all 36 extracted photos actually used?
  var used = {};
  DATA.catalog.forEach(function (p) { p.gallery.forEach(function (g) { used[g] = true; }); });
  var onDisk = fs.readdirSync(path.join(ROOT, 'assets', 'products'));
  var unused = onDisk.filter(function (f) { return !used['assets/products/' + f]; });
  eq('no extracted photo is left unused', unused, []);
  console.log('   ' + onDisk.length + ' photos on disk, all referenced');
}

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
