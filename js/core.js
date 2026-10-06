/* =========================================================================
   CORE — the primitives everything else is built from.

   House rules for the whole project, enforced by tests/rubric.js:
     · Data lives in arrays. Records are plain objects held in arrays.
     · Arrays live in memory only. Nothing is written to storage, so nothing
       moves between pages — the shop and the order desk share one page.
     · Procedural, not object-oriented: no classes, constructors, prototypes
       or `this`. Data is passed to functions; functions return data.
     · No built-in helpers that do the work: none of push, pop, shift,
       unshift, splice, slice, concat, sort, reverse, indexOf, lastIndexOf,
       includes, find, findIndex, filter, map, forEach, reduce, some, every,
       join, nor the string versions search, indexOf, includes, startsWith,
       split, replace, trim, toLowerCase, toUpperCase, padStart, substring —
       and no regular expressions. This file is where their replacements are
       written by hand, once, out of indexed loops and character codes.

   Every function states its time and space cost. n is the length of the
   input array or string; m is the length of a second input.
   ========================================================================= */

/* =========================================================================
   ARRAYS
   ========================================================================= */

/* Append to the end.                     Time O(1)  · Space O(1) */
function listAdd(list, value) {
    list[list.length] = value;
    return list.length;
}

/* A new array holding the same elements. Time O(n)  · Space O(n) */
function copyArray(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) out[i] = list[i];
    return out;
}

/* Elements start..end-1 as a new array.  Time O(n) · Space O(n) */
function copyRange(list, start, end) {
    var stop = end === undefined || end > list.length ? list.length : end;
    var out = [];
    for (var i = start; i < stop; i++) out[out.length] = list[i];
    return out;
}

/* Position of a value, or -1. Linear search. Time O(n) · Space O(1) */
function positionIn(list, value) {
    for (var i = 0; i < list.length; i++) {
        if (list[i] === value) return i;
    }
    return -1;
}

/* Does the array hold this value?        Time O(n)  · Space O(1) */
function isIn(list, value) {
    return positionIn(list, value) !== -1;
}

/* The elements a test accepts.           Time O(n)  · Space O(n) */
function keepWhere(list, test) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) out[out.length] = list[i];
    }
    return out;
}

/* The first element a test accepts.      Time O(n)  · Space O(1) */
function firstWhere(list, test) {
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) return list[i];
    }
    return null;
}

/* How many elements a test accepts.      Time O(n)  · Space O(1) */
function countWhere(list, test) {
    var total = 0;
    for (var i = 0; i < list.length; i++) {
        if (test(list[i], i)) total++;
    }
    return total;
}

/* A new array without the first copy of a value. Time O(n) · Space O(n) */
function removeValue(list, value) {
    var out = [], removed = false;
    for (var i = 0; i < list.length; i++) {
        if (!removed && list[i] === value) { removed = true; continue; }
        out[out.length] = list[i];
    }
    return out;
}

/* A new array with one more element at the end. Time O(n) · Space O(n) */
function withAdded(list, value) {
    var out = copyArray(list);
    out[out.length] = value;
    return out;
}

/* A new array in the opposite order.     Time O(n)  · Space O(n) */
function backwards(list) {
    var out = [];
    for (var i = list.length - 1; i >= 0; i--) out[out.length] = list[i];
    return out;
}

/* Build text from each element.          Time O(n)  · Space O(n) */
function renderEach(list, build, separator) {
    var text = '', gap = separator === undefined ? '' : separator;
    for (var i = 0; i < list.length; i++) {
        if (i > 0) text += gap;
        text += build(list[i], i);
    }
    return text;
}

/* Text values joined by a separator.     Time O(n)  · Space O(n) */
function glue(list, separator) {
    var text = '', gap = separator === undefined ? '' : separator;
    for (var i = 0; i < list.length; i++) {
        if (i > 0) text += gap;
        text += list[i];
    }
    return text;
}

/* Copy a record's own fields, then apply changes. Time O(n) · Space O(n) */
function copyRecord(record, changes) {
    var out = {}, key;
    for (key in record) out[key] = record[key];
    if (changes) {
        for (key in changes) out[key] = changes[key];
    }
    return out;
}

