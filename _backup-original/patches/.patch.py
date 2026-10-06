import io

p = 'js/algorithms.js'
s = io.open(p, encoding='utf-8').read()


def sub(old, new):
    global s
    assert old in s, 'NOT FOUND:\n' + old[:150]
    s = s.replace(old, new, 1)


BASICS = '''   These are the operations the catalogue runs on. As with structures.js they
   are written out longhand rather than delegated to Array.prototype, because
   how they behave (stability, complexity, collision handling) is the thing
   being demonstrated.

   The ARRAY BASICS block below replaces the built-ins the rest of the site
   would otherwise reach for - includes, indexOf, filter, find, slice,
   concat, map, join. They are written once here so no other file has to
   call a method that does the work for it.
   ========================================================================= */

window.Algorithms = (function () {
    'use strict';

    /* =====================================================================
       ARRAY BASICS - manual stand-ins for the built-ins we do not use
       ===================================================================== */

    /* array.slice() */
    function copy(array) {
        var out = [];
        for (var i = 0; i < array.length; i++) out[i] = array[i];
        return out;
    }

    /* array.slice(start, end) */
    function copyRange(array, start, end) {
        var stop = end == null ? array.length : end;
        var out = [], n = 0;
        for (var i = start; i < stop && i < array.length; i++) out[n++] = array[i];
        return out;
    }

    /* array.indexOf(value) */
    function positionOf(array, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === value) return i;
        }
        return -1;
    }

    /* array.includes(value) */
    function contains(array, value) {
        return positionOf(array, value) !== -1;
    }

    /* array.filter(predicate) */
    function where(array, predicate) {
        var out = [], n = 0;
        for (var i = 0; i < array.length; i++) {
            if (predicate(array[i], i)) out[n++] = array[i];
        }
        return out;
    }

    /* array.find(predicate) */
    function firstWhere(array, predicate) {
        for (var i = 0; i < array.length; i++) {
            if (predicate(array[i], i)) return array[i];
        }
        return null;
    }

    /* array.filter(...).length, without building the intermediate array */
    function countWhere(array, predicate) {
        var total = 0;
        for (var i = 0; i < array.length; i++) {
            if (predicate(array[i], i)) total++;
        }
        return total;
    }

    /* a.concat(b) */
    function join2(a, b) {
        var out = [], n = 0, i;
        for (i = 0; i < a.length; i++) out[n++] = a[i];
        for (i = 0; i < b.length; i++) out[n++] = b[i];
        return out;
    }

    /* array.concat([value]) */
    function append(array, value) {
        var out = copy(array);
        out[out.length] = value;
        return out;
    }

    /* Remove the first occurrence, returning a new array. */
    function without(array, value) {
        var out = [], n = 0, removed = false;
        for (var i = 0; i < array.length; i++) {
            if (!removed && array[i] === value) { removed = true; continue; }
            out[n++] = array[i];
        }
        return out;
    }

    /* array.map(transform) */
    function collect(array, transform) {
        var out = [];
        for (var i = 0; i < array.length; i++) out[i] = transform(array[i], i);
        return out;
    }

    /* array.map(transform).join(separator), used to build markup */
    function collectText(array, transform, separator) {
        var text = '', gap = separator || '';
        for (var i = 0; i < array.length; i++) {
            if (i > 0) text += gap;
            text += transform(array[i], i);
        }
        return text;
    }

    /* array.join(separator) */
    function joinText(array, separator) {
        var text = '', gap = separator || '';
        for (var i = 0; i < array.length; i++) {
            if (i > 0) text += gap;
            text += array[i];
        }
        return text;
    }

    /* string.indexOf(needle) !== -1, as a character-by-character scan.
       The catalogue search runs on this, so it is spelled out rather than
       handed to the built-in. */
    function containsText(haystack, needle) {
        var text = String(haystack), find = String(needle);
        if (find.length === 0) return true;
        if (find.length > text.length) return false;

        for (var start = 0; start <= text.length - find.length; start++) {
            var matched = true;
            for (var offset = 0; offset < find.length; offset++) {
                if (text.charAt(start + offset) !== find.charAt(offset)) { matched = false; break; }
            }
            if (matched) return true;
        }
        return false;
    }
'''

sub('''   These are the operations the catalogue runs on. As with structures.js they
   are written out longhand rather than delegated to Array.prototype, because
   how they behave (stability, complexity, collision handling) is the thing
   being demonstrated.
   ========================================================================= */

window.Algorithms = (function () {
    'use strict';
''', BASICS)

sub('''                if (keys.indexOf(bucket[j].key) === -1) keys[keys.length] = bucket[j].key;''',
    '''                if (!contains(keys, bucket[j].key)) keys[keys.length] = bucket[j].key;''')

sub('''        if (array.length <= 1) return array.slice();''',
    '''        if (array.length <= 1) return copy(array);''')

sub('''        var work = records.slice();''',
    '''        var work = copy(records);''')

sub('''        if (!needle) return records.slice();''',
    '''        if (!needle) return copy(records);''')

sub('''            var haystack = (r.name + ' ' + (r.style || '') + ' ' + r.category + ' ' +
                            r.occasion + ' ' + (r.blurb || '')).toLowerCase();
            if (haystack.indexOf(needle) !== -1) out[count++] = r;''',
    '''            var haystack = (r.name + ' ' + (r.line || '') + ' ' + (r.category || '') + ' ' +
                            r.occasion + ' ' + (r.blurb || '')).toLowerCase();
            if (containsText(haystack, needle)) out[count++] = r;''')

MIDDOT = chr(0x00B7)
sub("        return parts.join('  " + MIDDOT + "  ');",
    "        return joinText(parts, '  " + MIDDOT + "  ');")

sub('''    return {
        HashTable: HashTable,''',
    '''    return {
        copy: copy,
        copyRange: copyRange,
        positionOf: positionOf,
        contains: contains,
        where: where,
        firstWhere: firstWhere,
        countWhere: countWhere,
        join2: join2,
        append: append,
        without: without,
        collect: collect,
        collectText: collectText,
        joinText: joinText,
        containsText: containsText,

        HashTable: HashTable,''')

io.open(p, 'w', encoding='utf-8').write(s)
print('algorithms.js rewritten')
