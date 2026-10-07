/* =========================================================================
   DSA · RECURSION
   Sum ng listahan: unang item + sum ng natitira. Base case: walang laman.
   ========================================================================= */

// Recursion: unang item + sum ng natitira. Base case yung
// walang laman. Gamit sa add-ons at sa total ng quotation.
// Time O(n) · Space O(n) call stack
function sumRecursive(items, valueOf, index) {
    var at = index === undefined ? 0 : index;
    if (at >= items.length) return 0;
    return (Number(valueOf(items[at])) || 0) + sumRecursive(items, valueOf, at + 1);
}