/* =========================================================================
   STRINGS — built on charAt / charCodeAt / fromCharCode only
   ========================================================================= */

/* One character to lower case.           Time O(1)  · Space O(1) */
function charLower(c) {
    var code = c.charCodeAt(0);
    return code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : c;
}

/* Whole string to lower case.            Time O(n)  · Space O(n) */
function toLower(text) {
    var s = String(text), out = '';
    for (var i = 0; i < s.length; i++) out += charLower(s.charAt(i));
    return out;
}

/* Space, tab or line break?              Time O(1)  · Space O(1) */
function isSpace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

/* Is this character a digit 0-9?         Time O(1)  · Space O(1) */
function isDigit(c) {
    var code = c.charCodeAt(0);
    return code >= 48 && code <= 57;
}

/* Characters start..end-1.               Time O(n) · Space O(n) */
function textPart(text, start, end) {
    var s = String(text);
    var stop = end === undefined || end > s.length ? s.length : end;
    var out = '';
    for (var i = start < 0 ? 0 : start; i < stop; i++) out += s.charAt(i);
    return out;
}

/* Remove leading and trailing whitespace. Time O(n) · Space O(n) */
function strip(text) {
    var s = text === null || text === undefined ? '' : String(text);
    var start = 0, end = s.length;
    while (start < end && isSpace(s.charAt(start))) start++;
    while (end > start && isSpace(s.charAt(end - 1))) end--;
    return textPart(s, start, end);
}

/* Is the text empty once whitespace is removed? Time O(n) · Space O(n) */
function isBlank(text) {
    return strip(text).length === 0;
}

/* Does the text contain the needle? Naive scan. Time O(n²) — every start position × the needle · Space O(1) */
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

/* Does the text begin with the prefix?   Time O(n) · Space O(1) */
function beginsWith(text, prefix) {
    var s = String(text), p = String(prefix);
    if (p.length > s.length) return false;
    for (var i = 0; i < p.length; i++) {
        if (s.charAt(i) !== p.charAt(i)) return false;
    }
    return true;
}

/* Break text into pieces at each separator. Time O(n) with the short separators used here; O(n²) worst · Space O(n) */
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

/* Swap every occurrence of one text for another. Time O(n) with the short texts used here; O(n²) worst · Space O(n) */
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

/* Pad on the left to a width.            Time O(n) · Space O(n) */
function leftPad(text, width, fill) {
    var s = String(text), out = '';
    for (var i = s.length; i < width; i++) out += fill;
    return out + s;
}

/* Keep only the digits.                  Time O(n)  · Space O(n) */
function digitsOnly(text) {
    var s = String(text), out = '';
    for (var i = 0; i < s.length; i++) {
        if (isDigit(s.charAt(i))) out += s.charAt(i);
    }
    return out;
}

/* Lower-case, trimmed, inner runs of space collapsed — the form keys are
   compared in, so "  Quezon   City " finds "quezon city". Time O(n) · Space O(n) */
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

/* =========================================================================
   NUMBERS AND MONEY
   ========================================================================= */

/* A number from user input, or NaN.      Time O(n)  · Space O(n) */
function toNumber(text) {
    var s = strip(text);
    if (s.length === 0) return NaN;
    return Number(s);
}

/* Round to whole centavos.               Time O(1)  · Space O(1) */
function roundMoney(amount) {
    return Math.round(Number(amount) * 100) / 100;
}

/* "1234567" -> "1,234,567".              Time O(n)  · Space O(n) */
function groupThousands(digits) {
    var out = '', count = 0;
    for (var i = digits.length - 1; i >= 0; i--) {
        out = digits.charAt(i) + out;
        count++;
        if (count % 3 === 0 && i > 0) out = ',' + out;
    }
    return out;
}

/* ₱1,234.50                              Time O(n) · Space O(n) */
function peso(amount) {
    var cents = Math.round(Math.abs(Number(amount) || 0) * 100);
    var whole = Math.floor(cents / 100), frac = cents % 100;
    var sign = Number(amount) < 0 ? '−' : '';
    return sign + '₱' + groupThousands(String(whole)) + '.' + leftPad(frac, 2, '0');
}

