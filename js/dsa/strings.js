/* =========================================================================
   DSA · STRINGS
   Sarili naming bersyon ng string built-ins: trim, split, replace,
   toLowerCase, substring, includes. Gamit lang ang charAt at charCodeAt,
   at walang regular expression.
   ========================================================================= */

// Isang letra lang, ginagawang small letter.
// Time O(1) · Space O(1)
function charLower(c) {
    var code = c.charCodeAt(0);
    return code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : c;
}

// Buong text, small letters lahat (sarili naming toLowerCase).
// Time O(n) · Space O(n)
function toLower(text) {
    var s = String(text), out = '';
    for (var i = 0; i < s.length; i++) out += charLower(s.charAt(i));
    return out;
}

// Space, tab o line break ba?
// Time O(1) · Space O(1)
function isSpace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

// Number ba yung character (0-9)?
// Time O(1) · Space O(1)
function isDigit(c) {
    var code = c.charCodeAt(0);
    return code >= 48 && code <= 57;
}

// Letra ba yung character (A-Z o a-z)?
// Time O(1) · Space O(1)
function isLetter(c) {
    var code = c.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

// Mga character mula start hanggang end-1 (sarili naming substring).
// Time O(n) · Space O(n)
function textPart(text, start, end) {
    var s = String(text);
    var stop = end === undefined || end > s.length ? s.length : end;
    var out = '';
    for (var i = start < 0 ? 0 : start; i < stop; i++) out += s.charAt(i);
    return out;
}

// Unang `end` na characters, pero hindi hinahati yung emoji
// na dalawang piraso (masisira kasi yung download link pag nahati).
// Time O(n) · Space O(n)
function textCut(text, end) {
    var s = String(text), stop = end < s.length ? end : s.length;
    if (stop > 0 && stop < s.length) {
        var code = s.charCodeAt(stop - 1);
        if (code >= 0xD800 && code <= 0xDBFF) stop--;
    }
    return textPart(s, 0, stop);
}

// Tinatanggal yung space sa unahan at dulo (sarili naming trim).
// Time O(n) · Space O(n)
function strip(text) {
    var s = text === null || text === undefined ? '' : String(text);
    var start = 0, end = s.length;
    while (start < end && isSpace(s.charAt(start))) start++;
    while (end > start && isSpace(s.charAt(end - 1))) end--;
    return textPart(s, start, end);
}

// Wala bang laman pag tinanggal yung spaces?
// Time O(n) · Space O(n)
function isBlank(text) {
    return strip(text).length === 0;
}

// Nandoon ba yung salita sa text? Naive scan, letra por letra.
// Time O(n²) (bawat simula × haba ng hinahanap) · Space O(1)
function textHas(haystack, needle) {
    var text = String(haystack), find = String(needle);
    if (find.length === 0) return true;
    for (var start = 0; start + find.length <= text.length; start++) {
        var k = 0;
        while (k < find.length && text.charAt(start + k) === find.charAt(k)) k++;
        if (k === find.length) return true;
    }
    return false;
}

// Nagsisimula ba yung text sa prefix?
// Time O(n) · Space O(1)
function beginsWith(text, prefix) {
    var s = String(text), p = String(prefix);
    if (p.length > s.length) return false;
    for (var i = 0; i < p.length; i++) {
        if (s.charAt(i) !== p.charAt(i)) return false;
    }
    return true;
}

// Hinahati yung text sa bawat separator (sarili naming split).
// Time O(n) sa maiikling separator dito; O(n²) worst · Space O(n)
function cutText(text, separator) {
    var s = String(text), sep = String(separator), pieces = [], current = '';
    var i = 0;
    while (i < s.length) {
        var k = 0;
        while (k < sep.length && i + k < s.length && s.charAt(i + k) === sep.charAt(k)) k++;
        if (sep.length > 0 && k === sep.length) {
            pieces[pieces.length] = current;
            current = '';
            i += sep.length;
        } else {
            current += s.charAt(i);
            i++;
        }
    }
    pieces[pieces.length] = current;
    return pieces;
}

// Pinapalitan lahat ng isang text ng iba (sarili naming replace).
// Time O(n) sa maiikling text dito; O(n²) worst · Space O(n)
function swapText(text, find, replacement) {
    var s = String(text), f = String(find), out = '', i = 0;
    if (f.length === 0) return s;
    while (i < s.length) {
        var k = 0;
        while (k < f.length && i + k < s.length && s.charAt(i + k) === f.charAt(k)) k++;
        if (k === f.length) { out += replacement; i += f.length; }
        else { out += s.charAt(i); i++; }
    }
    return out;
}

// Nilalagyan ng padding sa kaliwa hanggang umabot sa width.
// Time O(n) · Space O(n)
function leftPad(text, width, fill) {
    var s = String(text), out = '';
    for (var i = s.length; i < width; i++) out += fill;
    return out + s;
}

// Numbers lang ang tinitira.
// Time O(n) · Space O(n)
function digitsOnly(text) {
    var s = String(text), out = '';
    for (var i = 0; i < s.length; i++) {
        if (isDigit(s.charAt(i))) out += s.charAt(i);
    }
    return out;
}

// Small letters, walang space sa dulo, isang space lang sa gitna.
// Kaya " Quezon City " = "quezon city".
// Time O(n) · Space O(n)
function normaliseKey(text) {
    var s = strip(toLower(text)), out = '', lastSpace = false;
    for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (isSpace(c) || c === '.' || c === ',') {
            if (!lastSpace) out += ' ';
            lastSpace = true;
        } else {
            out += c;
            lastSpace = false;
        }
    }
    return strip(out);
}
