/* =========================================================================
   DSA · HASHING
   FNV-1a: ginagawang number ang text. Ito ang gamit ng hash table para
   malaman ang bucket, at ng desk para hindi naka-plain text ang password.
   ========================================================================= */

// 32-bit FNV-1a hash. Gamit sa bucket ng hash table at sa pag-hash
// ng password at code para hindi naka-plain text.
// Time O(n) · Space O(1)
function fnv1a(text) {
    var s = String(text), hash = 2166136261;
    for (var i = 0; i < s.length; i++) {
        hash = hash ^ s.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}
