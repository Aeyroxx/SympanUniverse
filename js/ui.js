/* =========================================================================
   UI — shared interface plumbing: icons, toasts, sheets, confirmations,
   scroll lock, focus handling and DOM helpers.

   A sheet is a plain record made by sheetCreate and driven by sheetOpen /
   sheetClose. Depends on core.js and motion.js.
   ========================================================================= */

/* =========================================================================
   DOM HELPERS
   ========================================================================= */

/*                                        Time O(1)  · Space O(1) */
function $(selector, root) {
    return (root || document).querySelector(selector);
}

/* A real array of matches, copied by index.  Time O(n) · Space O(n) */
function $$(selector, root) {
    var found = (root || document).querySelectorAll(selector), out = [];
    for (var i = 0; i < found.length; i++) out[i] = found[i];
    return out;
}

/* Delegated listener: handler(event, matchedElement).  Time O(n) per event · Space O(1) */
function on(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (e) {
        var match = e.target.closest ? e.target.closest(selector) : null;
        if (match && root.contains(match)) handler(e, match);
    });
}

/*                                        Time O(1)  · Space O(1) */
function debounce(fn, wait) {
    var timer = null;
    return function (value) {
        clearTimeout(timer);
        timer = setTimeout(function () { fn(value); }, wait);
    };
}

/* Does this control report every keystroke (rather than one change)?
                                          Time O(1)  · Space O(1) */
function isTypingField(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    var type = el.type;
    return type !== 'checkbox' && type !== 'radio' && type !== 'file';
}

/*                                        Time O(1)  · Space O(1) */
function setHidden(el, hidden) {
    if (el) el.classList.toggle('hidden', hidden === true);
}

/* =========================================================================
   ICONS — a small inline set, so the page needs no icon font
   ========================================================================= */
