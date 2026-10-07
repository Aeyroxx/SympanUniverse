/* =========================================================================
   UI · TOASTS
   Maliit na mensahe sa taas ng page: success, info, warning, error.
   ========================================================================= */

var toastLayer = null;

var TOAST_ICONS = [{ id: 'success', icon: 'check' }, { id: 'error', icon: 'alert' },
                   { id: 'warn', icon: 'alert' }, { id: 'info', icon: 'info' }];

// Ginagawa yung lalagyan ng toasts kung wala pa.
// Time O(1) · Space O(1)
function ensureToastLayer() {
    if (toastLayer && document.body.contains(toastLayer)) return toastLayer;
    toastLayer = document.createElement('div');
    toastLayer.className = 'ui-toast-layer';
    toastLayer.setAttribute('role', 'status');
    toastLayer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastLayer);
    return toastLayer;
}

// Maliit na mensahe. toast('Saved') o toast({ title, message, kind }).
// Time O(n) · Space O(1)
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

    // Lumalabas galing sa gilid niya: taas sa phone, baba sa malaking screen.
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

    // Slide palabas, tapos tanggal.
    // Time O(1) · Space O(1)
    function dismiss() {
        clearTimeout(timer);
        if (!node.parentNode) return;
        slide.onRest = function () { if (node.parentNode) node.parentNode.removeChild(node); };
        springSetTarget(slide, TRAVEL);
    }
}
