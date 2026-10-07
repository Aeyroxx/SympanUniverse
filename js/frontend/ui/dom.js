/* =========================================================================
   UI · DOM HELPERS
   Maliliit na helper sa page: $, listeners, icons, scroll lock, focus at
   escapeHtml (dito dumadaan lahat ng text bago ilagay sa page).
   ========================================================================= */

// Unang element na tugma sa selector.
// Time O(1) · Space O(1)
function $(selector, root) {
    return (root || document).querySelector(selector);
}

// Lahat ng tugma bilang totoong array.
// Time O(n) · Space O(n)
function $$(selector, root) {
    var found = (root || document).querySelectorAll(selector), out = [];
    for (var i = 0; i < found.length; i++) out[i] = found[i];
    return out;
}

// Delegated listener: handler(event, element na tumugma).
// Time O(n) bawat event · Space O(1)
function on(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (e) {
        var match = e.target.closest ? e.target.closest(selector) : null;
        if (match && root.contains(match)) handler(e, match);
    });
}

// Hinihintay matapos ang sunod-sunod na tawag bago tumakbo.
// Time O(1) · Space O(1)
function debounce(fn, wait) {
    var timer = null;
    return function (value) {
        clearTimeout(timer);
        timer = setTimeout(function () { fn(value); }, wait);
    };
}

// Field ba ito na nagre-report bawat pindot ng key?
// Time O(1) · Space O(1)
function isTypingField(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    var type = el.type;
    return type !== 'checkbox' && type !== 'radio' && type !== 'file';
}

// Tago o pakita ng element.
// Time O(1) · Space O(1)
function setHidden(el, hidden) {
    if (el) el.classList.toggle('hidden', hidden === true);
}

// Ine-escape yung text bago ilagay sa HTML. Dumadaan dito lahat
// ng pangalan at notes ng customer para walang ma-inject.
// Time O(n) · Space O(n)
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    var s = String(value), out = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (c === '&') out += '&amp;';
        else if (c === '<') out += '&lt;';
        else if (c === '>') out += '&gt;';
        else if (c === '"') out += '&quot;';
        else if (c === "'") out += '&#39;';
        else out += c;
    }
    return out;
}

// ---------- Icons ----------

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

// Inline SVG ng icon.
// Time O(n) · Space O(1)
function icon(name, size) {
    var found = firstWhere(ICONS, function (i) { return i.id === name; });
    if (!found) return '';
    var s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
           'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
           found.d + '</svg>';
}

// ---------- Scroll lock (may bilang kasi nagpapatong ang sheets) ----------

var scrollLockDepth = 0;
var savedScrollY = 0;

// Hindi muna pwedeng mag-scroll ang page (may bukas na sheet).
// Time O(1) · Space O(1)
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

// Pwede na ulit mag-scroll.
// Time O(1) · Space O(1)
function unlockScroll() {
    scrollLockDepth = scrollLockDepth > 0 ? scrollLockDepth - 1 : 0;
    if (scrollLockDepth !== 0) return;
    document.body.classList.remove('is-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
}

// ---------- Focus ----------

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
                'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mga pwedeng i-focus sa loob ng root.
// Time O(n) · Space O(n)
function focusableIn(root) {
    return keepWhere($$(FOCUSABLE, root), function (el) {
        return el.offsetParent !== null || el === document.activeElement;
    });
}

// Sa loob lang ng bukas na dialog umiikot yung Tab.
// Time O(n) · Space O(n)
function trapTab(root, event) {
    if (event.key !== 'Tab') return;
    var items = focusableIn(root);
    if (items.length === 0) return;
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