var ICONS = [
    { id: 'search',  d: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
    { id: 'bag',     d: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>' },
    { id: 'close',   d: '<path d="m6 6 12 12M18 6 6 18"/>' },
    { id: 'check',   d: '<path d="m4 12 5 5L20 6"/>' },
    { id: 'plus',    d: '<path d="M12 5v14M5 12h14"/>' },
    { id: 'minus',   d: '<path d="M5 12h14"/>' },
    { id: 'left',    d: '<path d="m14 6-6 6 6 6"/>' },
    { id: 'right',   d: '<path d="m10 6 6 6-6 6"/>' },
    { id: 'alert',   d: '<path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/>' },
    { id: 'info',    d: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>' },
    { id: 'trash',   d: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>' },
    { id: 'star',    d: '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8Z"/>' },
    { id: 'clock',   d: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { id: 'truck',   d: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>' },
    { id: 'store',   d: '<path d="M4 9h16v10H4zM3 9l1.5-5h15L21 9"/><path d="M9 19v-5h6v5"/>' },
    { id: 'box',     d: '<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="M4 8.5 12 13l8-4.5M12 13v7"/>' },
    { id: 'sparkle', d: '<path d="M12 3l1.6 4.9L18.5 9.5 13.6 11 12 16l-1.6-5L5.5 9.5l4.9-1.6z"/>' },
    { id: 'user',    d: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>' },
    { id: 'lock',    d: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>' },
    { id: 'list',    d: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>' },
    { id: 'undo',    d: '<path d="M4 10h10a5 5 0 0 1 0 10h-3"/><path d="m4 10 4-4M4 10l4 4"/>' },
    { id: 'gift',    d: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 13h18M12 9v11"/><path d="M12 9S9.5 4 7.5 5.5 9 9 12 9Zm0 0s2.5-5 4.5-3.5S15 9 12 9Z"/>' },
    { id: 'tag',     d: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.4"/>' },
    { id: 'image',   d: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>' },
    { id: 'print',   d: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/>' },
    { id: 'edit',    d: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>' },
    { id: 'receipt', d: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>' },
    { id: 'chat',    d: '<path d="M4 5h16v11H9l-5 4z"/>' },
    { id: 'upload',  d: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>' },
    { id: 'logout',  d: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>' },
    { id: 'eye',     d: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>' },
    { id: 'download', d: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v4h16v-4"/>' },
    { id: 'external', d: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>' },
    { id: 'cloud',   d: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9Z"/><path d="M9 21l1-2M13 21l1-2"/>' }
];

/* Inline SVG for an icon name.           Time O(n)  · Space O(1) */
function icon(name, size) {
    var found = firstWhere(ICONS, function (i) { return i.id === name; });
    if (!found) return '';
    var s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
           'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
           found.d + '</svg>';
}

/* =========================================================================
   SCROLL LOCK — counted, because sheets stack (a confirm over a sheet)
   ========================================================================= */
var scrollLockDepth = 0;
var savedScrollY = 0;

/*                                        Time O(1)  · Space O(1) */
function lockScroll() {
    if (scrollLockDepth === 0) {
        savedScrollY = window.scrollY;
        document.body.style.top = -savedScrollY + 'px';
        document.body.classList.add('is-locked');
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }
    scrollLockDepth++;
}

/*                                        Time O(1)  · Space O(1) */
function unlockScroll() {
    scrollLockDepth = scrollLockDepth > 0 ? scrollLockDepth - 1 : 0;
    if (scrollLockDepth !== 0) return;
    document.body.classList.remove('is-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
}

/* =========================================================================
   FOCUS
   ========================================================================= */
var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
                'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Visible focusable elements inside a root.  Time O(n) · Space O(n) */
function focusableIn(root) {
    return keepWhere($$(FOCUSABLE, root), function (el) {
        return el.offsetParent !== null || el === document.activeElement;
    });
}

/* Keep Tab inside an open dialog.        Time O(n)  · Space O(n) */
function trapTab(root, event) {
    if (event.key !== 'Tab') return;
    var items = focusableIn(root);
    if (items.length === 0) return;
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/* =========================================================================
   TOASTS — status, success, warning, error
   ========================================================================= */
var toastLayer = null;
var TOAST_ICONS = [{ id: 'success', icon: 'check' }, { id: 'error', icon: 'alert' },
                   { id: 'warn', icon: 'alert' }, { id: 'info', icon: 'info' }];

/*                                        Time O(1)  · Space O(1) */
function ensureToastLayer() {
    if (toastLayer && document.body.contains(toastLayer)) return toastLayer;
    toastLayer = document.createElement('div');
    toastLayer.className = 'ui-toast-layer';
    toastLayer.setAttribute('role', 'status');
    toastLayer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastLayer);
    return toastLayer;
}

/* toast('Saved') or toast({ title, message, kind }).  Time O(n) · Space O(1) */
function toast(options) {
    var o = typeof options === 'string' ? { title: options } : options;
    var kind = o.kind || 'info';
    var glyph = firstWhere(TOAST_ICONS, function (t) { return t.id === kind; });
    var node = document.createElement('div');
    node.className = 'ui-toast ui-toast-' + kind;
    node.innerHTML = '<span class="ui-toast-icon">' + icon(glyph ? glyph.icon : 'info', 16) + '</span>' +
        '<span class="ui-toast-text"><strong>' + escapeHtml(o.title) + '</strong>' +
        (o.message ? '<span>' + escapeHtml(o.message) + '</span>' : '') + '</span>';
    ensureToastLayer().appendChild(node);

    // Arrives from the edge it is anchored to: above on phones, below on wide screens.
    var TRAVEL = window.matchMedia('(min-width: 62rem)').matches ? 28 : -28;
    var slide = springCreate({ preset: 'snappy', value: TRAVEL, onUpdate: function (v) {
        node.style.transform = 'translate3d(0,' + v.toFixed(2) + 'px,0)';
        node.style.opacity = String(clamp(1 - v / TRAVEL, 0, 1));
    } });
    springSetTarget(slide, 0);

    var timer = setTimeout(dismiss, o.duration || (kind === 'error' ? 5200 : 3400));
    node.addEventListener('pointerenter', function () { clearTimeout(timer); });
    node.addEventListener('pointerleave', function () { timer = setTimeout(dismiss, 1400); });
    node.addEventListener('click', dismiss);

    /* Slide out, then remove.               Time O(1)  · Space O(1) */
    function dismiss() {
        clearTimeout(timer);
        if (!node.parentNode) return;
        slide.onRest = function () { if (node.parentNode) node.parentNode.removeChild(node); };
        springSetTarget(slide, TRAVEL);
    }
}

/* =========================================================================
   SHEETS

   A sheet tracks the finger 1:1, resists past its open position, and on
   release decides by the projected landing point and the direction of
   travel — a slow drag halfway springs back, a quick flick dismisses.
   ========================================================================= */
var openSheets = [];   // a stack of open sheets: Escape closes the top one

/* options: { onOpen, onClose, axis: function returning 'x' or 'y' }
                                          Time O(n) · Space O(1) */
function sheetCreate(el, options) {
    var o = options || {};
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    document.body.appendChild(scrim);

    var sheet = {
        el: el, scrim: scrim, isOpen: false, lastFocus: null,
        onOpen: o.onOpen || null, onClose: o.onClose || null,
        axisOf: o.axis || function () { return 'y'; },
        spring: null, onKey: null
    };
    sheet.spring = springCreate({ preset: 'sheet', value: 1,
        onUpdate: function (v) { sheetRender(sheet, v); },
        onRest: function () { sheetSettle(sheet); } });
    sheet.onKey = function (e) {
        if (!sheet.isOpen || openSheets[openSheets.length - 1] !== sheet) return;
        if (e.key === 'Escape') { e.preventDefault(); sheetClose(sheet); }
        else trapTab(sheet.el, e);
    };
    scrim.addEventListener('click', function () { sheetClose(sheet); });
    var closers = $$('[data-sheet-close]', el);
    for (var i = 0; i < closers.length; i++) closers[i].addEventListener('click', function () { sheetClose(sheet); });
    var grip = $('.sheet-grip', el);
    if (grip) sheetBindDrag(sheet, grip);
    sheetRender(sheet, 1);
    return sheet;
}

/*                                        Time O(1)  · Space O(1) */
function sheetExtent(sheet) {
    var r = sheet.el.getBoundingClientRect();
    return sheet.axisOf() === 'x' ? (r.width || 1) : (r.height || 1);
}

/* progress: 0 = open, 1 = gone.          Time O(1)  · Space O(1) */
function sheetRender(sheet, progress) {
    var wide = window.matchMedia('(min-width: 62rem)').matches;
    if (sheet.el.classList.contains('sheet-full') && wide) {
        var k = clamp(1 - progress, 0, 1);
        sheet.el.style.transform = 'translate3d(-50%,-50%,0) scale(' + (0.94 + 0.06 * k).toFixed(4) + ')';
        sheet.el.style.opacity = k.toFixed(3);
    } else {
        var px = progress * sheetExtent(sheet);
        sheet.el.style.opacity = '';
        sheet.el.style.transform = sheet.axisOf() === 'x'
            ? 'translate3d(' + px.toFixed(2) + 'px,0,0)' : 'translate3d(0,' + px.toFixed(2) + 'px,0)';
    }
    sheet.scrim.style.opacity = String(clamp(1 - progress, 0, 1));
}

/*                                        Time O(1)  · Space O(1) */
function sheetSettle(sheet) {
    if (sheet.spring.target >= 1 && !sheet.isOpen) {
        sheet.el.classList.remove('is-open');
        sheet.scrim.classList.remove('is-open');
    }
}

/*                                        Time O(n)  · Space O(n) */
function sheetOpen(sheet) {
    if (sheet.isOpen) return;
    sheet.isOpen = true;
    sheet.lastFocus = document.activeElement;
    listAdd(openSheets, sheet);
    // Stacked sheets sit above the ones beneath them.
    var layer = 900 + openSheets.length * 20;
    sheet.scrim.style.zIndex = String(layer);
    sheet.el.style.zIndex = String(layer + 10);

    sheet.el.classList.add('is-open');
    sheet.el.setAttribute('aria-hidden', 'false');
    sheet.scrim.classList.add('is-open');
    lockScroll();
    void sheet.el.offsetHeight;          // measure now it is displayed
    sheetRender(sheet, sheet.spring.value);
    springSetTarget(sheet.spring, 0);
    document.addEventListener('keydown', sheet.onKey);

    var body = $('.sheet-body', sheet.el);
    if (body) body.scrollTop = 0;
    var first = $('[data-autofocus]', sheet.el) || focusableIn(sheet.el)[0];
    if (first) first.focus({ preventScroll: true });
    if (sheet.onOpen) sheet.onOpen();
}

/*                                        Time O(n)  · Space O(n) */
function sheetClose(sheet, velocity) {
    if (!sheet.isOpen) return;
    sheet.isOpen = false;
    openSheets = removeValue(openSheets, sheet);
    sheet.el.setAttribute('aria-hidden', 'true');
    sheet.scrim.classList.remove('is-open');
    document.removeEventListener('keydown', sheet.onKey);
    unlockScroll();
    springSetTarget(sheet.spring, 1, { velocity: velocity ? velocity / sheetExtent(sheet) : 0, preset: 'snappy' });
    if (sheet.lastFocus && sheet.lastFocus.focus) sheet.lastFocus.focus({ preventScroll: true });
    if (sheet.onClose) sheet.onClose();
}

/* Drag the grip to dismiss.              Time O(1)  · Space O(1) */
function sheetBindDrag(sheet, grip) {
    var extent = 1, startProgress = 0;
    dragAttach(grip, {
        axis: 'y', threshold: 4,
        onStart: function () {
            extent = sheetExtent(sheet);
            startProgress = sheet.spring.value;
            springStop(sheet.spring);
        },
        onMove: function (d) {
            var delta = sheet.axisOf() === 'x' ? d.dx : d.dy;
            var raw = startProgress + delta / extent;
            if (raw < 0) raw = -rubberband(-raw * extent, extent) / extent;
            springSet(sheet.spring, clamp(raw, -0.15, 1.2));
        },
        onEnd: function (d) {
            var v = sheet.axisOf() === 'x' ? d.vx : d.vy;
            var dismiss = sheet.spring.value + projectMomentum(v) / extent > 0.5;
            if (v > 550) dismiss = true;
            if (v < -550) dismiss = false;
            if (dismiss) sheetClose(sheet, v);
            else springSetTarget(sheet.spring, 0, { velocity: v / extent, preset: 'sheet' });
        }
    });
}

/* Side drawer on tablets and up, bottom sheet on phones.  Time O(1) · Space O(1) */
function sideAxis() {
    return window.matchMedia('(min-width: 48rem)').matches ? 'x' : 'y';
}

/* =========================================================================
   CONFIRMATION — a sheet, never window.confirm, so it can be styled,
   focus-trapped and asked for a reason.
   options: { title, message, confirmLabel, danger, reasonLabel, onConfirm(reason) }
   ========================================================================= */
var confirmSheet = null;
var confirmAction = null;

/*                                        Time O(n) · Space O(1) */
function askConfirm(options) {
    if (!confirmSheet) {
        confirmSheet = sheetCreate($('#confirmSheet'));
        $('#confirmGo').addEventListener('click', function () {
            var action = confirmAction, reasonInput = $('#confirmReason');
            confirmAction = null;
            sheetClose(confirmSheet);
            if (action) action(reasonInput ? reasonInput.value : '');
        });
    }
    confirmAction = options.onConfirm;
    $('#confirmTitle').textContent = options.title;
    $('#confirmBody').innerHTML = '<p class="t-callout dim-2">' + escapeHtml(options.message) + '</p>' +
        (options.reasonLabel ? '<label class="field mt-3"><span class="field-label">' + escapeHtml(options.reasonLabel) +
         '</span><input class="input" id="confirmReason" maxlength="160" autocomplete="off"></label>' : '');
    var go = $('#confirmGo');
    go.textContent = options.confirmLabel || 'Confirm';
    go.className = 'ui-btn ' + (options.danger ? 'ui-btn-rose' : 'ui-btn-primary') + ' flex-fill';
    sheetOpen(confirmSheet);
}

/* =========================================================================
   SMALL RENDER HELPERS shared by the shop and the order desk
   ========================================================================= */

/* An image, or a plain "no photograph yet" tile.  Time O(1) · Space O(1) */
function imageOrEmpty(src, alt) {
    if (!src) {
        return '<div class="card-media-empty">' + icon('image', 28) + '<span>Photo coming soon</span></div>';
    }
    return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt || '') + '" loading="lazy" decoding="async">';
}

/* The note that dates and times are estimates the weather and the road
   can still move.                        Time O(n) · Space O(n) */
function scheduleNoteHtml(mode) {
    return '<p class="notice schedule-note">' + icon('cloud', 16) + '<span>' + escapeHtml(scheduleNote(mode)) + '</span></p>';
}

/* Specification chips.                   Time O(n)  · Space O(n) */
function specPills(specs) {
    return '<span class="chip-pills">' + renderEach(specs, function (s) {
        return '<span class="chip-pill">' + escapeHtml(s) + '</span>';
    }) + '</span>';
}

/* A status badge coloured by status.     Time O(1)  · Space O(1) */
function statusBadge(order) {
    var tone = order.status === 'voided' ? 'badge-rose' : order.status === 'completed' ? 'badge-green'
             : order.status === 'paid' ? 'badge-ink' : 'badge-amber';
    return '<span class="badge ' + tone + '">' + escapeHtml(statusLabel(order)) + '</span>';
}

/* Key–value rows.                        Time O(n)  · Space O(n) */
function summaryRows(rows) {
    return '<div class="summary">' + renderEach(rows, function (r) {
        return '<div' + (r.grand ? ' class="grand"' : '') + '><span class="k">' + escapeHtml(r.k) +
               '</span><span class="v">' + escapeHtml(r.v) + '</span></div>';
    }) + '</div>';
}

/* Watch the page scroll for the chrome's edge effect.  Time O(1) · Space O(1) */
function watchScroll() {
    var ticking = false;
    /* One class toggle per frame.          Time O(1)  · Space O(1) */
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
