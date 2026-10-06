/* =========================================================================
   STRUCTURES — linked list, circular queue, min-heap, stack, tree and
   hash table, each written out over plain arrays.

   Procedural style: a structure is a plain record of arrays and pointer
   fields, created by a *Create function and changed only by the functions
   that take it as their first argument. Nothing here uses a built-in that
   would do the work: elements are written with list[list.length] = value
   and read by index, so the pointer arithmetic stays visible.

   The null pointer is spelled NIL (-1) throughout.
   ========================================================================= */

var NIL = -1;

/* =========================================================================
   SINGLY LINKED LIST  →  the request basket

   Nodes sit in one backing array and are chained by index. Removing a line
   re-points one `next` and leaves a tombstone behind instead of shifting
   every later element down — the reason to use a list instead of an array.
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function llCreate() {
    return { nodes: [], head: NIL, tail: NIL, size: 0 };
}

/* Append at the tail. Keeping a tail pointer is what makes this O(1)
   rather than a walk to the end.         Time O(1)  · Space O(1) */
function llAppend(list, value) {
    var index = list.nodes.length;
    list.nodes[index] = { value: value, next: NIL, live: true };
    if (list.head === NIL) list.head = index;
    else list.nodes[list.tail].next = index;
    list.tail = index;
    list.size++;
    return index;
}

/* Unlink the node at an index. A singly linked list has no back pointer,
   so the predecessor is found by walking from the head.
                                          Time O(n)  · Space O(1) */
function llRemove(list, index) {
    var node = list.nodes[index];
    if (!node || !node.live) return false;

    if (list.head === index) {
        list.head = node.next;
        if (list.tail === index) list.tail = NIL;
    } else {
        var prev = list.head;
        while (prev !== NIL && list.nodes[prev].next !== index) prev = list.nodes[prev].next;
        if (prev === NIL) return false;
        list.nodes[prev].next = node.next;
        if (list.tail === index) list.tail = prev;
    }
    node.live = false;
    node.next = NIL;
    list.size--;
    return true;
}

/* Replace the value stored at an index.  Time O(1)  · Space O(1) */
function llUpdate(list, index, value) {
    var node = list.nodes[index];
    if (!node || !node.live) return false;
    node.value = value;
    return true;
}

/* The value at an index, or null.        Time O(1)  · Space O(1) */
function llGet(list, index) {
    var node = list.nodes[index];
    return node && node.live ? node.value : null;
}

/* Walk head to tail: [{ index, value }]. Time O(n)  · Space O(n) */
function llEntries(list) {
    var out = [], cursor = list.head, guard = 0;
    while (cursor !== NIL && guard <= list.nodes.length) {
        var node = list.nodes[cursor];
        out[out.length] = { index: cursor, value: node.value };
        cursor = node.next;
        guard++;
    }
    return out;
}

/* Walk head to tail: values only.        Time O(n)  · Space O(n) */
function llValues(list) {
    var entries = llEntries(list), out = [];
    for (var i = 0; i < entries.length; i++) out[i] = entries[i].value;
    return out;
}

/*                                        Time O(1)  · Space O(1) */
function llIsEmpty(list) {
    return list.head === NIL;
}

/*                                        Time O(1)  · Space O(1) */
function llClear(list) {
    list.nodes = [];
    list.head = NIL;
    list.tail = NIL;
    list.size = 0;
}

/* =========================================================================
   CIRCULAR QUEUE  →  quote requests, and the standard production lane

   First in, first served. Head and tail wrap with modulo, so slots freed
   at the front are reused rather than the array growing forever behind
   an ever-advancing head.
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
function cqCreate(capacity) {
    var cap = capacity || 8, items = [];
    for (var i = 0; i < cap; i++) items[i] = null;
    return { items: items, head: 0, tail: 0, count: 0, capacity: cap };
}

/* Double the buffer when full, unrolling it so head is index 0.
                                          Time O(n)  · Space O(n) */
function cqGrow(queue) {
    var bigger = [], cap = queue.capacity * 2;
    for (var i = 0; i < cap; i++) bigger[i] = null;
    for (var k = 0; k < queue.count; k++) bigger[k] = queue.items[(queue.head + k) % queue.capacity];
    queue.items = bigger;
    queue.capacity = cap;
    queue.head = 0;
    queue.tail = queue.count;
}