/* ₱1,235 — no centavos, for compact labels. Time O(n) · Space O(n) */
function pesoWhole(amount) {
    var whole = Math.round(Math.abs(Number(amount) || 0));
    var sign = Number(amount) < 0 ? '−' : '';
    return sign + '₱' + groupThousands(String(whole));
}

/* "1 flower" / "3 flowers".              Time O(1)  · Space O(1) */
function plural(count, one, many) {
    return count === 1 ? one : (many === undefined ? one + 's' : many);
}

/* =========================================================================
   DATES — kept as "YYYY-MM-DD" text and millisecond stamps
   ========================================================================= */

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                   'August', 'September', 'October', 'November', 'December'];
var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* 7 -> "07".                             Time O(1)  · Space O(1) */
function twoDigits(n) {
    return n < 10 ? '0' + n : String(n);
}

var DAY_MS = 86400000;

/* The only place the program uses the Date built-in: reading the
   computer's clock and its time zone. Every other date sum below is our
   own day-number arithmetic.             Time O(1)  · Space O(1) */
function readClock() {
    var now = new Date();
    return { ms: now.getTime(), zoneMs: -now.getTimezoneOffset() * 60000 };
}

var CLOCK_ZONE_MS = readClock().zoneMs;   // the shop's time zone, read once (Manila: +8 h)

/* Whole-number division that rounds down, also for negatives.
                                          Time O(1)  · Space O(1) */
function floorDiv(a, b) {
    return Math.floor(a / b);
}

/* Days since 1 January 1970 for a calendar date — the "days from civil"
   method: count March-based years in 400-year eras, so leap days fall at
   the end of each year.                  Time O(1)  · Space O(1) */
function dayNumber(year, month, day) {
    var y = month <= 2 ? year - 1 : year;
    var era = floorDiv(y, 400);
    var yearOfEra = y - era * 400;                                       // 0 … 399
    var shifted = month > 2 ? month - 3 : month + 9;                     // March = 0
    var dayOfYear = floorDiv(153 * shifted + 2, 5) + day - 1;            // 0 … 365
    var dayOfEra = yearOfEra * 365 + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100) + dayOfYear;
    return era * 146097 + dayOfEra - 719468;
}

/* The reverse: a day number back to { year, month, day }.
                                          Time O(1)  · Space O(1) */
function dateOfDayNumber(days) {
    var z = days + 719468;
    var era = floorDiv(z, 146097);
    var dayOfEra = z - era * 146097;
    var yearOfEra = floorDiv(dayOfEra - floorDiv(dayOfEra, 1460) + floorDiv(dayOfEra, 36524) - floorDiv(dayOfEra, 146096), 365);
    var dayOfYear = dayOfEra - (365 * yearOfEra + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100));
    var shifted = floorDiv(5 * dayOfYear + 2, 153);
    var day = dayOfYear - floorDiv(153 * shifted + 2, 5) + 1;
    var month = shifted < 10 ? shifted + 3 : shifted - 9;
    var year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
    return { year: year, month: month, day: day };
}

