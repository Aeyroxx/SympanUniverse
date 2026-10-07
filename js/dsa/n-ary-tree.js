/* =========================================================================
   DSA · N-ARY TREE  ->  mga category ng shop
   Root, tatlong branch, sampung line. Kahit ilan ang anak ng node.
   Depth-first search gamit ang sarili naming stack, hindi recursion.
   ========================================================================= */

// Bagong tree na may root.
// Time O(1) · Space O(1)
function treeCreate(rootLabel) {
    var tree = { nodes: [], root: NIL };
    tree.root = treeAdd(tree, rootLabel, 'root', NIL);
    return tree;
}

// Nilalagay yung node sa ilalim ng parent.
// Time O(1) · Space O(1)
function treeAdd(tree, label, slug, parentIndex) {
    var index = tree.nodes.length;
    tree.nodes[index] = {
        label: label,
        slug: slug,
        parent: parentIndex,
        children: [],
        depth: parentIndex === NIL ? 0 : tree.nodes[parentIndex].depth + 1
    };
    if (parentIndex !== NIL) listAdd(tree.nodes[parentIndex].children, index);
    return index;
}

// Depth-first search ng slug gamit yung sarili naming stack.
// Time O(n) · Space O(n)
function treeFind(tree, slug) {
    var stack = stackCreate();
    stackPush(stack, tree.root);
    while (stack.top !== NIL) {
        var at = stackPop(stack), node = tree.nodes[at];
        if (node.slug === slug) return at;
        for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);
    }
    return NIL;
}

// Yung node sa index.
// Time O(1) · Space O(1)
function treeNode(tree, index) {
    return index === NIL ? null : tree.nodes[index];
}

// Mga anak ng node.
// Time O(n) · Space O(n)
function treeChildren(tree, index) {
    return index === NIL ? [] : copyArray(tree.nodes[index].children);
}

// Leaf ba (walang anak)?
// Time O(1) · Space O(1)
function treeIsLeaf(tree, index) {
    return index !== NIL && tree.nodes[index].children.length === 0;
}

// Lahat ng leaf sa ilalim ng node. Ito yung ginagamit ng filter.
// Time O(n) · Space O(n)
function treeLeaves(tree, index) {
    var out = [];
    if (index === NIL) return out;
    var stack = stackCreate();
    stackPush(stack, index);
    while (stack.top !== NIL) {
        var at = stackPop(stack), node = tree.nodes[at];
        if (node.children.length === 0) listAdd(out, node.slug);
        else for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);
    }
    return out;
}

// Mga label mula root pababa sa node.
// Time O(n) · Space O(n)
function treePath(tree, index) {
    var upward = [], at = index;
    while (at !== NIL) {
        listAdd(upward, tree.nodes[at].label);
        at = tree.nodes[at].parent;
    }
    return backwards(upward);
}

// Ginagawa yung tree galing sa [{ label, slug, children }].
// Time O(n) · Space O(n)
function treeFromOutline(rootLabel, branches) {
    var tree = treeCreate(rootLabel);
    for (var i = 0; i < branches.length; i++) {
        var parent = treeAdd(tree, branches[i].label, branches[i].slug, tree.root);
        var kids = branches[i].children || [];
        for (var j = 0; j < kids.length; j++) treeAdd(tree, kids[j].label, kids[j].slug, parent);
    }
    return tree;
}