/* Join at the back.        Time O(1) amortised (O(n) on a grow) · Space O(1) */
function cqEnqueue(queue, value) {
    if (queue.count === queue.capacity) cqGrow(queue);
    queue.items[queue.tail] = value;
    queue.tail = (queue.tail + 1) % queue.capacity;
    queue.count++;
    return queue.count;
}

/* Leave from the front, or null when empty. Time O(1) · Space O(1) */
function cqDequeue(queue) {
    if (queue.count === 0) return null;
    var value = queue.items[queue.head];
    queue.items[queue.head] = null;
    queue.head = (queue.head + 1) % queue.capacity;
    queue.count--;
    return value;
}

/* Look at the front without removing it. Time O(1)  · Space O(1) */
function cqFront(queue) {
    return queue.count === 0 ? null : queue.items[queue.head];
}

/* Put a value back at the front — how an undone completion returns to the
   place it was taken from. Step the head backwards.
                            Time O(1) amortised · Space O(1) */
function cqRequeueFront(queue, value) {
    if (queue.count === queue.capacity) cqGrow(queue);
    queue.head = (queue.head - 1 + queue.capacity) % queue.capacity;
    queue.items[queue.head] = value;
    queue.count++;
    return queue.count;
}

/* Front-to-back, without disturbing the queue. Time O(n) · Space O(n) */
function cqValues(queue) {
    var out = [];
    for (var i = 0; i < queue.count; i++) out[i] = queue.items[(queue.head + i) % queue.capacity];
    return out;
}

/* Take one value out of the middle (a voided order), keeping the rest in
   order. Rebuilds the buffer.            Time O(n)  · Space O(n) */
function cqRemove(queue, value) {
    var values = cqValues(queue), found = false;
    var cap = queue.capacity;
    queue.items = [];
    for (var i = 0; i < cap; i++) queue.items[i] = null;
    queue.head = 0;
    queue.tail = 0;
    queue.count = 0;
    for (var k = 0; k < values.length; k++) {
        if (!found && values[k] === value) { found = true; continue; }
        cqEnqueue(queue, values[k]);
    }
    return found;
}

/* Put a value back at a given place in the line (an undone completion that
   was released from behind an order still owing money). Rebuilds the
   buffer; an index past the end joins the back.
                                          Time O(n)  · Space O(n) */
function cqInsertAt(queue, index, value) {
    var values = cqValues(queue), at = index < 0 ? 0 : index;
    var cap = queue.capacity;
    queue.items = [];
    for (var i = 0; i < cap; i++) queue.items[i] = null;
    queue.head = 0;
    queue.tail = 0;
    queue.count = 0;
    for (var k = 0; k < values.length; k++) {
        if (k === at) cqEnqueue(queue, value);
        cqEnqueue(queue, values[k]);
    }
    if (at >= values.length) cqEnqueue(queue, value);
    return queue.count;
}

/*                                        Time O(1)  · Space O(1) */
function cqIsEmpty(queue) {
    return queue.count === 0;
}

/* =========================================================================
   MIN-HEAP  →  the rush production lane

   Smallest key leaves first. The key is a pair: priority, then arrival
   number. Comparing the arrival number makes the heap stable, so of two
   equally urgent orders the one paid for first is served first.
   Children of index i live at 2i+1 and 2i+2.
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function heapCreate() {
    return { items: [], size: 0, nextSeq: 0 };
}

/* Negative when a must leave before b.   Time O(1)  · Space O(1) */
function heapCompare(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.seq - b.seq;
}

/*                                        Time O(1)  · Space O(1) */
function heapSwap(heap, i, j) {
    var tmp = heap.items[i];
    heap.items[i] = heap.items[j];
    heap.items[j] = tmp;
}

/* Bubble a node up while it beats its parent. Time O(log n) · Space O(1) */
function heapSiftUp(heap, index) {
    var child = index;
    while (child > 0) {
        var parent = Math.floor((child - 1) / 2);
        if (heapCompare(heap.items[child], heap.items[parent]) >= 0) break;
        heapSwap(heap, child, parent);
        child = parent;
    }
}

/* Sink a node while a child beats it.    Time O(log n) · Space O(1) */
function heapSiftDown(heap, index) {
    var parent = index;
    while (true) {
        var left = 2 * parent + 1, right = left + 1, smallest = parent;
        if (left < heap.size && heapCompare(heap.items[left], heap.items[smallest]) < 0) smallest = left;
        if (right < heap.size && heapCompare(heap.items[right], heap.items[smallest]) < 0) smallest = right;
        if (smallest === parent) return;
        heapSwap(heap, parent, smallest);
        parent = smallest;
    }
}

