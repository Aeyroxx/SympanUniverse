/* =========================================================================
   MODULE 2 · CATEGORY NAVIGATION
   Ang tatlong branch at sampung line ng shop ay nasa n-ary tree
   (categoryTree sa state.js). "Lahat ng nasa ilalim ng branch" = lahat
   ng leaf sa ilalim ng node, depth-first walk gamit ang stack.
   ========================================================================= */

// Saang branch nakalagay yung line ng product.
// Time O(n) lakad sa tree · Space O(n)
function productBranch(product) {
    var at = treeFind(categoryTree, product.line);
    var node = treeNode(categoryTree, at);
    return node ? treeNode(categoryTree, node.parent) : null;
}

// Mga product sa ilalim ng branch o line ng category tree
// (lahat kung walang napili).
// Time O(n²) · Space O(n)
function productsUnder(slug) {
    var leaves = slug ? treeLeaves(categoryTree, treeFind(categoryTree, slug)) : null;
    return keepWhere(activeProducts(), function (p) { return leaves === null || isIn(leaves, p.line); });
}
