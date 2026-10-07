/* =========================================================================
   DSA · NUMBERS AT PERA
   Pag-convert ng tinype na number at pag-format ng piso (₱1,234.50)
   na gawa namin, kapalit ng toLocaleString.
   ========================================================================= */

// Number galing sa tinype ng user, NaN kung hindi number.
// Time O(n) · Space O(n)
function toNumber(text) {
    var s = strip(text);
    if (s.length === 0) return NaN;
    return Number(s);
}

// Ni-round sa buong sentimo.
// Time O(1) · Space O(1)
function roundMoney(amount) {
    return Math.round(Number(amount) * 100) / 100;
}

// "1234567" -> "1,234,567".
// Time O(n) · Space O(n)
function groupThousands(digits) {
    var out = '', count = 0;
    for (var i = digits.length - 1; i >= 0; i--) {
        out = digits.charAt(i) + out;
        count++;
        if (count % 3 === 0 && i > 0) out = ',' + out;
    }
    return out;
}

// ₱1,234.50 na format (gawa namin, walang toLocaleString).
// Time O(n) · Space O(n)
function peso(amount) {
    var cents = Math.round(Math.abs(Number(amount) || 0) * 100);
    var whole = Math.floor(cents / 100), frac = cents % 100;
    var sign = Number(amount) < 0 ? '−' : '';
    return sign + '₱' + groupThousands(String(whole)) + '.' + leftPad(frac, 2, '0');
}

// ₱1,235 na walang sentimo, pang-maikling label.
// Time O(n) · Space O(n)
function pesoWhole(amount) {
    var whole = Math.round(Math.abs(Number(amount) || 0));
    var sign = Number(amount) < 0 ? '−' : '';
    return sign + '₱' + groupThousands(String(whole));
}

// "1 flower" o "3 flowers".
// Time O(1) · Space O(1)
function plural(count, one, many) {
    return count === 1 ? one : (many === undefined ? one + 's' : many);
}

// 7 -> "07".
// Time O(1) · Space O(1)
function twoDigits(n) {
    return n < 10 ? '0' + n : String(n);
}
