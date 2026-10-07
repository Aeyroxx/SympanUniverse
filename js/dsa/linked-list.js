/* =========================================================================
   DSA · SINGLY LINKED LIST  ->  ang cart ng customer
   Nasa array ang mga node at index ang "pointer" (NIL = -1 kung wala).
   O(1) mag-add sa dulo dahil sa tail pointer; pag nag-remove, isang link
   lang ang binabago kaya hindi na kailangang i-shift ang iba.
   ========================================================================= */

// Ito ang "null pointer" ng linked list at tree.
var NIL = -1;

// Bagong walang lamang linked list.
// Time O(1) · Space O(1)
function llCreate() {
    return { nodes: [], head: NIL, tail: NIL, size: 0 };
}

// Dagdag sa dulo. May tail pointer kaya O(1), hindi na naglalakad.
// Time O(1) · Space O(1)
function llAppend(list, value) {
    var index = list.nodes.length;
    list.nodes[index] = { value: value, next: NIL, live: true };
    if (list.head === NIL) list.head = index;
    else list.nodes[list.tail].next = index;
    list.tail = index;
    list.size++;
    return index;
}

// Tinatanggal yung node sa index. Walang back pointer, kaya
// hinahanap muna yung nauna mula sa head.
// Time O(n) · Space O(1)
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

// Pinapalitan yung value sa index.
// Time O(1) · Space O(1)
function llUpdate(list, index, value) {
    var node = list.nodes[index];
    if (!node || !node.live) return false;
    node.value = value;
    return true;
}

// Yung value sa index, null kung wala.
// Time O(1) · Space O(1)
function llGet(list, index) {
    var node = list.nodes[index];
    return node && node.live ? node.value : null;
}

// Lakad mula head hanggang tail: [{ index, value }].
// Time O(n) · Space O(n)
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

// Lakad mula head hanggang tail, values lang.
// Time O(n) · Space O(n)
function llValues(list) {
    var entries = llEntries(list), out = [];
    for (var i = 0; i < entries.length; i++) out[i] = entries[i].value;
    return out;
}

// Walang laman ba?
// Time O(1) · Space O(1)
function llIsEmpty(list) {
    return list.head === NIL;
}

// Binubura lahat.
// Time O(1) · Space O(1)
function llClear(list) {
    list.nodes = [];
    list.head = NIL;
    list.tail = NIL;
    list.size = 0;
}
