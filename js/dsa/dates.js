/* =========================================================================
   DSA · DATES
   Sa DSA guide, pang-basa lang ng orasan ang Date. Kaya dito: isang beses
   lang ginagamit ang new Date (readClock), tapos lahat ng iba (add days,
   weekday, leap year, haba ng buwan) ay sarili naming day-number math.
   Ang date ay "YYYY-MM-DD" na text at ang oras ay millisecond stamp.
   ========================================================================= */

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                   'August', 'September', 'October', 'November', 'December'];

var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var DAY_MS = 86400000;

// Ito lang yung lugar na gumagamit ng Date: binabasa yung orasan
// at time zone ng computer. Lahat ng date math sa baba, sarili namin.
// Time O(1) · Space O(1)
function readClock() {
    var now = new Date();
    return { ms: now.getTime(), zoneMs: -now.getTimezoneOffset() * 60000 };
}

var CLOCK_ZONE_MS = readClock().zoneMs;   // time zone ng computer, isang beses lang binabasa (sa Manila: +8 h)

// Division na pababa yung round, kahit negative.
// Time O(1) · Space O(1)
function floorDiv(a, b) {
    return Math.floor(a / b);
}

// Ilang araw na mula 1 January 1970 para sa isang date.
// "Days from civil" na paraan, kaya tama pati leap year.
// Time O(1) · Space O(1)
function dayNumber(year, month, day) {
    var y = month <= 2 ? year - 1 : year;
    var era = floorDiv(y, 400);
    var yearOfEra = y - era * 400;                                       // 0 hanggang 399
    var shifted = month > 2 ? month - 3 : month + 9;                     // March = 0
    var dayOfYear = floorDiv(153 * shifted + 2, 5) + day - 1;            // 0 hanggang 365
    var dayOfEra = yearOfEra * 365 + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100) + dayOfYear;
    return era * 146097 + dayOfEra - 719468;
}

// Baliktad naman: day number pabalik sa { year, month, day }.
// Time O(1) · Space O(1)
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

// Leap year ba?
// Time O(1) · Space O(1)
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Ilang araw ang buwan (28 hanggang 31).
// Time O(1) · Space O(1)
function monthLength(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

// (2026, 10, 5) -> "2026-10-05".
// Time O(1) · Space O(1)
function isoOf(year, month, day) {
    return year + '-' + twoDigits(month) + '-' + twoDigits(day);
}

// Binabasa yung digits sa text[start..end) bilang number.
// Time O(n) · Space O(1)
function readNumber(text, start, end) {
    var value = 0;
    for (var i = start; i < end; i++) {
        var c = text.charAt(i);
        if (!isDigit(c)) return NaN;
        value = value * 10 + (c.charCodeAt(0) - 48);
    }
    return value;
}

// "YYYY-MM-DD" papuntang { year, month, day }, null kung hindi
// totoong date (month 13, April 31, Feb 29 na hindi leap year).
// Time O(1) · Space O(1)
function dateFromIso(iso) {
    var s = String(iso);
    if (s.length !== 10 || s.charAt(4) !== '-' || s.charAt(7) !== '-') return null;
    var y = readNumber(s, 0, 4), m = readNumber(s, 5, 7), d = readNumber(s, 8, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > monthLength(y, m)) return null;
    return { year: y, month: m, day: d };
}

// Day number papuntang "YYYY-MM-DD".
// Time O(1) · Space O(1)
function isoFromDayNumber(days) {
    var d = dateOfDayNumber(days);
    return isoOf(d.year, d.month, d.day);
}

// Anong araw yung millisecond stamp, sa oras ng shop.
// Time O(1) · Space O(1)
function dayNumberOfStamp(stamp) {
    return floorDiv(stamp + CLOCK_ZONE_MS, DAY_MS);
}

// Hatinggabi (oras ng shop) ng isang day number, bilang stamp.
// Time O(1) · Space O(1)
function stampOfDayNumber(days) {
    return days * DAY_MS - CLOCK_ZONE_MS;
}

// Anong date yung stamp.
// Time O(1) · Space O(1)
function isoFromStamp(stamp) {
    return isoFromDayNumber(dayNumberOfStamp(stamp));
}

// Date ngayon, "YYYY-MM-DD".
// Time O(1) · Space O(1)
function todayIso() {
    return isoFromStamp(readClock().ms);
}

// Inuusog yung date ng ilang araw.
// Time O(1) · Space O(1)
function addDays(iso, days) {
    var d = dateFromIso(iso);
    return d ? isoFromDayNumber(dayNumber(d.year, d.month, d.day) + days) : iso;
}

// 0 = Linggo hanggang 6 = Sabado. Huwebes yung 1 January 1970.
// Time O(1) · Space O(1)
function weekdayOf(iso) {
    var d = dateFromIso(iso);
    if (!d) return -1;
    var w = (dayNumber(d.year, d.month, d.day) + 4) % 7;
    return w < 0 ? w + 7 : w;
}

// "Monday, 6 October 2025".
// Time O(1) · Space O(1)
function formatDateLong(iso) {
    var d = dateFromIso(iso);
    if (!d) return String(iso);
    return WEEKDAY_NAMES[weekdayOf(iso)] + ', ' + d.day + ' ' + MONTH_NAMES[d.month - 1] + ' ' + d.year;
}

// "6 Oct 2025".
// Time O(1) · Space O(1)
function formatDateShort(iso) {
    var d = dateFromIso(iso);
    if (!d) return String(iso);
    return d.day + ' ' + MONTH_SHORT[d.month - 1] + ' ' + d.year;
}

// Stamp papuntang "6 Oct 2025, 2:14 PM", sa oras ng shop.
// Time O(1) · Space O(1)
function formatStamp(stamp) {
    var days = dayNumberOfStamp(stamp), d = dateOfDayNumber(days);
    var minutes = floorDiv(stamp + CLOCK_ZONE_MS - days * DAY_MS, 60000);
    var hours = floorDiv(minutes, 60), suffix = hours >= 12 ? 'PM' : 'AM';
    var h12 = hours % 12 === 0 ? 12 : hours % 12;
    return d.day + ' ' + MONTH_SHORT[d.month - 1] + ' ' + d.year + ', ' + h12 + ':' + twoDigits(minutes % 60) + ' ' + suffix;
}