/* Insert with a priority. `seq` may be given to restore an item at its
   exact former key.                      Time O(log n) · Space O(1) */
function heapInsert(heap, value, priority, seq) {
    var arrival = seq === undefined ? heap.nextSeq : seq;
    if (arrival >= heap.nextSeq) heap.nextSeq = arrival + 1;
    heap.items[heap.size] = { value: value, priority: priority === undefined ? 1 : priority, seq: arrival };
    heap.size++;
    heapSiftUp(heap, heap.size - 1);
    return heap.size;
}

/* Remove and return the smallest key's value. Time O(log n) · Space O(1) */
function heapExtractMin(heap) {
    if (heap.size === 0) return null;
    var top = heap.items[0];
    heap.size--;
    heap.items[0] = heap.items[heap.size];
    heap.items.length = heap.size;
    if (heap.size > 0) heapSiftDown(heap, 0);
    return top.value;
}

/* The value that would leave next.       Time O(1)  · Space O(1) */
function heapPeek(heap) {
    return heap.size === 0 ? null : heap.items[0].value;
}

/* Take an arbitrary value out (a voided rush order): swap the last node
   into its slot, then restore order both ways.
                                          Time O(n) to find + O(log n) · Space O(1) */
function heapRemove(heap, value) {
    var at = -1;
    for (var i = 0; i < heap.size; i++) {
        if (heap.items[i].value === value) { at = i; break; }
    }
    if (at === -1) return false;
    heap.size--;
    if (at !== heap.size) {
        heap.items[at] = heap.items[heap.size];
        heap.items.length = heap.size;
        heapSiftDown(heap, at);
        heapSiftUp(heap, at);
    } else {
        heap.items.length = heap.size;
    }
    return true;
}

/* Values in service order, leaving the heap intact: an insertion sort of
   a copy of the heap's array by the same (priority, arrival) key. A heap
   array is already roughly in that order, which is close to insertion
   sort's best case.                      Time O(n²) worst · Space O(n) */
function heapValues(heap) {
    var sorted = insertionSort(copyRange(heap.items, 0, heap.size), heapCompare), out = [];
    for (var i = 0; i < sorted.length; i++) out[out.length] = sorted[i].value;
    return out;
}

/* =========================================================================
   STACK  →  completed orders, and the undo that rides on them

   Last in, first out — exactly the shape of "undo the thing I just did".
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function stackCreate() {
    return { items: [], top: NIL };
}

/*                                        Time O(1)  · Space O(1) */
function stackPush(stack, value) {
    stack.top++;
    stack.items[stack.top] = value;
    return stack.top + 1;
}

/* Remove and return the top, or null.    Time O(1)  · Space O(1) */
function stackPop(stack) {
    if (stack.top === NIL) return null;
    var value = stack.items[stack.top];
    stack.items.length = stack.top;
    stack.top--;
    return value;
}

/*                                        Time O(1)  · Space O(1) */
function stackPeek(stack) {
    return stack.top === NIL ? null : stack.items[stack.top];
}

/* Top first.                             Time O(n)  · Space O(n) */
function stackValues(stack) {
    var out = [];
    for (var i = stack.top; i >= 0; i--) out[out.length] = stack.items[i];
    return out;
}

/*                                        Time O(1)  · Space O(1) */
function stackSize(stack) {
    return stack.top + 1;
}

/* =========================================================================
   N-ARY TREE  →  the product categories

   The shop's order sheet is a three-column hierarchy, so the category
   filter is a tree walk. Each node stores its parent's index and its
   children's indices: the whole tree is index arithmetic over one array.
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function treeCreate(rootLabel) {
    var tree = { nodes: [], root: NIL };
    tree.root = treeAdd(tree, rootLabel, 'root', NIL);
    return tree;
}

/* Attach a node under a parent.          Time O(1)  · Space O(1) */
function treeAdd(tree, label, slug, parentIndex) {
    var index = tree.nodes.length;
    tree.nodes[index] = {
        label: label,
        slug: slug,
        parent: parentIndex,
        children: [],
        depth: parentIndex === NIL ? 0 : tree.nodes[parentIndex].depth + 1
    };
    if (parentIndex !== NIL) listAdd(tree.nodes[parentIndex].children, index);
    return index;
}

