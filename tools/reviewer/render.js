/* =========================================================================
   REVIEWER RENDER HELPERS — small HTML builders shared by the trace and
   page builders. Written under the project's rules: core.js helpers, no
   banned built-ins, no regular expressions. core.js must already be loaded
   into this process (build.js does that first).
   ========================================================================= */

/* A table from headers and rows of cell text.  Time O(n²) · Space O(n²) */
function table(headers, rows, cls) {
    return '<div class="table-wrap"><table class="tbl ' + (cls || '') + '"><thead><tr>' +
        renderEach(headers, function (h) { return '<th>' + escapeHtml(h) + '</th>'; }) + '</tr></thead><tbody>' +
        renderEach(rows, function (row) {
            return '<tr>' + renderEach(row, function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }) + '</tr>';
        }) + '</tbody></table></div>';
}

/* A paragraph of escaped text.            Time O(n) · Space O(n) */
function para(text) {
    return '<p>' + escapeHtml(text) + '</p>';
}

/* A labelled step in a trace.             Time O(n) · Space O(n) */
function traceStep(label, body) {
    return '<div class="trace-step"><p class="trace-label">' + escapeHtml(label) + '</p>' + body + '</div>';
}

/* Monospace output, escaped.              Time O(n) · Space O(n) */
function mono(text) {
    return '<pre class="mono">' + escapeHtml(text) + '</pre>';
}

/* The Input → Process → Output picture.   Time O(n) · Space O(n) */
function ipoPicture(ipo) {
    function column(title, items, cls) {
        return '<div class="ipo-col ' + cls + '"><p class="ipo-title">' + escapeHtml(title) + '</p>' +
            renderEach(items, function (x) { return '<div class="ipo-box">' + escapeHtml(x) + '</div>'; }) + '</div>';
    }
    return '<div class="ipo">' + column('Input', ipo.input, 'ipo-in') + '<div class="ipo-arrow" aria-hidden="true">→</div>' +
        column('Process', ipo.process, 'ipo-pr') + '<div class="ipo-arrow" aria-hidden="true">→</div>' +
        column('Output', ipo.output, 'ipo-out') + '</div>';
}

/* A linked list drawn as a chain of nodes from its real backing array.
                                           Time O(n) · Space O(n) */
function listPicture(list, nameOf) {
    var cells = '';
    for (var i = 0; i < list.nodes.length; i++) {
        var n = list.nodes[i];
        var cls = (i === list.head ? ' is-head' : '') + (i === list.tail ? ' is-tail' : '') + (n.live ? '' : ' is-dead');
        cells += '<div class="node' + cls + '"><span class="node-i">[' + i + ']</span><strong>' + escapeHtml(nameOf(n.value)) +
            '</strong><span class="node-next">next → ' + (n.next === -1 ? 'NIL' : n.next) + '</span>' +
            (n.live ? '' : '<span class="node-dead">removed</span>') + '</div>';
    }
    return '<div class="chain">' + cells + '</div><p class="caption">head = ' + (list.head === -1 ? 'NIL' : list.head) +
        ' · tail = ' + (list.tail === -1 ? 'NIL' : list.tail) + ' · size = ' + list.size + '</p>';
}

/* A circular queue's real buffer with head and tail marked.  Time O(n) · Space O(n) */
function queuePicture(queue, nameOf) {
    var cells = '';
    for (var i = 0; i < queue.capacity; i++) {
        var v = queue.items[i], marks = '';
        if (i === queue.head) marks += '<span class="mark mark-head">head</span>';
        if (i === queue.tail) marks += '<span class="mark mark-tail">tail</span>';
        cells += '<div class="cell' + (v === null ? ' is-empty' : '') + '"><span class="cell-i">' + i + '</span><strong>' +
            (v === null ? '—' : escapeHtml(nameOf(v))) + '</strong>' + marks + '</div>';
    }
    return '<div class="cells">' + cells + '</div><p class="caption">capacity = ' + queue.capacity + ' · count = ' + queue.count +
        ' · head = ' + queue.head + ' · tail = ' + queue.tail + '</p>';
}

/* A heap drawn level by level from its array.  Time O(n) · Space O(n) */
function heapPicture(heap, nameOf) {
    var levels = '', start = 0, width = 1;
    while (start < heap.size) {
        var row = '';
        for (var i = start; i < start + width && i < heap.size; i++) {
            var it = heap.items[i];
            row += '<div class="hnode' + (i === 0 ? ' is-root' : '') + '"><span class="node-i">[' + i + ']</span><strong>' +
                escapeHtml(nameOf(it.value)) + '</strong><span class="node-next">key (' + it.priority + ', ' + it.seq + ')</span></div>';
        }
        levels += '<div class="hlevel">' + row + '</div>';
        start += width;
        width = width * 2;
    }
    return '<div class="htree">' + (levels || '<p class="caption">empty</p>') + '</div>';
}

/* A stack, top first.                     Time O(n) · Space O(n) */
function stackPicture(stack, nameOf) {
    var cells = '';
    for (var i = stack.top; i >= 0; i--) {
        cells += '<div class="cell' + (i === stack.top ? ' is-top' : '') + '"><span class="cell-i">' + i + '</span><strong>' +
            escapeHtml(nameOf(stack.items[i])) + '</strong>' + (i === stack.top ? '<span class="mark mark-head">top</span>' : '') + '</div>';
    }
    return '<div class="cells cells-col">' + (cells || '<p class="caption">empty</p>') + '</div>';
}

/* Some buckets of a hash table and their chains.  Time O(n²) · Space O(n²) */
function bucketPicture(table, indexes) {
    return '<div class="buckets">' + renderEach(indexes, function (b) {
        var chain = table.buckets[b];
        return '<div class="bucket"><span class="b-index">[' + b + ']</span><div class="b-chain">' +
            (chain.length === 0 ? '<span class="caption">empty</span>' : renderEach(chain, function (e) {
                return '<span class="chain-pill">' + escapeHtml(e.key) + '</span>';
            }, '<span class="chain-arrow">→</span>')) + '</div></div>';
    }) + '</div>';
}

module.exports = {
    table: table, para: para, traceStep: traceStep, mono: mono, ipoPicture: ipoPicture,
    listPicture: listPicture, queuePicture: queuePicture, heapPicture: heapPicture,
    stackPicture: stackPicture, bucketPicture: bucketPicture
};
