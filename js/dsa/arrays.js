/* =========================================================================
   DSA · ARRAYS
   Sarili naming bersyon ng mga bawal na built-in ng array: push, slice,
   indexOf, filter, find, map, join, reverse. Bawal kasi sa DSA guide yung
   built-in, kaya ginawa namin gamit lang ang for loop at index.
   ========================================================================= */

// Nilalagay sa dulo ng array (sarili naming push).
// Time O(1) · Space O(1)
function listAdd(list, value) {
    list[list.length] = value;
    return list.length;
}

// Bagong array na kapareho ng laman.
// Time O(n) · Space O(n)
function copyArray(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) out[i] = list[i];
    return out;
}

// Kopya ng elements mula start hanggang end-1 (sarili naming slice).
// Time O(n) · Space O(n)
function copyRange(list, start, end) {
    var stop = end === undefined || end > list.length ? list.length : end;
    var out = [];
    for (var i = start; i < stop; i++) out[out.length] = list[i];
    return out;
}

// Saang index yung value, -1 kung wala. Linear search.
// Time O(n) · Space O(1)
function positionIn(list, value) {
    for (var i = 0; i < list.length; i++) {
        if (list[i] === value) return i;
    }
    return -1;
}

// Nasa array ba yung value?
// Time O(n) · Space O(1)
function isIn(list, value) {
    return positionIn(list, value) !== -1;
}

// Yung mga element lang na pumasa sa test (sarili naming filter).
// Time O(n) · Space O(n)
function keepWhere(list, test) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) out[out.length] = list[i];
    }
    return out;
}

// Unang element na pumasa sa test (sarili naming find).
// Time O(n) · Space O(1)
function firstWhere(list, test) {
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) return list[i];
    }
    return null;
}

// Ilan yung pumasa sa test.
// Time O(n) · Space O(1)
function countWhere(list, test) {
    var total = 0;
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) total++;
    }
    return total;
}

// Bagong array na wala na yung unang kopya ng value.
// Time O(n) · Space O(n)
function removeValue(list, value) {
    var out = [], removed = false;
    for (var i = 0; i < list.length; i++) {
        if (!removed && list[i] === value) { removed = true; continue; }
        out[out.length] = list[i];
    }
    return out;
}

// Bagong array na may isa pang element sa dulo.
// Time O(n) · Space O(n)
function withAdded(list, value) {
    var out = copyArray(list);
    out[out.length] = value;
    return out;
}

// Bagong array na baliktad ang ayos.
// Time O(n) · Space O(n)
function backwards(list) {
    var out = [];
    for (var i = list.length - 1; i >= 0; i--) out[out.length] = list[i];
    return out;
}

// Gumagawa ng text galing sa bawat element (parang map tapos join).
// Time O(n) · Space O(n)
function renderEach(list, build, separator) {
    var text = '', gap = separator === undefined ? '' : separator;
    for (var i = 0; i < list.length; i++) {
        if (i > 0) text += gap;
        text += build(list[i], i);
    }
    return text;
}

// Pinagdudugtong yung mga text gamit yung separator (sarili naming join).
// Time O(n) · Space O(n)
function glue(list, separator) {
    var text = '', gap = separator === undefined ? '' : separator;
    for (var i = 0; i < list.length; i++) {
        if (i > 0) text += gap;
        text += list[i];
    }
    return text;
}

// Kinokopya yung record tapos nilalagay yung mga pagbabago.
// Time O(n) · Space O(n)
function copyRecord(record, changes) {
    var out = {}, key;
    for (key in record) out[key] = record[key];
    if (changes) {
        for (key in changes) out[key] = changes[key];
    }
    return out;
}
