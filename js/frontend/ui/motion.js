/* =========================================================================
   UI · MOTION
   Springs para sa sheets at gestures: pwedeng hawakan at ibalik habang
   gumagalaw, tuloy ang bilis ng daliri pag binitawan, at may rubber-band
   sa gilid. Isang requestAnimationFrame loop lang para sa lahat.
   ========================================================================= */

var SPRING_PRESETS = [
    { id: 'move',     damping: 1.0,  response: 0.40 },  // lipat ng pwesto, walang talbog
    { id: 'snappy',   damping: 1.0,  response: 0.28 },  // maliit at mabilis na UI
    { id: 'sheet',    damping: 0.86, response: 0.32 },  // drawers at sheets
    { id: 'momentum', damping: 0.80, response: 0.40 },  // pagkatapos ng flick
    { id: 'gentle',   damping: 1.0,  response: 0.55 }   // malalaking surface
];

var REST_DISTANCE = 0.04;   // px, mas maliit dito parang hindi na gumagalaw
var REST_VELOCITY = 0.4;    // px/s
var activeSprings = [];     // lahat ng spring na gumagalaw ngayon
var motionFrame = null;     // yung susunod na animation frame, kung meron

// Naka-on ba yung reduced motion ng user?
// Time O(1) · Space O(1)
function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Pinapanatili yung number sa pagitan ng low at high.
// Time O(1) · Space O(1)
function clamp(value, low, high) {
    return value < low ? low : (value > high ? high : value);
}

// ---------- Springs ----------

// Bagong spring. options: { preset, value, onUpdate, onRest }
// Time O(n) · Space O(1)
function springCreate(options) {
    var preset = firstWhere(SPRING_PRESETS, function (p) { return p.id === (options.preset || 'move'); });
    return {
        damping: preset.damping, response: preset.response,
        value: options.value || 0, velocity: 0, target: options.value || 0,
        onUpdate: options.onUpdate || null, onRest: options.onRest || null,
        t0: 0, from: options.value || 0, v0: 0, resting: true
    };
}

// Isang frame loop para sa lahat ng gumagalaw na spring.
// Time O(n) · Space O(n)
function motionTick(now) {
    motionFrame = null;
    var still = [];
    for (var i = 0; i < activeSprings.length; i++) {
        if (springStep(activeSprings[i], now)) listAdd(still, activeSprings[i]);
    }
    activeSprings = still;
    if (activeSprings.length > 0) motionFrame = requestAnimationFrame(motionTick);
}

// Sinisimulan yung frame loop kung tulog.
// Time O(n) · Space O(1)
function motionWake(spring) {
    if (!isIn(activeSprings, spring)) listAdd(activeSprings, spring);
    if (motionFrame === null) motionFrame = requestAnimationFrame(motionTick);
}

// Tinitigil yung loop pag wala nang gumagalaw.
// Time O(n) · Space O(n)
function motionSleep(spring) {
    activeSprings = removeValue(activeSprings, spring);
}

// Bagong target galing sa kasalukuyang value at bilis, kaya smooth
// pag biglang bumalik. opts: { velocity, preset }
// Time O(n) · Space O(1)
function springSetTarget(spring, target, opts) {
    var o = opts || {};
    if (o.velocity !== undefined) spring.velocity = o.velocity;
    if (o.preset) {
        var preset = firstWhere(SPRING_PRESETS, function (p) { return p.id === o.preset; });
        if (preset) { spring.damping = preset.damping; spring.response = preset.response; }
    }
    spring.target = target;

    if (reducedMotion()) {
        spring.value = target;
        spring.velocity = 0;
        spring.resting = true;
        motionSleep(spring);
        if (spring.onUpdate) spring.onUpdate(spring.value);
        if (spring.onRest) spring.onRest();
        return;
    }
    spring.from = spring.value;
    spring.v0 = spring.velocity;
    spring.t0 = 0;
    spring.resting = false;
    motionWake(spring);
}

// Talon agad sa value (daliri na ang may hawak).
// Time O(n) · Space O(1)
function springSet(spring, value) {
    spring.value = value;
    spring.velocity = 0;
    spring.target = value;
    spring.resting = true;
    motionSleep(spring);
    if (spring.onUpdate) spring.onUpdate(spring.value);
}

// Tigil ang spring kung nasaan siya.
// Time O(n) · Space O(1)
function springStop(spring) {
    spring.target = spring.value;
    spring.velocity = 0;
    spring.resting = true;
    motionSleep(spring);
}

// Closed-form na sagot ng spring equation, kaya pareho kahit
// iba ang frame rate. false pag tumigil na.
// Time O(1) · Space O(1)
function springStep(spring, now) {
    if (spring.t0 === 0) spring.t0 = now;
    var t = (now - spring.t0) / 1000;
    var w0 = (2 * Math.PI) / spring.response;
    var z = spring.damping;
    var A = spring.from - spring.target;
    var v0 = spring.v0;
    var x, v;

    if (z < 1) {
        var wd = w0 * Math.sqrt(1 - z * z);
        var B = (v0 + z * w0 * A) / wd;
        var e = Math.exp(-z * w0 * t), c = Math.cos(wd * t), s = Math.sin(wd * t);
        x = e * (A * c + B * s);
        v = e * (-z * w0 * (A * c + B * s) + (-A * wd * s + B * wd * c));
    } else {
        var k = v0 + w0 * A, ec = Math.exp(-w0 * t);
        x = (A + k * t) * ec;
        v = ec * (v0 - w0 * k * t);
    }

    spring.value = spring.target + x;
    spring.velocity = v;
    if (Math.abs(x) < REST_DISTANCE && Math.abs(v) < REST_VELOCITY) {
        spring.value = spring.target;
        spring.velocity = 0;
        spring.resting = true;
        if (spring.onUpdate) spring.onUpdate(spring.value);
        if (spring.onRest) spring.onRest();
        return false;
    }
    if (spring.onUpdate) spring.onUpdate(spring.value);
    return true;
}

