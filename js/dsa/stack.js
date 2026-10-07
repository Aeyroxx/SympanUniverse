/* =========================================================================
   DSA · STACK  ->  undo ng "Mark ready"
   Last in, first out. Bawat release, push; pag undo, pop. O(1) pareho.
   ========================================================================= */

// Bagong stack.
// Time O(1) · Space O(1)
function stackCreate() {
    return { items: [], top: NIL };
}

// Patong sa ibabaw.
// Time O(1) · Space O(1)
function stackPush(stack, value) {
    stack.top++;
    stack.items[stack.top] = value;
    return stack.top + 1;
}

// Kinukuha yung nasa ibabaw, null kung wala.
// Time O(1) · Space O(1)
function stackPop(stack) {
    if (stack.top === NIL) return null;
    var value = stack.items[stack.top];
    stack.items.length = stack.top;
    stack.top--;
    return value;
}

// Silip sa ibabaw.
// Time O(1) · Space O(1)
function stackPeek(stack) {
    return stack.top === NIL ? null : stack.items[stack.top];
}

// Lahat ng laman, yung nasa ibabaw ang una.
// Time O(n) · Space O(n)
function stackValues(stack) {
    var out = [];
    for (var i = stack.top; i >= 0; i--) out[out.length] = stack.items[i];
    return out;
}

// Ilan ang laman.
// Time O(1) · Space O(1)
function stackSize(stack) {
    return stack.top + 1;
}
