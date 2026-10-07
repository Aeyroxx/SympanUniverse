/* =========================================================================
   DSA · SORTING
   Insertion sort (stable, O(n) kung halos naka-ayos na, O(n²) worst) at
   selection sort (pang-best sellers). Walang merge sort kasi hindi pasok
   ang complexity niya sa apat na notation na pinapayagan ng class.
   ========================================================================= */

// Paghahambing ng text na hindi pinapansin ang laki ng letra.
// Negative kung mauuna si a.
// Time O(n) · Space O(n)
function compareText(a, b) {
    var x = toLower(a), y = toLower(b);
    var shorter = x.length < y.length ? x.length : y.length;
    for (var i = 0; i < shorter; i++) {
        var diff = x.charCodeAt(i) - y.charCodeAt(i);
        if (diff !== 0) return diff;
    }
    return x.length - y.length;
}

// Insertion sort. Bagong array ang binabalik, hindi ginagalaw ang
// input. "> 0" kaya stable: yung magkapareho, ganun pa rin ang ayos.
// Time O(n²) worst, O(n) best · Space O(n) copy
function insertionSort(list, compare) {
    var work = copyArray(list);
    for (var i = 1; i < work.length; i++) {
        var held = work[i], j = i - 1;
        while (j >= 0 && compare(work[j], held) > 0) {
            work[j + 1] = work[j];
            j--;
        }
        work[j + 1] = held;
    }
    return work;
}

// Selection sort para sa best sellers, pinakamarami muna.
// Hinahanap yung pinakamalaki sa natitira tapos iniuusog sa unahan.
// Time O(n²) · Space O(n)
function selectionSortDesc(records, countOf) {
    var work = copyArray(records);
    for (var i = 0; i < work.length - 1; i++) {
        var best = i;
        for (var j = i + 1; j < work.length; j++) {
            // Mas malaki lang talaga, para tabla = dating ayos.
            if (countOf(work[j]) > countOf(work[best])) best = j;
        }
        if (best !== i) {
            var held = work[best];
            // Usog imbes na palit, para stable pa rin.
            for (var k = best; k > i; k--) work[k] = work[k - 1];
            work[i] = held;
        }
    }
    return work;
}
