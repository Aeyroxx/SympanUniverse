/* =========================================================================
   DSA · CIRCULAR QUEUE  ->  quote requests, standard production, email
   First in, first out. Umiikot ang head at tail gamit ang "% capacity",
   kaya O(1) ang enqueue at dequeue at walang ini-shift. Pag puno na,
   dinodoble ang buffer (bihira lang, kaya O(1) amortised).
   ========================================================================= */

// Bagong circular queue na may panimulang capacity (lumalaki pag puno).
// Time O(n) · Space O(n)
function cqCreate(capacity) {
    var cap = capacity || 8, items = [];
    for (var i = 0; i < cap; i++) items[i] = null;
    return { items: items, head: 0, tail: 0, count: 0, capacity: cap };
}

// Pag puno na, dinodoble yung buffer at inaayos para nasa 0 ang head.
// Time O(n) · Space O(n)
function cqGrow(queue) {
    var bigger = [], cap = queue.capacity * 2;
    for (var i = 0; i < cap; i++) bigger[i] = null;
    for (var k = 0; k < queue.count; k++) bigger[k] = queue.items[(queue.head + k) % queue.capacity];
    queue.items = bigger;
    queue.capacity = cap;
    queue.head = 0;
    queue.tail = queue.count;
}

// Pumapasok sa likod ng pila.
// Time O(1) amortised (O(n) pag lumaki) · Space O(1)
function cqEnqueue(queue, value) {
    if (queue.count === queue.capacity) cqGrow(queue);
    queue.items[queue.tail] = value;
    queue.tail = (queue.tail + 1) % queue.capacity;
    queue.count++;
    return queue.count;
}

// Lumalabas yung nasa unahan, null kung walang laman.
// Time O(1) · Space O(1)
function cqDequeue(queue) {
    if (queue.count === 0) return null;
    var value = queue.items[queue.head];
    queue.items[queue.head] = null;
    queue.head = (queue.head + 1) % queue.capacity;
    queue.count--;
    return value;
}

// Silip lang sa unahan, hindi tinatanggal.
// Time O(1) · Space O(1)
function cqFront(queue) {
    return queue.count === 0 ? null : queue.items[queue.head];
}

// Ibinabalik sa unahan (pag na-undo yung "Mark ready").
// Umaatras lang yung head.
// Time O(1) amortised · Space O(1)
function cqRequeueFront(queue, value) {
    if (queue.count === queue.capacity) cqGrow(queue);
    queue.head = (queue.head - 1 + queue.capacity) % queue.capacity;
    queue.items[queue.head] = value;
    queue.count++;
    return queue.count;
}

// Lahat ng laman mula unahan pa-likod, hindi ginagalaw yung queue.
// Time O(n) · Space O(n)
function cqValues(queue) {
    var out = [];
    for (var i = 0; i < queue.count; i++) out[i] = queue.items[(queue.head + i) % queue.capacity];
    return out;
}

// Tinatanggal yung isang value sa gitna (pag na-void), tapos
// ayos pa rin yung iba. Ginagawa ulit yung buffer.
// Time O(n) · Space O(n)
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

// Ibinabalik sa dating pwesto niya sa pila (undo ng order na
// nauna sa may utang pa). Lampas sa dulo = sa likod.
// Time O(n) · Space O(n)
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

// Walang laman ba yung queue?
// Time O(1) · Space O(1)
function cqIsEmpty(queue) {
    return queue.count === 0;
}
