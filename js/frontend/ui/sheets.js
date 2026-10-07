/* =========================================================================
   UI · SHEETS AT CONFIRM
   Mga sheet na sumusunod sa daliri at pwedeng magpatong-patong. Ang
   confirm ay sheet din, hindi window.confirm.
   ========================================================================= */

var openSheets = [];   // stack ng bukas na sheets: Escape, yung nasa taas ang sarado

// Bagong sheet. options: { onOpen, onClose, axis }
// Time O(n) · Space O(1)
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

// Gaano kalayo bago tuluyang nakasara.
// Time O(1) · Space O(1)
function sheetExtent(sheet) {
    var r = sheet.el.getBoundingClientRect();
    return sheet.axisOf() === 'x' ? (r.width || 1) : (r.height || 1);
}

// Pwesto ng sheet. progress: 0 = bukas, 1 = wala.
// Time O(1) · Space O(1)
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

// Pagkatapos gumalaw, aayusin yung huling estado.
// Time O(1) · Space O(1)
function sheetSettle(sheet) {
    if (sheet.spring.target >= 1 && !sheet.isOpen) {
        sheet.el.classList.remove('is-open');
        sheet.scrim.classList.remove('is-open');
    }
}

// Binubuksan yung sheet (pwedeng magpatong-patong).
// Time O(n) · Space O(n)
function sheetOpen(sheet) {
    if (sheet.isOpen) return;
    sheet.isOpen = true;
    sheet.lastFocus = document.activeElement;
    listAdd(openSheets, sheet);
    // Yung bagong sheet, nasa ibabaw ng nauna.
    var layer = 900 + openSheets.length * 20;
    sheet.scrim.style.zIndex = String(layer);
    sheet.el.style.zIndex = String(layer + 10);

    sheet.el.classList.add('is-open');
    sheet.el.setAttribute('aria-hidden', 'false');
    sheet.scrim.classList.add('is-open');
    lockScroll();
    void sheet.el.offsetHeight;          // sukatin ngayong nakikita na
    sheetRender(sheet, sheet.spring.value);
    springSetTarget(sheet.spring, 0);
    document.addEventListener('keydown', sheet.onKey);

    var body = $('.sheet-body', sheet.el);
    if (body) body.scrollTop = 0;
    var first = $('[data-autofocus]', sheet.el) || focusableIn(sheet.el)[0];
    if (first) first.focus({ preventScroll: true });
    if (sheet.onOpen) sheet.onOpen();
}

// Sinasara yung sheet.
// Time O(n) · Space O(n)
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

// Hilahin yung grip para isara.
// Time O(1) · Space O(1)
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

// Side drawer sa tablet pataas, bottom sheet sa phone.
// Time O(1) · Space O(1)
function sideAxis() {
    return window.matchMedia('(min-width: 48rem)').matches ? 'x' : 'y';
}

// ---------- Confirm ----------

var confirmSheet = null;
var confirmAction = null;

// Sheet na nagtatanong bago gumawa ng hindi na mababawi.
// Time O(n) · Space O(1)
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
