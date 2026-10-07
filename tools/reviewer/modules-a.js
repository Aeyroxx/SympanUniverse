/* =========================================================================
   REVIEWER CONTENT · MODULES 1–7 — the shop window, choosing a gift, checkout and payment, in words.
   Part of content.js (which explains the rules for this text); split in two
   so no file grows past 800 lines. A walkthrough step quotes a short piece
   of a line ("at"); build.js finds that line and fails if it has gone.
   ========================================================================= */

module.exports = [

/* ===================================================================== */
{
    id: 'm01', no: 1, part: 1, title: 'Catalogue & Best Sellers', structure: 'Hash table · Selection sort',
    screens: 'Home page — the "Best sellers" strip and every product card; the Overview’s best sellers (order desk)',
    files: 'js/backend/m01-catalogue-best-sellers.js (salesTally, salesRank, topSellers) · js/dsa/sorting.js (selectionSortDesc) · js/frontend/shop/catalog.js',
    data: 'orders — array sorted by order number; products — 10 records; a hash table product id → tally row',
    summary: ['Hash-table tally · selection sort (stable)', 'O(n²)', 'O(n)'],
    business: [
        'The shop needs a front window: every bouquet and cake the customer can order, with its photo, its price label and how many have sold. Customers trust what other customers buy, so the products that sell the most are lifted into a "Best sellers" strip at the top.',
        'The owner used to decide by hand what to call a best seller. Now the ranking is worked out from the real paid orders: buy ten roses and the rose moves up at once. Cancelled (voided) orders and requests that were never paid do not count.'
    ],
    inputs: [
        ['Stored: orders', 'Every order record — its status (only paid and completed orders count) and its lines, each with a product id and a quantity.'],
        ['Stored: products', 'The catalogue — name, price list, photos, and whether the product is active.'],
        ['Customer picks', 'Nothing is typed: the strip is built when the page opens and after every sale.']
    ],
    steps: [
        'Tally: make one row per product and put each row in a hash table keyed by product id. Then walk every paid or completed order once; each of its lines finds its product’s row with one hash look-up and adds its pieces (units). An order is counted once per product.',
        'Give each product a rank key: units × 100000 + orders, so pieces sold decide first and the number of orders only breaks a tie.',
        'Selection sort, descending: for position 0, scan the rest of the list for the largest key and move it to the front; repeat for position 1, 2, …',
        'Keep the first three that are active and have sold at least one piece; draw them as cards with a "Best seller" badge.'
    ],
    ipo: {
        input: ['orders[] (status, lines, quantity)', 'products[]'],
        process: ['salesTally() — hash table, one pass over the orders', 'salesRank() — one number per product', 'selectionSortDesc() — O(n²) ranking', 'topSellers(3)'],
        output: ['Top 3 rows { product, units, orders }', 'Best-seller cards and badges', '"N sold" on every card']
    },
    outputs: [
        'The "Best sellers" strip on the home page (three cards).',
        'A "Best seller" badge on those products in the catalogue and on the product sheet.',
        'The "N sold" count on every card, and the "Best selling" order of the catalogue sort.',
        'The Best sellers panel in the order desk Overview (top five, for the chosen day, month or year).'
    ],
    nMeaning: 'For the sort, n = number of products (10). For the tally, n = the order lines it reads — every line of every paid order.',
    justification: [
        'Selection sort: the list being ranked is tiny — ten products — so its O(n²) costs at most 45 comparisons. It is the clearest sort to explain and trace: each pass picks "the biggest one left". It is written to be stable (it shifts instead of swapping), so two products with the same sales keep their catalogue order instead of trading places on every refresh.',
        'Hash table for the tally: counting product by product meant reading every order once per product. A row per product, found by its id in O(1) on average, lets one pass over the orders do the whole count.',
        'A hand-kept "best seller" flag would go stale. Counting from the paid orders means it is always right, and a voided order drops out by itself.'
    ],
    demo: [
        'Open index.html. Point at the "Best sellers" strip and the "N sold" labels.',
        'Add 10 Plumeria bouquets to the cart and check out (pay in full, any 13-digit reference such as 1234567890123).',
        'Scroll back up: Plumeria has jumped into first place, because 10 pieces beat the rose’s 7.',
        'In the order desk, void that order: Plumeria drops back. Cancelled orders do not count.'
    ],
    shots: [['m01-best', 'The best-seller strip, ranked from paid orders'], ['m01-card', 'A product card with its "sold" count']],
    trace: 'bestSellers', traceTitle: 'the best-seller ranking',
    walk: [
        { file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'salesTally', about: 'Counts, for every product, how many pieces were sold and in how many orders.', steps: [
            { at: 'var out = [], rowFor = hashCreate(31);', text: 'A list of rows, and a hash table to find a row by product id.' },
            { at: "hashPut(rowFor, String(products[p].id), row);", text: 'Make one row per product and index it by the product id.' },
            { at: 'if (!countsAsSale(orders[o]) || (include && !include(orders[o]))) continue;', text: 'Skip orders that are not paid or completed — voided and unpaid ones never count.' },
            { at: 'var hit = hashGet(rowFor, String(items[i].productId));', text: 'Each line finds its product’s row with one hash look-up.' },
            { at: 'hit.units += items[i].quantity;', text: 'Add the line’s pieces to that product.' },
            { at: 'if (hit.lastOrder !== o) { hit.orders++; hit.lastOrder = o; }', text: 'Count the order once per product, however many lines it has.' }
        ] },
        { file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'salesRank', about: 'Turns a row into one number so the sort can compare rows.', steps: [
            { at: 'return row.units * 100000 + row.orders;', text: 'Units dominate; the order count only matters when units tie.' }
        ] },
        { file: 'js/dsa/sorting.js', fn: 'selectionSortDesc', about: 'The selection sort itself — largest key first, and stable.', steps: [
            { at: 'var work = copyArray(records);', text: 'Sort a copy, so the original tally is untouched.' },
            { at: 'for (var i = 0; i < work.length - 1; i++)', text: 'Pass i fills position i.' },
            { at: 'if (countOf(work[j]) > countOf(work[best])) best = j;', text: 'Scan everything after i for the largest key. Strictly greater keeps ties in their old order.' },
            { at: 'for (var k = best; k > i; k--) work[k] = work[k - 1];', text: 'Shift the items between i and best one place right…' },
            { at: 'work[i] = held;', text: '…and drop the largest into position i. Shifting (not swapping) is what makes it stable.' }
        ] },
        { file: 'js/backend/m01-catalogue-best-sellers.js', fn: 'topSellers', about: 'Ranks a tally and keeps the first k that are active and have sold.', steps: [
            { at: 'var ranked = selectionSortDesc(tally, salesRank);', text: 'Sort the rows by the rank key.' },
            { at: 'if (ranked[i].units > 0 && ranked[i].product.active)', text: 'Leave out disabled products and products nobody has bought.' }
        ] },
        { file: 'js/frontend/shop/catalog.js', fn: 'renderBestSellers', about: 'Draws the strip.', steps: [
            { at: 'var top = bestSellers(3)', text: 'Ask for the top three.' },
            { at: 'grid.innerHTML = renderEach(rows', text: 'Render each one as a product card with the badge.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm02', no: 2, part: 1, title: 'Category Navigation', structure: 'N-ary tree · Stack',
    screens: 'Catalogue — the branch chips (All, Flower Bouquets, Other Bouquets, Gift Cakes) and their line chips',
    files: 'js/dsa/n-ary-tree.js (treeAdd, treeFromOutline, treeFind, treeLeaves) · js/dsa/stack.js (stackPush, stackPop) · js/data/catalog.js (CATEGORY_OUTLINE) · js/frontend/shop/catalog.js',
    data: 'categoryTree — 14 nodes in one array { label, slug, parent, children, depth }; CATEGORY_OUTLINE',
    summary: ['N-ary tree · depth-first search with a stack', 'O(n)', 'O(n)'],
    business: [
        'The shop’s own order sheet groups everything in three columns: Flower Bouquets, Other Bouquets and Gift Cakes, each with its own lines (Rose, Plumeria, Money, Diaper Cake…). Customers browse the same way.',
        'Picking a branch such as "Flower Bouquets" must show every line under it, and picking a line such as "Rose" must show only that line — without the page hard-coding which lines belong where.'
    ],
    inputs: [
        ['Stored: CATEGORY_OUTLINE', 'The three branches and their lines, from the order sheet (js/data/catalog.js).'],
        ['Customer picks', 'A branch chip (e.g. "Gift Cakes"), then optionally a line chip (e.g. "Diaper Cake").'],
        ['Stored: products', 'Each product’s line (its leaf in the tree).']
    ],
    steps: [
        'Build the tree once: a root, three branch nodes, ten leaf nodes. Each node stores its parent’s index and its children’s indices in one array.',
        'When a chip is pressed, find that node by its slug with a depth-first search that uses our stack.',
        'Collect every leaf under it, again depth-first with a stack.',
        'Show only the products whose line is one of those leaves.'
    ],
    ipo: {
        input: ['CATEGORY_OUTLINE', 'chosen slug (branch or line)'],
        process: ['treeFromOutline() — build nodes[]', 'treeFind(slug) — DFS with a stack', 'treeLeaves(node) — DFS for leaves'],
        output: ['list of leaf slugs', 'filtered product grid', 'branch and line chips']
    },
    outputs: [
        'The branch chips and, after a branch is picked, its line chips.',
        'The catalogue filtered to the chosen branch or line, with the "N of 10 items match" count.',
        'The branch name shown on every card ("Flower Bouquets").'
    ],
    nMeaning: 'n = number of nodes in the tree (14: the root, 3 branches, 10 lines). Each node is visited at most once.',
    justification: [
        'The categories are a hierarchy, and a tree is the structure of a hierarchy. "All lines under Flower Bouquets" becomes "all leaves under this node" — the filter needs no list of which lines belong to which branch.',
        'Adding a line (say, "Tulip") is one new leaf; nothing else changes. A flat list of strings would need the branch written on every product and special cases for "show everything under".',
        'The walks use our own stack instead of recursion, which shows the depth-first order step by step. Storing children as index arrays keeps it a plain array of records, matching the procedural, array-only rule.'
    ],
    demo: [
        'On the catalogue, press "Gift Cakes": two items, and the line chips "Diaper Cake" and "Beer-in-Can Cake" appear.',
        'Press "Flower Bouquets": four items — every leaf under that branch.',
        'Press "Rose": one item. Press "All" to clear.'
    ],
    shots: [['m02-chips', 'Branch and line chips after choosing Flower Bouquets']],
    trace: 'tree', traceTitle: 'building and searching the tree',
    walk: [
        { file: 'js/dsa/n-ary-tree.js', fn: 'treeAdd', about: 'Adds one node under a parent.', steps: [
            { at: 'var index = tree.nodes.length;', text: 'The new node’s index is the next free slot.' },
            { at: 'depth: parentIndex === NIL', text: 'Depth is the parent’s depth + 1 (the root is 0).' },
            { at: 'listAdd(tree.nodes[parentIndex].children, index)', text: 'Link it: the parent remembers its new child’s index.' }
        ] },
        { file: 'js/dsa/n-ary-tree.js', fn: 'treeFromOutline', about: 'Builds the whole tree from the order sheet outline.', steps: [
            { at: 'var tree = treeCreate(rootLabel);', text: 'Start with a root.' },
            { at: 'var parent = treeAdd(tree, branches[i].label', text: 'Add each branch under the root…' },
            { at: 'treeAdd(tree, kids[j].label, kids[j].slug, parent)', text: '…and each line under its branch.' }
        ] },
        { file: 'js/dsa/n-ary-tree.js', fn: 'treeFind', about: 'Finds a node by slug with our stack (depth-first).', steps: [
            { at: 'stackPush(stack, tree.root);', text: 'Start at the root.' },
            { at: 'var at = stackPop(stack), node = tree.nodes[at];', text: 'Take the most recently added node (last in, first out).' },
            { at: 'if (node.slug === slug) return at;', text: 'Found it — return its index.' },
            { at: 'for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);', text: 'Otherwise push its children, last first, so the first child is visited next.' }
        ] },
        { file: 'js/dsa/n-ary-tree.js', fn: 'treeLeaves', about: 'Collects every leaf under a node.', steps: [
            { at: 'if (node.children.length === 0) listAdd(out, node.slug);', text: 'A node with no children is a leaf: keep its slug.' },
            { at: 'else for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);', text: 'Otherwise descend into its children.' }
        ] },
        { file: 'js/backend/m02-category-navigation.js', fn: 'productsUnder', about: 'The tree filter (search and sort follow — module 3).', steps: [
            { at: 'var leaves = slug ? treeLeaves(categoryTree, treeFind(categoryTree, slug)) : null;', text: 'The chosen chip’s leaves, or no filter.' },
            { at: 'return keepWhere(activeProducts(), function (p) { return leaves === null || isIn(leaves, p.line); });', text: 'Keep active products whose line is one of those leaves.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm03', no: 3, part: 1, title: 'Search & Sort', structure: 'Linear search · Insertion sort',
    screens: 'Catalogue — the search box and the sort menu (Best selling, Name A–Z, Starting price, Newest)',
    files: 'js/dsa/strings.js (normaliseKey, textHas) · js/dsa/searching.js (linearSearch) · js/dsa/sorting.js (insertionSort) · js/backend/m03-search-sort.js (catalogRows, SORTS)',
    data: 'products — 10 records; SORTS — the four comparisons; each product’s searchable text',
    summary: ['Linear search + naive string matching · insertion sort', 'O(n²)', 'O(n)'],
    business: [
        'A customer who knows what they want types it: "matcha", "money", "diaper". The search has to find it in names, materials, branch names and even colour names, however it is typed ("  MATCHA ", "Matcha rose").',
        'They also want to order the results: best selling, by name, cheapest first, or newest — and the order must be steady, not shuffling equal items around.'
    ],
    inputs: [
        ['Customer types', 'Search words in the search box.'],
        ['Customer picks', 'A sort: Best selling, Name A–Z, Starting price, Newest.'],
        ['Stored: products', 'Name, line, branch, short description, materials, colours, starting price, date added.']
    ],
    steps: [
        'Normalise the query: lower-case, trim, collapse spaces, then cut it into words.',
        'Linear search: for each product, build its searchable text and keep it only if every word appears in it — naive string matching, trying the word at every position of the text.',
        'Insertion sort the matches with the chosen comparison: take each product in turn and slide the products before it that sort later one place right, until its place is found. Equal products never pass each other, so the order is stable.'
    ],
    ipo: {
        input: ['query text', 'chosen sort', 'products[]'],
        process: ['normaliseKey() + cutText()', 'linearSearch() with textHas()', 'insertionSort() with the chosen comparison'],
        output: ['matching products, in order', '"N of 10 items match"']
    },
    outputs: ['The catalogue grid, filtered and ordered.', 'The result count, and a "Clear filters" button when filtered.'],
    nMeaning: 'n = number of products searched or sorted. Inside textHas, n = the length of the text being scanned.',
    justification: [
        'Linear search is the right search here: the match is "contains these words anywhere in several fields". Binary search can only find an exact key in a sorted array, so it cannot answer a "contains" question; at n = 10 a full scan is instant.',
        'Naive string matching tries the word at every starting position and compares letter by letter — O(n²), the cost the course gives for searching text across a table. It needs no extra index and handles any word.',
        'Insertion sort is stable and simple: O(n) when the list is already in order, O(n²) at worst — 45 comparisons for 10 products. It is one of the sorts from class; merge sort would be O(n log n), a notation the course does not use, and quick sort is not stable.',
        'The same insertionSort serves every list in the system that needs ordering: completed orders, voids, the outbox, past quotations.'
    ],
    demo: ['Type "matcha" in the search box: the four flower bouquets appear, because Matcha is one of their ribbon colours.', 'Type "money": only the Money Bouquet.', 'Change the sort to "Name, A–Z": Beer-in-Can Cake comes first.'],
    shots: [['m03-search', 'Searching "matcha" finds the flowers by colour name']],
    trace: 'search', traceTitle: 'the search and the insertion sort',
    walk: [
        { file: 'js/dsa/strings.js', fn: 'normaliseKey', about: 'Puts text into one comparable form.', steps: [
            { at: 'var s = strip(toLower(text))', text: 'Lower-case and trim.' },
            { at: "if (isSpace(c) || c === '.' || c === ',')", text: 'Spaces, dots and commas all become one space…' },
            { at: 'if (!lastSpace) out += ', text: '…and runs of them collapse to a single space.' }
        ] },
        { file: 'js/dsa/strings.js', fn: 'textHas', about: 'Does the text contain the word? Naive string matching.', steps: [
            { at: 'for (var start = 0; start + find.length <= text.length; start++)', text: 'Try every starting position…' },
            { at: 'while (k < find.length && text.charAt(start + k) === find.charAt(k)) k++;', text: '…and match the characters one by one (a loop inside a loop).' },
            { at: 'if (k === find.length) return true;', text: 'All matched: found.' }
        ] },
        { file: 'js/dsa/searching.js', fn: 'linearSearch', about: 'Keeps every record whose text has every word.', steps: [
            { at: "var words = cutText(normaliseKey(query), ' ');", text: 'Normalise the query and cut it into words.' },
            { at: 'if (wanted.length === 0) return copyArray(records);', text: 'No words: everything matches.' },
            { at: 'var haystack = normaliseKey(textOf(records[i]));', text: 'Build this record’s searchable text.' },
            { at: 'if (!textHas(haystack, wanted[w])) all = false;', text: 'A missing word rules the record out.' },
            { at: 'if (all) listAdd(out, records[i]);', text: 'Keep it.' }
        ] },
        { file: 'js/dsa/sorting.js', fn: 'insertionSort', about: 'The sort used everywhere in the system.', steps: [
            { at: 'var work = copyArray(list);', text: 'Sort a copy; the input is left untouched.' },
            { at: 'for (var i = 1; i < work.length; i++)', text: 'Take each item in turn, from the second on.' },
            { at: 'while (j >= 0 && compare(work[j], held) > 0)', text: 'While the item before it sorts later — "> 0", not ">= 0", so equal items never pass each other (stable)…' },
            { at: 'work[j + 1] = work[j];', text: '…slide that item one place right.' },
            { at: 'work[j + 1] = held;', text: 'Drop the held item into the gap.' }
        ] },
        { file: 'js/backend/m03-search-sort.js', fn: 'catalogRows', about: 'Search, then sort.', steps: [
            { at: 'var inBranch = productsUnder(filter.line || filter.branch);', text: 'The products in the chosen branch (module 2)…' },
            { at: 'var found = linearSearch(inBranch, filter.query, searchText);', text: '…then a linear search over them.' },
            { at: 'return insertionSort(rows, sort.compare);', text: 'Order them with the chosen comparison.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm04', no: 4, part: 2, title: 'Flower Customiser', structure: 'Hash table · Recursion',
    screens: 'The product sheet of a flower bouquet (Rose, Plumeria, Dahlia, Sunflower)',
    files: 'js/dsa/hashing.js (fnv1a) · js/dsa/hash-table.js (hashPut, hashGet) · js/backend/m04-flower-customiser.js (buildReferenceIndex, makeFlowerItem) · js/dsa/recursion.js (sumRecursive) · js/frontend/shop/product.js',
    data: 'referenceIndex — hash table, 199 buckets, 160 keys; COLORS (20), ARRANGEMENTS, REAL_REFERENCES (14); the product’s price list',
    summary: ['Hash table (FNV-1a, chaining) · recursive sum', 'O(1) average', 'O(n)'],
    business: [
        'A flower bouquet comes in two arrangements (Round, Layered), up to nine flower counts and twenty ribbon colours from the shop’s colour chart. Customers need to see what they are ordering: the right photo for exactly that arrangement and colour, and the exact price.',
        'There are 160 combinations of flower × arrangement × colour. 14 have real photos of the shop’s work; the other 146 have previews made from the shop’s own photos, recoloured to the chart colour. Add-ons (fairy lights, topper, card, glitter) add to the price.'
    ],
    inputs: [
        ['Customer picks', 'Arrangement, flower count, one of 20 colours, add-ons, card flower, quantity, notes, an optional reference image.'],
        ['Stored: REAL_REFERENCES, COLORS, ARRANGEMENTS', 'Which photos are real; the colour chart; the counts each arrangement offers.'],
        ['Stored: the product’s price list', 'Price per flower count, set by the owner.']
    ],
    steps: [
        'At start-up, build a hash table of all 160 photos keyed "flower|arrangement|colour": first every generated preview, then the 14 real photos written over their entries.',
        'When the customer picks, build the key, hash it with FNV-1a, go to that bucket and scan its short chain for the key: the photo, and whether it is real.',
        'Price = the price-list price for that flower count + the add-ons, added up recursively (each call adds one add-on to the sum of the rest).',
        'Check the choice and build the cart item.'
    ],
    ipo: {
        input: ['flower, arrangement, colour', 'count, add-ons, quantity'],
        process: ['referenceKey() → fnv1a() → bucket', 'hashGet() — scan the chain', 'priceForCount() + addonsTotal() (recursive)'],
        output: ['the photo + "Actual bouquet photo" / "Colour preview"', 'the price', 'a cart item']
    },
    outputs: ['The large photo and its caption on the product sheet.', 'The price in the footer ("₱555.00").', 'A checked cart item.'],
    nMeaning: 'For the table’s space, n = keys stored (160). Hashing a key is O(n) in its length. For the recursive sum, n = the add-ons chosen (at most four).',
    justification: [
        'Every click must find one photo among 160. A hash table answers "what is stored under this key?" in O(1) on average, and with 199 buckets for 160 keys the chains stay about one long. A linear scan of 160 records would grow with every colour or flower added; binary search would need the keys kept sorted.',
        'Chaining handles collisions simply: two keys landing in the same bucket just sit in the same short list.',
        'Recursion fits a sum naturally: the total of a list is its first item plus the total of the rest, ending at the empty list. The add-on list is at most four long, so the call stack is tiny.'
    ],
    demo: ['Open the Rose Bouquet. It starts Round, Red — caption "Actual bouquet photo".', 'Pick Emerald Green: the photo changes and the caption says "Colour preview".', 'Switch to Layered: a different photo — round and layered never share one.', 'Tick Fairy Lights and the card: the price in the footer goes up by ₱40.'],
    shots: [['m04-sheet', 'Rose, Layered, Matcha — a colour preview'], ['m04-real', 'Rose, Round, Red — a real photograph']],
    trace: 'hash', traceTitle: 'the photo look-up and the add-on sum',
    walk: [
        { file: 'js/dsa/hashing.js', fn: 'fnv1a', about: 'Turns text into a 32-bit number (the hash).', steps: [
            { at: 'hash = 2166136261', text: 'Start from the FNV offset basis.' },
            { at: 'hash = hash ^ s.charCodeAt(i);', text: 'Mix in each character with XOR…' },
            { at: 'hash = Math.imul(hash, 16777619) >>> 0;', text: '…then multiply by the FNV prime, kept to 32 bits.' }
        ] },
        { file: 'js/dsa/hash-table.js', fn: 'hashPut', about: 'Inserts or overwrites a key.', steps: [
            { at: 'var chain = table.buckets[hashIndex(table, key)];', text: 'Hash the key to its bucket.' },
            { at: 'if (chain[i].key === key) { chain[i].value = value; return; }', text: 'Key already there: overwrite it (how real photos replace previews).' },
            { at: 'chain[chain.length] = { key: key, value: value };', text: 'Otherwise add it to the end of the chain.' }
        ] },
        { file: 'js/dsa/hash-table.js', fn: 'hashGet', about: 'Looks a key up.', steps: [
            { at: 'var chain = table.buckets[hashIndex(table, key)];', text: 'Go straight to the bucket.' },
            { at: 'if (chain[i].key === key) return chain[i].value;', text: 'Scan the short chain for the exact key.' }
        ] },
        { file: 'js/backend/m04-flower-customiser.js', fn: 'buildReferenceIndex', about: 'Fills the table with all 160 photos.', steps: [
            { at: 'var table = hashCreate(199);', text: '199 buckets: a prime a little above 160 keeps chains short.' },
            { at: "src: IMG_COLORS + flower + '-' + arrangement + '-' + color + '.jpg',", text: 'Every combination first gets its generated preview…' },
            { at: '{ src: IMG_PRODUCTS + ref.file, real: true });', text: '…then the 14 real photos overwrite their entries.' }
        ] },
        { file: 'js/dsa/recursion.js', fn: 'sumRecursive', about: 'Adds up a list recursively.', steps: [
            { at: 'if (at >= items.length) return 0;', text: 'Base case: the empty rest adds nothing.' },
            { at: 'return (Number(valueOf(items[at])) || 0) + sumRecursive(items, valueOf, at + 1);', text: 'This item plus the sum of the rest.' }
        ] },
        { file: 'js/backend/m04-flower-customiser.js', fn: 'makeFlowerItem', about: 'Checks the choice and prices it.', steps: [
            { at: "if (!isIn(countsFor(product, choice.arrangement), choice.count))", text: 'The count must be one this arrangement offers.' },
            { at: 'var unit = priceForCount(product, choice.count) + addonsTotal(addons, choice.count);', text: 'Price list + add-ons for one bouquet.' },
            { at: 'unitEstimate: unit, estimate: unit * choice.quantity,', text: 'Times the quantity.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm05', no: 5, part: 2, title: 'Gift Customiser', structure: 'Greedy algorithm',
    screens: 'The product sheet of the five quote gifts (money, makeup, sweets & snacks, diaper cake, beer-in-can cake) and the picture bouquet',
    files: 'js/dsa/greedy.js (breakIntoBills, describeBills) · js/backend/m05-gift-customiser.js (makeQuoteItem) · js/frontend/shop/product.js (billHint)',
    data: 'DENOMINATIONS — 1000, 500, 200, 100, 50, 20; QUOTE_TYPES; the product’s sizes',
    summary: ['Greedy change-making', 'O(n)', 'O(n)'],
    business: [
        'Five gifts have no price list and are quoted by the owner: the money bouquet, makeup bouquet, sweets & snacks bouquet, diaper cake and beer-in-can cake. The customer describes what they want — size, how many bills or cans, whether they will bring the items themselves — and the owner prices it. The picture bouquet has one set price (₱650).',
        'For a money bouquet the customer usually knows the total they want to give (say ₱5,870) but not how many bills that is. The number of bills decides the size of the bouquet and the labour, so the site suggests the fewest bills for that amount.'
    ],
    inputs: [
        ['Customer types / picks', 'Size, number of bills / items / cans, whether they provide the items, brand or details, add-ons, quantity, notes, reference image.'],
        ['Customer types (money)', 'The total amount to put inside, e.g. 5870.'],
        ['Stored: DENOMINATIONS', 'Philippine notes, largest first: 1000, 500, 200, 100, 50, 20.']
    ],
    steps: [
        'Greedy change-making: start with the amount; for each note from the largest down, take as many as fit (amount ÷ note, rounded down) and subtract them.',
        'Whatever is left at the end (under ₱20) cannot be made in bills and is reported.',
        'Show "Fewest bills: ₱1,000 × 5 · ₱500 × 1 · … = 10 bills" with a button to use that count.',
        'Check the gift and add it to the cart as a quote item (priced later by the owner).'
    ],
    ipo: {
        input: ['amount (e.g. 5870)', 'DENOMINATIONS'],
        process: ['breakIntoBills() — largest note first', 'describeBills() — text'],
        output: ['bills [{ note, count }]', 'remainder', 'suggested bill count']
    },
    outputs: ['The bill suggestion under the amount box, and the "Use N bills" button.', 'A quote item in the cart, labelled "Quote".',
              'For the sweets bouquet and the beer-in-can cake, which the shop had not photographed, openly licensed sample photos from the web — labelled "Sample photo" and credited (author, licence, source).'],
    nMeaning: 'n = number of note denominations (6).',
    justification: [
        'For a canonical currency like the peso, greedy is provably optimal: taking the largest note that fits always gives the fewest notes. It runs in O(n) — six steps — with no search.',
        'The alternative, dynamic programming over every amount up to ₱5,870, is needed only for odd currencies where greedy can fail; here it would be thousands of steps to reach the same answer.',
        'Fewer bills means a smaller, cheaper bouquet — which is what a customer asking "how many bills?" usually wants.'
    ],
    demo: ['Open the Money Bouquet. Type 5870 in "Total amount inside".', 'The hint shows ₱1,000 × 5 · ₱500 × 1 · ₱200 × 1 · ₱100 × 1 · ₱50 × 1 · ₱20 × 1 = 10 bills.', 'Press "Use 10 bills": the bill count updates.'],
    shots: [['m05-money', 'The money bouquet with the greedy bill suggestion']],
    trace: 'greedy', traceTitle: 'the fewest bills',
    walk: [
        { file: 'js/dsa/greedy.js', fn: 'breakIntoBills', about: 'Greedy change-making.', steps: [
            { at: 'var remaining = Math.floor(Number(amount) || 0);', text: 'Start with the whole amount.' },
            { at: 'for (var i = 0; i < denominations.length; i++)', text: 'Go through the notes, largest first.' },
            { at: 'var count = Math.floor(remaining / note);', text: 'Take as many of this note as fit.' },
            { at: 'remaining -= note * count;', text: 'Subtract them; move on to the next smaller note.' },
            { at: 'return { bills: bills, remainder: remaining', text: 'Return the bills, what could not be made, and the total count.' }
        ] },
        { file: 'js/frontend/shop/product.js', fn: 'billHint', about: 'Turns the result into the hint text.', steps: [
            { at: 'var b = breakIntoBills(amount, DENOMINATIONS);', text: 'Run the greedy break-down.' },
            { at: "return 'Fewest bills: ' + describeBills(b)", text: 'Show the notes and the total.' }
        ] },
        { file: 'js/backend/m05-gift-customiser.js', fn: 'makeQuoteItem', about: 'Checks a gift and builds its cart item.', steps: [
            { at: 'if (!isIn(product.sizes, choice.size))', text: 'The size must be one the product offers.' },
            { at: 'if (!isWholeIn(choice.count, 1, 500))', text: 'The count must be a whole number from 1 to 500.' },
            { at: "var unit = (product.kind === 'fixed' ? product.price : 0) + addonsTotal(addons, 0);", text: 'Quote items carry only their add-ons; the picture bouquet carries its set price.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm06', no: 6, part: 2, title: 'Cart', structure: 'Singly linked list',
    screens: 'The cart sheet (the bag button) — lines, + / − and Remove, the subtotal',
    files: 'js/dsa/linked-list.js (llAppend, llRemove, llUpdate, llEntries) · js/backend/m06-cart.js (basketAdd, basketRemove, basketSetQuantity) · js/frontend/shop/cart.js',
    data: 'basket — linked list { nodes, head, tail, size }, each node { value, next, live }',
    summary: ['Singly linked list', 'O(1) append · O(n) remove', 'O(n)'],
    business: [
        'Customers collect several items before checking out — a rose bouquet, a picture bouquet — change quantities, edit a line’s choices (a different colour, another add-on), and remove things they no longer want, in any order.',
        'The cart must keep the items in the order they were added and remove any one of them cleanly.'
    ],
    inputs: [['Customer picks', '"Add to cart" on a product; + / − on a line; "Edit" then "Save changes"; "Remove".'], ['Built by modules 4 and 5', 'The checked item: product, choices, quantity, price.']],
    steps: [
        'Append: the new item becomes a node at the tail; the old tail’s "next" points to it (O(1), thanks to the tail pointer).',
        'Change quantity: replace that node’s value with a copy carrying the new quantity and price.',
        'Edit a line: the customiser opens filled with the line’s choices; "Save changes" builds the item again (module 4 or 5) and puts it back in the same node — the nodes are kept in an array, so reaching it by index is O(1) and the order of the cart does not change.',
        'Remove: walk from the head to find the node before it, re-point that node’s "next" past it, and mark the removed node dead — nothing else moves.',
        'Show: walk from the head along the "next" pointers.'
    ],
    ipo: {
        input: ['item from the customiser', 'line index for + / − / Remove'],
        process: ['llAppend() — at the tail', 'llUpdate() — new quantity', 'llRemove() — relink', 'llEntries() — walk'],
        output: ['cart lines in order', 'badge count', 'subtotal']
    },
    outputs: ['The cart sheet with its lines, the Cart badge count, and the subtotal.'],
    nMeaning: 'n = number of lines in the cart.',
    justification: [
        'A linked list is the textbook structure for "add at the end, remove from anywhere, keep the order". Removing a node re-points one link instead of shifting every later item down as an array would.',
        'The tail pointer makes adding O(1). Keeping the nodes in one array with whole-number "next" links shows the pointer mechanics plainly while still obeying the array-only rule.',
        'The cart is short, so the O(n) walk to find the node before the one removed costs nothing in practice.'
    ],
    demo: ['Add a Rose Bouquet and a Picture Bouquet; open the cart: two lines, in that order.', 'Press + on the first line: its quantity and price update.', 'Press Edit on the first line, choose another colour and Save changes: the line changes in place and glows for a moment.', 'Remove the first line: the second stays exactly as it was.'],
    shots: [['m06-cart', 'The cart with two lines']],
    trace: 'linkedList', traceTitle: 'the cart’s nodes and links',
    walk: [
        { file: 'js/dsa/linked-list.js', fn: 'llAppend', about: 'Adds a node at the tail.', steps: [
            { at: 'list.nodes[index] = { value: value, next: NIL, live: true };', text: 'Make a node in the next free slot; it points nowhere yet.' },
            { at: 'if (list.head === NIL) list.head = index;', text: 'If the list was empty it becomes the head…' },
            { at: 'else list.nodes[list.tail].next = index;', text: '…otherwise the old tail points to it.' },
            { at: 'list.tail = index;', text: 'It is the new tail.' }
        ] },
        { file: 'js/dsa/linked-list.js', fn: 'llRemove', about: 'Unlinks one node.', steps: [
            { at: 'if (list.head === index) {', text: 'Removing the head: the head moves to the next node.' },
            { at: 'while (prev !== NIL && list.nodes[prev].next !== index) prev = list.nodes[prev].next;', text: 'Otherwise walk to the node before it.' },
            { at: 'list.nodes[prev].next = node.next;', text: 'Skip over it.' },
            { at: 'node.live = false;', text: 'Mark it dead; nothing else moves.' }
        ] },
        { file: 'js/dsa/linked-list.js', fn: 'llEntries', about: 'Walks the list in order.', steps: [
            { at: 'var out = [], cursor = list.head', text: 'Start at the head.' },
            { at: 'cursor = node.next;', text: 'Follow each "next" pointer until NIL.' }
        ] },
        { file: 'js/backend/m06-cart.js', fn: 'basketReplace', about: 'Puts an edited line back in its place.', steps: [
            { at: 'return llUpdate(basket, index, item);', text: 'The node is reached by its index and its value replaced: O(1), nothing moves.' }
        ] },
        { file: 'js/backend/m06-cart.js', fn: 'basketSetQuantity', about: 'Changes a line’s quantity.', steps: [
            { at: 'return llUpdate(basket, index, copyRecord(item, { quantity: quantity, estimate: item.unitEstimate * quantity }));', text: 'Replace the node’s value with a copy carrying the new quantity and price.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm07', no: 7, part: 3, title: 'Checkout & Delivery', structure: 'Hash table · Validation',
    screens: 'Checkout step 2 — contact details, pickup (a date) or delivery (address, courier, date and time), and the two agreements',
    files: 'js/backend/m07-checkout-delivery.js (buildAreaIndex, lookupArea, deliveryQuote, slotLoad, pickupPlacesLeft, validateRequest, isValidEmail, isValidPhone) · js/frontend/shop/cart.js (consentHtml) · js/frontend/shop/privacy.js',
    data: 'areaIndex — hash table, 53 buckets; DELIVERY_AREAS (35 cities with aliases); COURIERS; orders (bookings already taken)',
    summary: ['Hash table (city → area) · character-scan validation', 'O(1) average look-up · O(n²) form check', 'O(n)'],
    business: [
        'At checkout the customer gives their name, email and mobile number and chooses pickup (a date only, Monday to Saturday) or delivery (address, date and time).',
        'The delivery fee depends on the city: free in Brgy. Lawa, ₱20–₱50 for nearby towns the shop delivers to itself (Friday to Sunday), and a courier rate (Flash Express or Lalamove) for Metro Manila and the rest of Bulacan. The fee must be worked out the moment the city is typed, however it is typed.',
        'Personal data may only be used with the customer’s consent (Data Privacy Act of 2012). Before the order is placed the customer agrees, in two separate boxes, to the Privacy Notice and to the shop’s order terms; both texts open in a sheet from the banner, the footer and checkout.'
    ],
    inputs: [
        ['Customer types / picks', 'Name, email, mobile, pickup or delivery; street, barangay, city; courier; date; delivery time; rush; the two agreement boxes.'],
        ['Stored: DELIVERY_AREAS', '35 cities with aliases, their service (shop or courier) and fee or region.'],
        ['Stored: COURIERS', 'Each courier’s rate per region.'],
        ['Stored: orders', 'Bookings already taken, for time-slot and pickup-day capacity.']
    ],
    steps: [
        'At start-up, put every city name and alias, normalised, into a hash table (53 buckets).',
        'When a city is typed: normalise it ("  QUEZON   city " → "quezon city"), hash it, scan that bucket — the area record in O(1) on average. If "Marilao, Bulacan" is not found, try the part before the comma.',
        'Shop area: the fee is the area’s fee, or free if the barangay is Lawa. Courier area: look up the chosen courier’s rate for the area’s region.',
        'Check everything by scanning characters (no regular expressions): the email format, the mobile number, the date against the lead time, Sundays (pickup) or Friday–Sunday (shop delivery), and the places left that day or time.',
        'Both agreements must be ticked. The placed order records { privacyVersion, terms, at } in order.consent and a line in its history.'
    ],
    ipo: {
        input: ['typed city, barangay, courier', 'chosen date and time'],
        process: ['buildAreaIndex() — hash table', 'lookupArea() → normaliseKey() → hashGet()', 'deliveryQuote() — the fee', 'validateRequest() — the rules'],
        output: ['fee and label ("Shop delivery to Marilao: ₱35")', 'errors under each field', 'a valid order form, with the consent recorded']
    },
    outputs: ['The fee notice under the address, the courier choices with their rates, the places left for each time or pickup date, and field errors.',
              'Under every date and time — at checkout, on the confirmation, Track order, the receipt and the emails — a note that they are estimates: bad weather, traffic, road closures or courier delays can move them (scheduleNote()).'],
    nMeaning: 'For the look-up, n = the length of the typed city (to normalise it); the table holds 45 names. For the form check, n = the cart lines (each one’s product is looked up — a loop inside a loop) and the orders (for capacity).',
    justification: [
        'Customers type city names in every possible way. Normalising then hashing turns any spelling into a direct look-up — O(1) on average — instead of comparing the input with all 45 names on every keystroke.',
        'Aliases ("QC", "Sta Maria", "Paranaque") are simply extra keys pointing at the same record, which a hash table handles naturally.',
        'Checking by scanning characters is required by the project rules (no regular expressions) and gives a precise message for each kind of mistake. Fees live in data, not code: the owner can add a city by adding one record.'
    ],
    demo: ['Add a bouquet and check out. Choose Delivery and type "  quezon   CITY ": the courier choices appear with ₱120 / ₱220.', 'Type "Marilao": "Shop delivery to Marilao: ₱35", Friday to Sunday.', 'Choose Pickup: only a date — no time slots — and the places left that day.', 'Press Review without ticking the agreements: checkout stops, with a message under each box. "Privacy Notice" opens the notice.'],
    shots: [['m07-delivery', 'Delivery to Manila: courier choices with their rates'], ['m07-pickup', 'Pickup: a date only'], ['m07-consent', 'The two agreements, asked separately']],
    trace: 'areas', traceTitle: 'the delivery-area look-ups',
    walk: [
        { file: 'js/backend/m07-checkout-delivery.js', fn: 'buildAreaIndex', about: 'Puts every city and alias in the hash table.', steps: [
            { at: 'var table = hashCreate(53);', text: '53 buckets for 45 keys.' },
            { at: 'hashPut(table, normaliseKey(area.city), area);', text: 'The city’s normalised name…' },
            { at: 'hashPut(table, normaliseKey(area.aliases[k]), area);', text: '…and each alias, all pointing at the same record.' }
        ] },
        { file: 'js/backend/m07-checkout-delivery.js', fn: 'lookupArea', about: 'Finds the area for whatever was typed.', steps: [
            { at: 'var found = hashGet(areaIndex, normaliseKey(city));', text: 'Normalise and look up.' },
            { at: "var head = cutText(city, ',')[0];", text: 'Not found? Try the part before a comma ("Marilao, Bulacan").' }
        ] },
        { file: 'js/backend/m07-checkout-delivery.js', fn: 'deliveryQuote', about: 'Works out the fee.', steps: [
            { at: "return { service: 'pickup', fee: 0", text: 'Pickup: free.' },
            { at: 'var free = isIn(area.freeBarangays || [], barangayKey(f.barangay));', text: 'Shop area: free in Brgy. Lawa…' },
            { at: 'service: \'inhouse\', fee: free ? 0 : area.fee', text: '…otherwise the area’s fee.' },
            { at: 'var rate = courierRate(courier.id, area.region);', text: 'Courier area: the chosen courier’s rate for the region.' },
            { at: "status: 'manual'", text: 'No rate on file: the fee must be set by the owner.' }
        ] },
        { file: 'js/backend/m07-checkout-delivery.js', fn: 'validateRequest', about: 'Checks the checkout form.', steps: [
            { at: "if (!isValidEmail(form.email)) fail('email'", text: 'An email is required — confirmations go there.' },
            { at: "else if (form.date < earliest) fail('date'", text: 'Not earlier than the lead time allows.' },
            { at: "fail('date', 'The shop delivers on '", text: 'Shop deliveries only Friday to Sunday.' },
            { at: "fail('date', 'The shop is closed on Sundays.", text: 'Pickups: Monday to Saturday, by date only.' },
            { at: "fail('city', 'We have no delivery rate for '", text: 'A price-list cart needs a rate on file — it is never turned into a quote.' },
            { at: "if (form.consent !== true) fail('consent'", text: 'The Privacy Notice must be agreed to…' },
            { at: "if (form.terms !== true) fail('terms'", text: '…and, separately, the order terms.' }
        ] }
    ]
}
];