/*                                        Time O(1)  · Space O(1) */
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/* 28 to 31.                              Time O(1)  · Space O(1) */
function monthLength(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/* (2026, 10, 5) -> "2026-10-05".         Time O(1)  · Space O(1) */
function isoOf(year, month, day) {
    return year + '-' + twoDigits(month) + '-' + twoDigits(day);
}

/* Read digits from text[start..end) as a number. Time O(n) · Space O(1) */
function readNumber(text, start, end) {
    var value = 0;
    for (var i = start; i < end; i++) {
        var c = text.charAt(i);
        if (!isDigit(c)) return NaN;
        value = value * 10 + (c.charCodeAt(0) - 48);
    }
    return value;
}

/* "YYYY-MM-DD" to { year, month, day }, or null when it is not a real
   date (month 13, 31 April, 29 February in a common year).
                                          Time O(1)  · Space O(1) */
function dateFromIso(iso) {
    var s = String(iso);
    if (s.length !== 10 || s.charAt(4) !== '-' || s.charAt(7) !== '-') return null;
    var y = readNumber(s, 0, 4), m = readNumber(s, 5, 7), d = readNumber(s, 8, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > monthLength(y, m)) return null;
    return { year: y, month: m, day: d };
}

/* A day number to "YYYY-MM-DD".          Time O(1)  · Space O(1) */
function isoFromDayNumber(days) {
    var d = dateOfDayNumber(days);
    return isoOf(d.year, d.month, d.day);
}

/* The calendar day a millisecond stamp falls on, in the shop's time zone.
                                          Time O(1)  · Space O(1) */
function dayNumberOfStamp(stamp) {
    return floorDiv(stamp + CLOCK_ZONE_MS, DAY_MS);
}

/* Midnight (shop time) of a day number, as a millisecond stamp.
                                          Time O(1)  · Space O(1) */
function stampOfDayNumber(days) {
    return days * DAY_MS - CLOCK_ZONE_MS;
}

/* The calendar day a stamp falls on.     Time O(1)  · Space O(1) */
function isoFromStamp(stamp) {
    return isoFromDayNumber(dayNumberOfStamp(stamp));
}

/* Today as "YYYY-MM-DD".                 Time O(1)  · Space O(1) */
function todayIso() {
    return isoFromStamp(readClock().ms);
}

/* Move a date by whole days.             Time O(1)  · Space O(1) */
function addDays(iso, days) {
    var d = dateFromIso(iso);
    return d ? isoFromDayNumber(dayNumber(d.year, d.month, d.day) + days) : iso;
}

/* 0 = Sunday … 6 = Saturday. Day 0 (1 January 1970) was a Thursday.
                                          Time O(1)  · Space O(1) */
function weekdayOf(iso) {
    var d = dateFromIso(iso);
    if (!d) return -1;
    var w = (dayNumber(d.year, d.month, d.day) + 4) % 7;
    return w < 0 ? w + 7 : w;
}

/* "Monday, 6 October 2025".              Time O(1)  · Space O(1) */
function formatDateLong(iso) {
    var d = dateFromIso(iso);
    if (!d) return String(iso);
    return WEEKDAY_NAMES[weekdayOf(iso)] + ', ' + d.day + ' ' + MONTH_NAMES[d.month - 1] + ' ' + d.year;
}

/* "6 Oct 2025".                          Time O(1)  · Space O(1) */
function formatDateShort(iso) {
    var d = dateFromIso(iso);
    if (!d) return String(iso);
    return d.day + ' ' + MONTH_SHORT[d.month - 1] + ' ' + d.year;
}

/* A millisecond stamp to "6 Oct 2025, 2:14 PM", in the shop's time zone.
                                          Time O(1)  · Space O(1) */
function formatStamp(stamp) {
    var days = dayNumberOfStamp(stamp), d = dateOfDayNumber(days);
    var minutes = floorDiv(stamp + CLOCK_ZONE_MS - days * DAY_MS, 60000);
    var hours = floorDiv(minutes, 60), suffix = hours >= 12 ? 'PM' : 'AM';
    var h12 = hours % 12 === 0 ? 12 : hours % 12;
    return d.day + ' ' + MONTH_SHORT[d.month - 1] + ' ' + d.year + ', ' + h12 + ':' + twoDigits(minutes % 60) + ' ' + suffix;
}

/* =========================================================================
   HTML
   ========================================================================= */

/* Escape text for safe use inside markup. Customer names and notes reach
   the page through innerHTML, so every dynamic string passes through here.
                                          Time O(n)  · Space O(n) */
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

/* =========================================================================
   HASHING
   ========================================================================= */

/* 32-bit FNV-1a. Used for the hash table's bucket index and to compare the
   order-desk passcode without keeping it in the page as plain text.
                                          Time O(n)  · Space O(1) */
function fnv1a(text) {
    var s = String(text), hash = 2166136261;
    for (var i = 0; i < s.length; i++) {
        hash = hash ^ s.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}