// Saan titigil yung flick (parang scroll deceleration).
// Time O(1) · Space O(1)
function projectMomentum(velocity) {
    var rate = 0.998;
    return (velocity / 1000) * rate / (1 - rate);
}

// Unti-unting tumitigas pag lumampas sa gilid.
// Time O(1) · Space O(1)
function rubberband(overshoot, dimension) {
    var c = 0.55;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

// ---------- Drag (1:1 sa daliri) ----------

var DRAG_HISTORY_MS = 100;

// Kinakabit yung drag. handlers: { axis, threshold, onStart, onMove, onEnd, onTap }
// Time O(1) · Space O(1)
function dragAttach(el, handlers) {
    var drag = {
        el: el, h: handlers, axis: handlers.axis || 'y',
        threshold: handlers.threshold === undefined ? 8 : handlers.threshold,
        samples: [], active: false, committed: false, pointerId: null, startX: 0, startY: 0,
        onDown: null, onMove: null, onUp: null
    };
    drag.onDown = function (e) { dragDown(drag, e); };
    drag.onMove = function (e) { dragMove(drag, e); };
    drag.onUp = function (e) { dragUp(drag, e); };
    el.addEventListener('pointerdown', drag.onDown);
    return drag;
}

// Huling 100 ms lang ng samples ang tinatago.
// Time O(n) · Space O(n)
function dragSample(drag, e) {
    var now = e.timeStamp || performance.now();
    listAdd(drag.samples, { x: e.clientX, y: e.clientY, t: now });
    var recent = [];
    for (var i = 0; i < drag.samples.length; i++) {
        var keep = now - drag.samples[i].t <= DRAG_HISTORY_MS || i >= drag.samples.length - 2;
        if (keep) listAdd(recent, drag.samples[i]);
    }
    drag.samples = recent;
}

// Bilis (px/s) sa mga natitirang sample.
// Time O(1) · Space O(1)
function dragVelocity(drag) {
    var h = drag.samples;
    if (h.length < 2) return { x: 0, y: 0 };
    var first = h[0], last = h[h.length - 1];
    var dt = (last.t - first.t) / 1000;
    if (dt <= 0) return { x: 0, y: 0 };
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}

// Pag pinindot: simula ng drag.
// Time O(n) · Space O(n)
function dragDown(drag, e) {
    if (drag.active) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.active = true;
    drag.committed = false;
    drag.pointerId = e.pointerId;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.samples = [];
    dragSample(drag, e);
    try { drag.el.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
    window.addEventListener('pointermove', drag.onMove, { passive: false });
    window.addEventListener('pointerup', drag.onUp);
    window.addEventListener('pointercancel', drag.onUp);
    if (drag.h.onStart) drag.h.onStart();
}

// Hintay muna ng totoong galaw bago kunin ang drag, at bigay sa kabilang
// axis para nag-i-scroll pa rin yung page.
// Time O(n) · Space O(n)
function dragMove(drag, e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    dragSample(drag, e);
    var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (!drag.committed) {
        var travel = drag.axis === 'x' ? Math.abs(dx) : Math.abs(dy);
        if (travel < drag.threshold) return;
        if (drag.axis === 'y' && Math.abs(dx) > Math.abs(dy)) { dragTeardown(drag); return; }
        if (drag.axis === 'x' && Math.abs(dy) > Math.abs(dx)) { dragTeardown(drag); return; }
        drag.committed = true;
    }
    if (e.cancelable) e.preventDefault();
    if (drag.h.onMove) drag.h.onMove({ dx: dx, dy: dy });
}

// Pag binitawan: tapos o tap.
// Time O(1) · Space O(1)
function dragUp(drag, e) {
    if (!drag.active || (e && e.pointerId !== drag.pointerId)) return;
    var committed = drag.committed, v = dragVelocity(drag);
    var dx = e ? e.clientX - drag.startX : 0, dy = e ? e.clientY - drag.startY : 0;
    dragTeardown(drag);
    if (committed && drag.h.onEnd) drag.h.onEnd({ dx: dx, dy: dy, vx: v.x, vy: v.y });
    else if (!committed && drag.h.onTap) drag.h.onTap(e);
}

// Tinatanggal yung mga listener ng drag.
// Time O(1) · Space O(1)
function dragTeardown(drag) {
    drag.active = false;
    drag.committed = false;
    try { drag.el.releasePointerCapture(drag.pointerId); } catch (err) { /* already released */ }
    drag.pointerId = null;
    window.removeEventListener('pointermove', drag.onMove);
    window.removeEventListener('pointerup', drag.onUp);
    window.removeEventListener('pointercancel', drag.onUp);
}
