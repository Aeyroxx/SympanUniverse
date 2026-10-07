/* =========================================================================
   DSA · MIN-HEAP  ->  rush lane ng production
   Array na parang puno: laging nasa index 0 ang pinakamaliit na key.
   Ang key ay (due date, arrival), kaya pag tabla ang date, kung sino ang
   unang nagbayad ang mauuna. O(log n) ang insert at extract.
   ========================================================================= */

// Bagong min-heap (array na parang puno).
// Time O(1) · Space O(1)
function heapCreate() {
    return { items: [], size: 0, nextSeq: 0 };
}

// Negative kung mauuna si a kaysa kay b.
// Time O(1) · Space O(1)
function heapCompare(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.seq - b.seq;
}

// Pinagpapalit yung dalawang node.
// Time O(1) · Space O(1)
function heapSwap(heap, i, j) {
    var tmp = heap.items[i];
    heap.items[i] = heap.items[j];
    heap.items[j] = tmp;
}

// Pinapataas yung node habang mas maliit siya sa parent.
// Time O(log n) · Space O(1)
function heapSiftUp(heap, index) {
    var child = index;
    while (child > 0) {
        var parent = Math.floor((child - 1) / 2);
        if (heapCompare(heap.items[child], heap.items[parent]) >= 0) break;
        heapSwap(heap, child, parent);
        child = parent;
    }
}

// Pinapababa yung node habang may anak na mas maliit.
// Time O(log n) · Space O(1)
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

// Dagdag gamit yung priority. Pwedeng ibigay yung `seq` para
// mabalik sa eksaktong dating key.
// Time O(log n) · Space O(1)
function heapInsert(heap, value, priority, seq) {
    var arrival = seq === undefined ? heap.nextSeq : seq;
    if (arrival >= heap.nextSeq) heap.nextSeq = arrival + 1;
    heap.items[heap.size] = { value: value, priority: priority === undefined ? 1 : priority, seq: arrival };
    heap.size++;
    heapSiftUp(heap, heap.size - 1);
    return heap.size;
}

// Kinukuha at tinatanggal yung pinakamaliit na key.
// Time O(log n) · Space O(1)
function heapExtractMin(heap) {
    if (heap.size === 0) return null;
    var top = heap.items[0];
    heap.size--;
    heap.items[0] = heap.items[heap.size];
    heap.items.length = heap.size;
    if (heap.size > 0) heapSiftDown(heap, 0);
    return top.value;
}

// Silip kung sino ang susunod na lalabas.
// Time O(1) · Space O(1)
function heapPeek(heap) {
    return heap.size === 0 ? null : heap.items[0].value;
}

// Tinatanggal kahit anong value (rush order na na-void): ipapalit
// yung huling node, tapos aayusin pataas at pababa.
// Time O(n) sa paghanap + O(log n) · Space O(1)
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

// Lahat ng laman ayon sa pagkakasunod, hindi sinisira yung heap.
// Insertion sort ng kopya, halos naka-ayos na kasi kaya mabilis.
// Time O(n²) worst · Space O(n)
function heapValues(heap) {
    var sorted = insertionSort(copyRange(heap.items, 0, heap.size), heapCompare), out = [];
    for (var i = 0; i < sorted.length; i++) out[out.length] = sorted[i].value;
    return out;
}