/* Depth-first search for a slug, with an explicit stack.
                                          Time O(n) · Space O(n) */
function treeFind(tree, slug) {
    var stack = stackCreate();
    stackPush(stack, tree.root);
    while (stack.top !== NIL) {
        var at = stackPop(stack), node = tree.nodes[at];
        if (node.slug === slug) return at;
        for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);
    }
    return NIL;
}

/*                                        Time O(1)  · Space O(1) */
function treeNode(tree, index) {
    return index === NIL ? null : tree.nodes[index];
}

/*                                        Time O(n) · Space O(n) */
function treeChildren(tree, index) {
    return index === NIL ? [] : copyArray(tree.nodes[index].children);
}

/*                                        Time O(1)  · Space O(1) */
function treeIsLeaf(tree, index) {
    return index !== NIL && tree.nodes[index].children.length === 0;
}

/* Every leaf slug at or below a node — what the catalogue filters on.
                                          Time O(n)  · Space O(n) */
function treeLeaves(tree, index) {
    var out = [];
    if (index === NIL) return out;
    var stack = stackCreate();
    stackPush(stack, index);
    while (stack.top !== NIL) {
        var at = stackPop(stack), node = tree.nodes[at];
        if (node.children.length === 0) listAdd(out, node.slug);
        else for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);
    }
    return out;
}

/* Labels from the root down to a node.   Time O(n) · Space O(n) */
function treePath(tree, index) {
    var upward = [], at = index;
    while (at !== NIL) {
        listAdd(upward, tree.nodes[at].label);
        at = tree.nodes[at].parent;
    }
    return backwards(upward);
}

/* Build from [{ label, slug, children: [{ label, slug }] }].
                                          Time O(n)  · Space O(n) */
function treeFromOutline(rootLabel, branches) {
    var tree = treeCreate(rootLabel);
    for (var i = 0; i < branches.length; i++) {
        var parent = treeAdd(tree, branches[i].label, branches[i].slug, tree.root);
        var kids = branches[i].children || [];
        for (var j = 0; j < kids.length; j++) treeAdd(tree, kids[j].label, kids[j].slug, parent);
    }
    return tree;
}

/* =========================================================================
   HASH TABLE WITH SEPARATE CHAINING  →  delivery-area rates and the
   flower reference-image index

   A key is hashed to a bucket and only that bucket's chain is scanned.
   Collisions are absorbed by the chain, so a look-up is O(1) on average
   and O(n) in the worst case, when every key lands in one bucket.
   ========================================================================= */

/*                                        Time O(n) · Space O(n) */
function hashCreate(bucketCount) {
    var count = bucketCount || 31, buckets = [];
    for (var i = 0; i < count; i++) buckets[i] = [];
    return { buckets: buckets, bucketCount: count, size: 0 };
}

/* Which bucket a key lives in.           Time O(n) · Space O(1) */
function hashIndex(table, key) {
    return fnv1a(key) % table.bucketCount;
}

/* Insert or overwrite.                   Time O(1) average · Space O(1) */
function hashPut(table, key, value) {
    var chain = table.buckets[hashIndex(table, key)];
    for (var i = 0; i < chain.length; i++) {
        if (chain[i].key === key) { chain[i].value = value; return; }
    }
    chain[chain.length] = { key: key, value: value };
    table.size++;
}

/* The value for a key, or null.          Time O(1) average · Space O(1) */
function hashGet(table, key) {
    var chain = table.buckets[hashIndex(table, key)];
    for (var i = 0; i < chain.length; i++) {
        if (chain[i].key === key) return chain[i].value;
    }
    return null;
}

/*                                        Time O(1) average · Space O(1) */
function hashHas(table, key) {
    return hashGet(table, key) !== null;
}

/* Load factor and the longest chain — how evenly the keys spread.
                                          Time O(n) · Space O(1) */
function hashStats(table) {
    var longest = 0, used = 0;
    for (var i = 0; i < table.bucketCount; i++) {
        var len = table.buckets[i].length;
        if (len > longest) longest = len;
        if (len > 0) used++;
    }
    return { size: table.size, buckets: table.bucketCount, used: used,
             longestChain: longest, loadFactor: table.size / table.bucketCount };
}
