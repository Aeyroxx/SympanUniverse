/* =========================================================================
   UI · MALILIIT NA PARTE
   Mga piraso na gamit ng shop at ng desk: litrato, chips, badge, rows.
   ========================================================================= */

// Litrato, o tile na "wala pang litrato".
// Time O(1) · Space O(1)
function imageOrEmpty(src, alt) {
    if (!src) {
        return '<div class="card-media-empty">' + icon('image', 28) + '<span>Photo coming soon</span></div>';
    }
    return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt || '') + '" loading="lazy" decoding="async">';
}

// Paalala na estimate lang yung date at oras.
// Time O(n) · Space O(n)
function scheduleNoteHtml(mode) {
    return '<p class="notice schedule-note">' + icon('cloud', 16) + '<span>' + escapeHtml(scheduleNote(mode)) + '</span></p>';
}

// Mga chips ng detalye.
// Time O(n) · Space O(n)
function specPills(specs) {
    return '<span class="chip-pills">' + renderEach(specs, function (s) {
        return '<span class="chip-pill">' + escapeHtml(s) + '</span>';
    }) + '</span>';
}

// Badge ng status na may kulay.
// Time O(1) · Space O(1)
function statusBadge(order) {
    var tone = order.status === 'voided' ? 'badge-rose' : order.status === 'completed' ? 'badge-green'
             : order.status === 'paid' ? 'badge-ink' : 'badge-amber';
    return '<span class="badge ' + tone + '">' + escapeHtml(statusLabel(order)) + '</span>';
}

// Mga row na key at value.
// Time O(n) · Space O(n)
function summaryRows(rows) {
    return '<div class="summary">' + renderEach(rows, function (r) {
        return '<div' + (r.grand ? ' class="grand"' : '') + '><span class="k">' + escapeHtml(r.k) +
               '</span><span class="v">' + escapeHtml(r.v) + '</span></div>';
    }) + '</div>';
}

// Binabantayan ang scroll para sa effect sa gilid ng header.
// Time O(1) · Space O(1)
function watchScroll() {
    var ticking = false;
    // Isang class toggle bawat frame.
    // Time O(1) · Space O(1)
    function update() {
        document.documentElement.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
    update();
}
