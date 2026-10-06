/* =========================================================================
   REVIEWER CONTENT — what each part of the system is for, in words.

   Everything here is prose written by hand. Line numbers, code, complexity
   notes, traces and screenshots are NOT written here: build.js reads them
   from the real files and the running code, so they cannot drift. A
   walkthrough step points at a line by quoting a short piece of it ("at");
   the build finds that line and fails if it has gone.

   "{OWNER}" in any text is replaced by the owner's sign-in email from
   js/email-config.js when the reviewer is built.
   ========================================================================= */

/* =========================================================================
   THE FOUR PARTS — each with a one-page summary before its modules.
   Put the name of the group member who presents a part in "member"; it
   then appears on the cover, the part's summary page and the file map.
   ========================================================================= */
var PARTS = [
{
    no: 1, member: '', title: 'The shop window', tint: 'rose', modules: ['m01', 'm02', 'm03'],
    pitch: 'These modules are what a customer sees first. Catalogue & Best Sellers ranks the products by the pieces really sold — one pass over the paid orders with a hash table, then a selection sort. Category Navigation stores the shop’s three columns as an n-ary tree, so "everything under Flower Bouquets" is a depth-first walk with a stack. Search & Sort finds words anywhere in a product with a linear search and naive string matching, and orders the results with a stable insertion sort.',
    structures: [
        ['Count pieces sold', 'Hash table (product id → tally row) over the order lines', 'O(n²) — every line of every order', 'O(n)'],
        ['Rank the best sellers', 'Selection sort (stable version)', 'O(n²) always', 'O(n) copy'],
        ['Branch → its lines', 'N-ary tree, depth-first search with a stack', 'O(n)', 'O(n)'],
        ['Search box', 'Linear search + naive string matching', 'O(n²)', 'O(n)'],
        ['Sort menu', 'Insertion sort (stable)', 'O(n) best, O(n²) worst', 'O(n) copy']
    ],
    questions: [
        ['Why selection sort for the best sellers?', 'For ten products any of the sorts from class is instant. Selection sort always makes n(n−1)/2 = 45 comparisons — a fixed cost that is easy to show — and each pass answers the business question "which product is the biggest seller left?". Ours shifts instead of swapping, so it is stable: equal sellers keep their catalogue order.'],
        ['Why a hash table to count sales?', 'Without it, the count went through every order once for each product. With a row per product found by hashGet in O(1) on average, one pass over the orders and their lines does it.'],
        ['Why a tree for the categories instead of a list?', 'The categories are a hierarchy. "All lines under this branch" becomes "all leaves under this node", with no list of which line belongs where written into the page. Adding a line is adding one leaf.'],
        ['How does the tree search work without recursion?', 'treeFind and treeLeaves use our own stack: push the root, pop a node, push its children — depth-first, each node visited once, O(n).'],
        ['Why not binary search for the search box?', 'Binary search needs an exact key in a sorted array. The search box asks "does this word appear anywhere in the name, materials or colours?", which only a scan of each record can answer.'],
        ['Why is the text search O(n²)?', 'textHas tries the word at every starting position of the text and compares letter by letter — a loop inside a loop. Run over a whole table, that is the O(n²) naive string matching from class.']
    ]
},
{
    no: 2, member: '', title: 'Choosing a gift', tint: 'plum', modules: ['m04', 'm05', 'm06'],
    pitch: 'These modules turn a product into something in the cart. The Flower Customiser finds the right photograph among 160 combinations with a hash table keyed "flower|arrangement|colour", and adds up the add-ons with a recursive sum. The Gift Customiser suggests the fewest bills for a money bouquet with a greedy algorithm. The Cart is a singly linked list: adding is O(1) at the tail, and removing re-points one link.',
    structures: [
        ['Find the photograph', 'Hash table with chaining (FNV-1a)', 'O(1) average', 'O(n)'],
        ['Add-on total', 'Recursion', 'O(n)', 'O(n) call stack'],
        ['Fewest bills', 'Greedy change-making', 'O(n)', 'O(n)'],
        ['Add to cart', 'Linked list append (tail pointer)', 'O(1)', 'O(1)'],
        ['Remove a line', 'Linked list remove (walk to the node before it)', 'O(n)', 'O(1)'],
        ['Show the cart', 'Linked list walk from the head', 'O(n)', 'O(n)']
    ],
    questions: [
        ['What happens when two keys land in the same bucket?', 'That is a collision. Each bucket holds a chain (a short list); the second key is added to the chain and a look-up compares keys along it. With 160 keys in 199 buckets the chains are about one long.'],
        ['Why 199 buckets?', 'A prime a little above the 160 keys: the load factor stays near 0.8 and the remainder spreads the FNV-1a hashes evenly over the buckets.'],
        ['Is the greedy answer always the fewest bills?', 'For the peso, yes. Its notes (1000, 500, 200, 100, 50, 20) form a canonical system, where taking the largest note that fits is optimal. For odd currencies greedy can fail and dynamic programming would be needed.'],
        ['Why a linked list for the cart instead of an array?', 'The cart adds at the end and removes from anywhere. Removing a node re-points one link; an array would shift every later item. The tail pointer makes adding O(1).'],
        ['Where is the recursion, and what stops it?', 'sumRecursive adds the first item to the sum of the rest. The base case is the empty rest, which adds 0. The add-on list is at most four long, so the call stack stays tiny.']
    ]
},
{
    no: 3, member: '', title: 'Checkout and payment', tint: 'green', modules: ['m07', 'm08', 'm09'],
    pitch: 'These modules take the customer from cart to paid order. Checkout & Delivery finds the delivery fee for whatever city is typed with a hash table of 45 names and aliases, and checks every field by scanning its characters — no regular expressions. The Quotation Desk answers quote requests first come, first served with a circular queue, and pre-fills each quotation from the owner’s past quotes, put newest first with insertion sort. Payment, Receipts & Email takes GCash payments, snapshots each one into a receipt, and sends every email in order through a second circular queue.',
    structures: [
        ['City → delivery area', 'Hash table (normalised names and aliases)', 'O(1) average', 'O(n)'],
        ['Check the checkout form', 'Character scans; each cart line’s product looked up', 'O(n²)', 'O(n)'],
        ['Quote requests in order', 'Circular queue (FIFO)', 'O(1) enqueue / dequeue', 'O(n)'],
        ['Pre-fill a quotation', 'Insertion sort of past quotes + linear search', 'O(n²)', 'O(n)'],
        ['Reference used before?', 'Linear search of the receipts', 'O(n)', 'O(1)'],
        ['Send emails in order', 'Circular queue (FIFO)', 'O(1) per email', 'O(n)']
    ],
    questions: [
        ['Why does a circular queue never shift its items?', 'The head and the tail move forward and wrap around with "% capacity". Dequeuing only moves the head; its slot is reused later. A plain array that removes from the front would move every remaining item: O(n).'],
        ['What happens when the queue is full?', 'cqGrow doubles the buffer and copies the items in queue order, so the head lands at slot 0. That copy is O(n) but rare, so enqueue stays O(1) amortised.'],
        ['How is "  QUEZON   city " understood?', 'normaliseKey lower-cases, trims and collapses runs of spaces, dots and commas, character by character. Every city and alias went into the table the same way, so any spelling hashes to the same bucket.'],
        ['How is a GCash reference stopped from paying twice?', 'gcashProblem checks for 13 digits, then receiptWithRef searches the receipts for the same reference — a linear search, O(n).'],
        ['Why is a receipt a copy of the order?', 'A receipt records what was paid at that moment. If the order is edited later, the receipt must not change.'],
        ['Why send emails through a queue?', '"Order confirmed" must arrive before "ready for pickup", and only one request is sent at a time. The queue keeps that order, and a failed email can be queued again without being lost.']
    ]
},
{
    no: 4, member: '', title: 'Behind the counter', tint: 'amber', modules: ['m10', 'm11', 'm12'],
    pitch: 'These modules are the owner’s side. Production & Tracking keeps rush orders in a min-heap by due date and regular orders in a circular queue by payment order, and finds any order for a customer with a binary search on the order number. Order Records keeps every completed and voided order, sorted by date with insertion sort, and undoes "Mark ready" with a stack. The Order Desk signs the owner in with a hashed password and an emailed six-digit code, and its Overview puts every order and receipt into its day, month or year by reading the record’s own date.',
    structures: [
        ['Rush lane', 'Min-heap keyed (due date, arrival)', 'O(log n) insert / extract', 'O(n)'],
        ['Standard lane', 'Circular queue (FIFO)', 'O(1)', 'O(n)'],
        ['Track an order', 'Binary search on the order number', 'O(log n)', 'O(1)'],
        ['Undo "Mark ready"', 'Stack (LIFO)', 'O(1) push / pop', 'O(n)'],
        ['Completed orders by date', 'Insertion sort + one grouping pass', 'O(n) nearly in order, O(n²) worst', 'O(n)'],
        ['Sign-in', 'FNV-1a hash compare', 'O(n) in the password length', 'O(1)'],
        ['Overview by period', 'Bucketing by the record’s date', 'O(n²) — the lines of every order', 'O(n)']
    ],
    questions: [
        ['Why a heap for rush orders and not a sorted array?', 'Inserting into a sorted array shifts items: O(n). A heap inserts, and removes the earliest due date, in O(log n) by sifting along one path of the tree.'],
        ['How is a tie on the due date broken?', 'The key is (due date, arrival number). heapCompare compares dates first, then arrival, so equal dates are served in the order they were paid — the heap is stable.'],
        ['Why is the orders array always sorted?', 'Order numbers come from a counter that only goes up, and new orders are appended, so the array stays in number order without sorting — which is what makes binary search possible.'],
        ['What is the worst case of your binary search?', 'About log₂ n comparisons: 5 for the 22 demo orders, 10 for 1,000 orders. A linear search could need all n.'],
        ['How does undo put an order back exactly?', 'Each "Mark ready" pushes { order id, its place in line }. Undo pops the newest entry and puts the order back: into the heap with its original key, or into the queue at its old position.'],
        ['Is the two-step sign-in real security?', 'It keeps customers off the desk: only hashes of the password and the code are kept, codes expire after five minutes and allow three tries, and five wrong passwords lock the desk for 30 seconds. Real security needs a server — anything in a browser can be read with developer tools.']
    ]
}
];

/* =========================================================================
   THE WHOLE SYSTEM — overview, data, rules
   ========================================================================= */
var SYSTEM = {
    problem: 'Sýmpan Universe makes handcrafted ribbon bouquets and gift cakes in Lawa, Meycauayan, Bulacan. Without a system, every order is a chat thread: the owner prices each request by hand, keeps payments and pickup dates in notes, and answers "is my order ready?" one message at a time. The website handles the customer’s whole order — browsing, customising, checkout, payment, tracking — and the owner’s work behind it.',
    customerFlow: ['① Best sellers', '② Categories', '③ Search & sort', '④ Customise flowers / ⑤ gifts', '⑥ Cart', '⑦ Checkout'],
    priceFlow: ['Price-list cart', '⑨ Pay by GCash', '⑩ Production', '⑪ Ready → records'],
    quoteFlow: ['Quote cart', '⑧ Owner quotes it', '⑨ Customer pays', '⑩ Production', '⑪ Ready → records'],
    ownerFlow: '⑫ The owner signs in (password + emailed code), watches the Overview by day, month or year, and edits orders and products.',
    layers: [
        ['js/core.js, structures.js, algorithms.js', 'Our own array, text and date helpers; the linked list, circular queue, min-heap, stack, n-ary tree and hash table; the sorts, searches, recursion and greedy algorithm.'],
        ['js/data.js, store.js, orders.js, notify.js, editing.js, reports.js', 'The "database" (arrays) and the business rules: the catalogue, cart, checkout, quotations, payments, production, records, emails and reports.'],
        ['js/ui.js, motion.js, mail.js, receipt.js', 'Screens, sheets, animation, the email sender (EmailJS) and receipts.'],
        ['js/shop-*.js, admin-*.js, app.js', 'One script per screen: the shop, and the order desk at index.html#admin.']
    ],
    data: [
        ['orders', 'order number (201, 202 …)', 'numbers only grow → append, O(1); the array stays sorted for binary search', '1, 7–12'],
        ['products', 'product id (101 …)', 'the fixed catalogue, edited in place', '1–5, 12'],
        ['receipts, outbox', 'receipt / email number', 'append, O(1)', '9, 12'],
        ['basket', 'position', 'singly linked list, in the order added', '6'],
        ['quoteQueue, standardLane, mailQueue', 'order id / outbox position', 'circular queues, first in first out', '8, 9, 10'],
        ['rushLane', '(due date, arrival)', 'min-heap', '10'],
        ['completedStack', '{ id, position }', 'stack, last in first out', '11'],
        ['categoryTree', 'slug', 'n-ary tree stored in one array', '2'],
        ['referenceIndex, areaIndex', '"flower|arrangement|colour"; city name', 'hash tables with chaining', '4, 7']
    ],
    rules: [
        ['HTML, CSS, Bootstrap and JavaScript only; JS is the "backend"', 'No server, no framework, no database program. Bootstrap 5.3 gives the grid; everything else is our own code.'],
        ['Data cannot transfer between pages (arrays)', 'One page, index.html: the shop and the order desk (#admin) are shown and hidden, so the arrays survive every screen change. No localStorage, no cookies, no server. A reload starts again from the demo data.'],
        ['Procedural, not OOP', 'Only functions and plain records: no class, this, prototype or new (except new Date once, to read the clock). A queue is the record { items, head, tail, count, capacity } plus functions like cqEnqueue(queue, value).'],
        ['No built-in helpers: push, pop, shift, unshift, splice, slice, concat, sort, reverse, indexOf, includes, find, filter, map, forEach, reduce, some, every, join; split, replace, trim, toLowerCase, toUpperCase, padStart, substring; no regular expressions', 'All replaced by our own functions in js/core.js, js/structures.js and js/algorithms.js — listAdd, copyRange, keepWhere, firstWhere, cutText, strip, toLower, insertionSort, binarySearch … tests/rubric.js scans every script and fails on any of them.'],
        ['State the time and space complexity, using only O(1), O(log n), O(n) and O(n²)', 'Written above every function in js/. The rubric fails on a missing note or on any other notation — which is why there is no merge sort: it is O(n log n).'],
        ['Use Date only to read the clock', 'readClock() holds the only new Date. Adding days, weekdays, month lengths and leap years are our own day-number arithmetic (dayNumber, dateOfDayNumber in js/core.js).']
    ],
    builtins: 'Built-ins that are used are only for input and output: the page itself (the DOM), Date (to read the clock), Math, Number, String, charAt and charCodeAt, the length of an array or text, timers, crypto.getRandomValues (the six-digit sign-in code), and fetch with JSON.stringify to hand an email to EmailJS.'
};

/* How complexity is counted — shown on the primer page and in Appendix A. */
var COUNTING = [
    'Only the four notations from class: O(1), O(log n), O(n) and O(n²) — with "average", "amortised", "best" or "worst" where it matters, and sums such as O(log n) + O(n).',
    'n is the size of whatever the function goes through: records in a table (orders, lines, products, emails, receipts), items in a queue, or the characters of a text when the text itself is the job (validators, hashing, string search).',
    'A loop inside a loop is O(n²). Naive string matching over a table is O(n²).',
    'Work on one record’s own fields — escaping or formatting its text, copying it — and look-ups in the shop’s short fixed lists (20 colours, 2 arrangements, 4 add-ons, 4 time slots, 2 payment methods) count as constant work inside a loop over records: those lists are part of the program, not data that grows.',
    'An O(log n) step done once per item (a binary search per queued order) is written "O(n²) at most".'
];

/* =========================================================================
   APPENDICES
   ========================================================================= */
var GENERAL_QUESTIONS = [
    ['Why is the whole website one HTML page?', 'Our data lives in JavaScript arrays, and arrays exist only while the page is open — they cannot be carried to another HTML file. So the shop and the order desk are sections of one index.html, shown and hidden; the part after # in the address picks the view. The arrays stay alive while you move between screens.'],
    ['Where is the data saved? What happens when you refresh?', 'Only in memory (the arrays in js/store.js). There is no localStorage, cookie or server. Refreshing the page replays the demo history again — expected under the project rule, and it means every demonstration starts from the same state.'],
    ['Why didn’t you use push, sort, indexOf, filter and the other built-ins?', 'It was a project rule, and it shows we understand what they do. Each has our own version: listAdd (push), copyRange (slice), positionIn (indexOf), keepWhere (filter), firstWhere (find), renderEach (map + join), insertionSort (sort), cutText (split), strip (trim), toLower (toLowerCase) — and no regular expressions.'],
    ['What does "procedural, not OOP" mean in your code?', 'There are no classes, no this and no methods. Data is plain records (a queue is { items, head, tail, count, capacity }) and every operation is a separate function that receives the record: cqEnqueue(queue, value), stackPush(stack, value), hashPut(table, key, value).'],
    ['Why insertion and selection sort, and not merge sort or quick sort?', 'The course allows only O(1), O(log n), O(n) and O(n²); merge sort is O(n log n). Quick sort is not stable and its worst case is O(n²) anyway. Our lists are small and usually almost in order — orders, emails and receipts are appended as they happen — which is insertion sort’s best case, O(n). Selection sort ranks the ten best sellers with a fixed, easy-to-show cost.'],
    ['Aren’t O(n²) sorts too slow?', 'Not for our data: the lists hold tens to hundreds of records, and we read them in the order that leaves them nearly sorted. The Order Records trace shows it: 15 completed orders sorted newest first take 15 comparisons, not the worst case of 105.'],
    ['Why hash tables, when you already have binary search?', 'Binary search needs an array sorted by the key you search for. The photographs are looked up by "flower|arrangement|colour" and the delivery areas by any spelling of a city name — keys that are not stored in order. A hash table answers those in O(1) on average.'],
    ['How does undo work?', 'It is a stack. Each "Mark ready" pushes the order id and its place in the production line. Undo pops the newest entry — last in, first out — and puts the order back exactly there.'],
    ['How are emails sent without a server?', 'Every email is written into the outbox array and its position queued. Every 1.5 seconds the sender takes the front of the queue and posts it to EmailJS (a web service that sends email for a browser page). Demo customers (example.com) are never emailed. If EmailJS is not set up, the email is kept in the Outbox marked "not sent", and the sign-in code is shown on screen instead.'],
    ['How secure is it?', 'It is a class project that runs entirely in the browser, so we are honest about the limits. The password and the sign-in code are kept only as FNV-1a hashes, codes expire after five minutes and allow three tries, five wrong passwords lock the desk for 30 seconds, the order desk is linked from nowhere on the shop, and everything a customer types is escaped before it is shown. A real deployment needs a server, a proper password hash (bcrypt or Argon2) and HTTPS, because anything in a browser can be read with developer tools.'],
    ['How do you prove the complexities?', 'Each function states its cost above its code, and tests/rubric.js fails if one is missing or uses another notation. The unit tests count insertion sort’s comparisons on sorted and reversed input (n − 1 and n(n − 1)/2). The traces in this reviewer were produced by running our actual functions on the demo data.'],
    ['Did you use the Date object?', 'Only to read the clock: readClock() reads the time and the time zone, and Date.now() gives timestamps. All date maths — adding days, the weekday, month lengths, leap years, the day a timestamp falls on — is our own day-number arithmetic in js/core.js.'],
    ['What would you improve with more time?', 'A real server and database so data survives a refresh; online payment through the payment provider instead of typed references; SMS updates; and a balanced tree or database index once the order list grows to many thousands.']
];

var GLOSSARY = [
    ['Array', 'Items in numbered slots (0, 1, 2 …); reading slot i is O(1). Our "tables".'],
    ['Key', 'The field a structure is ordered or looked up by (order number, product id, city name …).'],
    ['Linear search', 'Check items one by one until a match. O(n); works on unsorted data.'],
    ['Binary search', 'On a sorted array, compare with the middle and keep one half. O(log n).'],
    ['Naive string matching', 'Try the search word at every position of a text, letter by letter. O(n²) over a table.'],
    ['Insertion sort', 'Take each item and slide the larger ones before it one place right until its spot is found. O(n) when already in order, O(n²) worst. Stable.'],
    ['Selection sort', 'For each position, find the item that belongs there among the rest. Always n(n−1)/2 comparisons, O(n²).'],
    ['Stable sort', 'Equal items keep their original order.'],
    ['Linked list', 'Nodes that each point to the next. Adding at a known end is O(1); removing re-points one link.'],
    ['Stack (LIFO)', 'Last in, first out: push and pop at the top. Used for undo and the depth-first tree walks.'],
    ['Queue (FIFO)', 'First in, first out: enqueue at the rear, dequeue at the front. Used for quote requests, standard production and email.'],
    ['Circular buffer', 'A queue in a fixed array whose rear wraps round to the start, so nothing is shifted: O(1) enqueue and dequeue.'],
    ['Min-heap', 'A tree kept in an array where every parent comes before its children; the smallest key is always at index 0. Insert and extract are O(log n).'],
    ['N-ary tree', 'Each node can have any number of children. Our category tree: a root, 3 branches, 10 lines.'],
    ['Depth-first search', 'Visit a node, then go as deep as possible before backtracking — here with an explicit stack.'],
    ['Hash table', 'A hash function turns a key into a bucket number, so a look-up checks one short list. O(1) on average.'],
    ['FNV-1a', 'Our string hash: start at 2166136261; for each character XOR it in, then multiply by 16777619 (kept to 32 bits).'],
    ['Collision / chaining', 'Two keys in the same bucket; they are kept in a chain (a short list) inside that bucket.'],
    ['Load factor', 'Keys ÷ buckets (160 ÷ 199 ≈ 0.8 for the photographs).'],
    ['Recursion', 'A function that calls itself on a smaller problem, ending at a base case.'],
    ['Greedy algorithm', 'Take the best choice at each step (the largest note that fits) without looking back.'],
    ['Amortised', 'The average cost per operation over many operations — enqueue is O(1) amortised although a rare grow is O(n).'],
    ['Big-O', 'How the work grows with the size of the data (worst case unless stated).']
];

var FILE_MAP = [
    ['1 · The shop window', 'store.js (salesTally, topSellers) · algorithms.js (selectionSortDesc, linearSearch, insertionSort) · structures.js (tree, stack) · core.js (textHas)', 'shop-catalog.js'],
    ['2 · Choosing a gift', 'structures.js (hash table, linked list) · store.js (buildReferenceIndex, makeFlowerItem, makeQuoteItem, basket) · algorithms.js (sumRecursive, breakIntoBills)', 'shop-product.js · shop-basket.js'],
    ['3 · Checkout and payment', 'store.js (lookupArea, deliveryQuote) · orders.js (validateRequest, quoteHistory, sendQuote, placeOrder, acceptQuote, issueReceipt) · notify.js · mail.js', 'shop-basket.js · shop-track.js · admin-orders.js · receipt.js'],
    ['4 · Behind the counter', 'structures.js (heap, circular queue, stack) · orders.js (productionLine, completeNext, undoCompletion, completedByDate, voidOrder) · algorithms.js (binarySearch) · reports.js · admin-signin.js', 'admin-desk.js · admin-overview.js · admin-products.js · shop-track.js']
];

/* =========================================================================
   THE TWELVE MODULES
   ========================================================================= */
var MODULES = [

/* ===================================================================== */
{
    id: 'm01', no: 1, part: 1, title: 'Catalogue & Best Sellers', structure: 'Hash table · Selection sort',
    screens: 'Home page — the "Best sellers" strip and every product card; the Overview’s best sellers (order desk)',
    files: 'js/store.js (salesTally, salesRank, topSellers) · js/algorithms.js (selectionSortDesc) · js/shop-catalog.js',
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
        { file: 'js/store.js', fn: 'salesTally', about: 'Counts, for every product, how many pieces were sold and in how many orders.', steps: [
            { at: 'var out = [], rowFor = hashCreate(31);', text: 'A list of rows, and a hash table to find a row by product id.' },
            { at: "hashPut(rowFor, String(products[p].id), row);", text: 'Make one row per product and index it by the product id.' },
            { at: 'if (!countsAsSale(orders[o]) || (include && !include(orders[o]))) continue;', text: 'Skip orders that are not paid or completed — voided and unpaid ones never count.' },
            { at: 'var hit = hashGet(rowFor, String(items[i].productId));', text: 'Each line finds its product’s row with one hash look-up.' },
            { at: 'hit.units += items[i].quantity;', text: 'Add the line’s pieces to that product.' },
            { at: 'if (hit.lastOrder !== o) { hit.orders++; hit.lastOrder = o; }', text: 'Count the order once per product, however many lines it has.' }
        ] },
        { file: 'js/store.js', fn: 'salesRank', about: 'Turns a row into one number so the sort can compare rows.', steps: [
            { at: 'return row.units * 100000 + row.orders;', text: 'Units dominate; the order count only matters when units tie.' }
        ] },
        { file: 'js/algorithms.js', fn: 'selectionSortDesc', about: 'The selection sort itself — largest key first, and stable.', steps: [
            { at: 'var work = copyArray(records);', text: 'Sort a copy, so the original tally is untouched.' },
            { at: 'for (var i = 0; i < work.length - 1; i++)', text: 'Pass i fills position i.' },
            { at: 'if (countOf(work[j]) > countOf(work[best])) best = j;', text: 'Scan everything after i for the largest key. Strictly greater keeps ties in their old order.' },
            { at: 'for (var k = best; k > i; k--) work[k] = work[k - 1];', text: 'Shift the items between i and best one place right…' },
            { at: 'work[i] = held;', text: '…and drop the largest into position i. Shifting (not swapping) is what makes it stable.' }
        ] },
        { file: 'js/store.js', fn: 'topSellers', about: 'Ranks a tally and keeps the first k that are active and have sold.', steps: [
            { at: 'var ranked = selectionSortDesc(tally, salesRank);', text: 'Sort the rows by the rank key.' },
            { at: 'if (ranked[i].units > 0 && ranked[i].product.active)', text: 'Leave out disabled products and products nobody has bought.' }
        ] },
        { file: 'js/shop-catalog.js', fn: 'renderBestSellers', about: 'Draws the strip.', steps: [
            { at: 'var top = bestSellers(3)', text: 'Ask for the top three.' },
            { at: 'grid.innerHTML = renderEach(rows', text: 'Render each one as a product card with the badge.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm02', no: 2, part: 1, title: 'Category Navigation', structure: 'N-ary tree · Stack',
    screens: 'Catalogue — the branch chips (All, Flower Bouquets, Other Bouquets, Gift Cakes) and their line chips',
    files: 'js/structures.js (treeAdd, treeFromOutline, treeFind, treeLeaves, stack) · js/data.js (CATEGORY_OUTLINE) · js/shop-catalog.js',
    data: 'categoryTree — 14 nodes in one array { label, slug, parent, children, depth }; CATEGORY_OUTLINE',
    summary: ['N-ary tree · depth-first search with a stack', 'O(n)', 'O(n)'],
    business: [
        'The shop’s own order sheet groups everything in three columns: Flower Bouquets, Other Bouquets and Gift Cakes, each with its own lines (Rose, Plumeria, Money, Diaper Cake…). Customers browse the same way.',
        'Picking a branch such as "Flower Bouquets" must show every line under it, and picking a line such as "Rose" must show only that line — without the page hard-coding which lines belong where.'
    ],
    inputs: [
        ['Stored: CATEGORY_OUTLINE', 'The three branches and their lines, from the order sheet (js/data.js).'],
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
        { file: 'js/structures.js', fn: 'treeAdd', about: 'Adds one node under a parent.', steps: [
            { at: 'var index = tree.nodes.length;', text: 'The new node’s index is the next free slot.' },
            { at: 'depth: parentIndex === NIL', text: 'Depth is the parent’s depth + 1 (the root is 0).' },
            { at: 'listAdd(tree.nodes[parentIndex].children, index)', text: 'Link it: the parent remembers its new child’s index.' }
        ] },
        { file: 'js/structures.js', fn: 'treeFromOutline', about: 'Builds the whole tree from the order sheet outline.', steps: [
            { at: 'var tree = treeCreate(rootLabel);', text: 'Start with a root.' },
            { at: 'var parent = treeAdd(tree, branches[i].label', text: 'Add each branch under the root…' },
            { at: 'treeAdd(tree, kids[j].label, kids[j].slug, parent)', text: '…and each line under its branch.' }
        ] },
        { file: 'js/structures.js', fn: 'treeFind', about: 'Finds a node by slug with our stack (depth-first).', steps: [
            { at: 'stackPush(stack, tree.root);', text: 'Start at the root.' },
            { at: 'var at = stackPop(stack), node = tree.nodes[at];', text: 'Take the most recently added node (last in, first out).' },
            { at: 'if (node.slug === slug) return at;', text: 'Found it — return its index.' },
            { at: 'for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);', text: 'Otherwise push its children, last first, so the first child is visited next.' }
        ] },
        { file: 'js/structures.js', fn: 'treeLeaves', about: 'Collects every leaf under a node.', steps: [
            { at: 'if (node.children.length === 0) listAdd(out, node.slug);', text: 'A node with no children is a leaf: keep its slug.' },
            { at: 'else for (var i = node.children.length - 1; i >= 0; i--) stackPush(stack, node.children[i]);', text: 'Otherwise descend into its children.' }
        ] },
        { file: 'js/shop-catalog.js', fn: 'catalogRows', about: 'Applies the tree filter (then search and sort — module 3).', steps: [
            { at: 'var leaves = slug ? treeLeaves(categoryTree, treeFind(categoryTree, slug)) : null;', text: 'The chosen chip’s leaves, or no filter.' },
            { at: 'var inBranch = keepWhere(activeProducts(), function (p) { return leaves === null || isIn(leaves, p.line); });', text: 'Keep active products whose line is one of those leaves.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm03', no: 3, part: 1, title: 'Search & Sort', structure: 'Linear search · Insertion sort',
    screens: 'Catalogue — the search box and the sort menu (Best selling, Name A–Z, Starting price, Newest)',
    files: 'js/core.js (normaliseKey, textHas) · js/algorithms.js (linearSearch, insertionSort) · js/shop-catalog.js (catalogRows, SORTS)',
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
        { file: 'js/core.js', fn: 'normaliseKey', about: 'Puts text into one comparable form.', steps: [
            { at: 'var s = strip(toLower(text))', text: 'Lower-case and trim.' },
            { at: "if (isSpace(c) || c === '.' || c === ',')", text: 'Spaces, dots and commas all become one space…' },
            { at: 'if (!lastSpace) out += ', text: '…and runs of them collapse to a single space.' }
        ] },
        { file: 'js/core.js', fn: 'textHas', about: 'Does the text contain the word? Naive string matching.', steps: [
            { at: 'for (var start = 0; start + find.length <= text.length; start++)', text: 'Try every starting position…' },
            { at: 'while (k < find.length && text.charAt(start + k) === find.charAt(k)) k++;', text: '…and match the characters one by one (a loop inside a loop).' },
            { at: 'if (k === find.length) return true;', text: 'All matched: found.' }
        ] },
        { file: 'js/algorithms.js', fn: 'linearSearch', about: 'Keeps every record whose text has every word.', steps: [
            { at: "var words = cutText(normaliseKey(query), ' ');", text: 'Normalise the query and cut it into words.' },
            { at: 'if (wanted.length === 0) return copyArray(records);', text: 'No words: everything matches.' },
            { at: 'var haystack = normaliseKey(textOf(records[i]));', text: 'Build this record’s searchable text.' },
            { at: 'if (!textHas(haystack, wanted[w])) all = false;', text: 'A missing word rules the record out.' },
            { at: 'if (all) listAdd(out, records[i]);', text: 'Keep it.' }
        ] },
        { file: 'js/algorithms.js', fn: 'insertionSort', about: 'The sort used everywhere in the system.', steps: [
            { at: 'var work = copyArray(list);', text: 'Sort a copy; the input is left untouched.' },
            { at: 'for (var i = 1; i < work.length; i++)', text: 'Take each item in turn, from the second on.' },
            { at: 'while (j >= 0 && compare(work[j], held) > 0)', text: 'While the item before it sorts later — "> 0", not ">= 0", so equal items never pass each other (stable)…' },
            { at: 'work[j + 1] = work[j];', text: '…slide that item one place right.' },
            { at: 'work[j + 1] = held;', text: 'Drop the held item into the gap.' }
        ] },
        { file: 'js/shop-catalog.js', fn: 'catalogRows', about: 'Search, then sort.', steps: [
            { at: 'var found = linearSearch(inBranch, catalogState.query, searchText);', text: 'Linear search over the products in the chosen branch.' },
            { at: 'return insertionSort(rows, sort.compare);', text: 'Order them with the chosen comparison.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm04', no: 4, part: 2, title: 'Flower Customiser', structure: 'Hash table · Recursion',
    screens: 'The product sheet of a flower bouquet (Rose, Plumeria, Dahlia, Sunflower)',
    files: 'js/core.js (fnv1a) · js/structures.js (hashPut, hashGet) · js/store.js (buildReferenceIndex, makeFlowerItem) · js/algorithms.js (sumRecursive) · js/shop-product.js',
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
        { file: 'js/core.js', fn: 'fnv1a', about: 'Turns text into a 32-bit number (the hash).', steps: [
            { at: 'hash = 2166136261', text: 'Start from the FNV offset basis.' },
            { at: 'hash = hash ^ s.charCodeAt(i);', text: 'Mix in each character with XOR…' },
            { at: 'hash = Math.imul(hash, 16777619) >>> 0;', text: '…then multiply by the FNV prime, kept to 32 bits.' }
        ] },
        { file: 'js/structures.js', fn: 'hashPut', about: 'Inserts or overwrites a key.', steps: [
            { at: 'var chain = table.buckets[hashIndex(table, key)];', text: 'Hash the key to its bucket.' },
            { at: 'if (chain[i].key === key) { chain[i].value = value; return; }', text: 'Key already there: overwrite it (how real photos replace previews).' },
            { at: 'chain[chain.length] = { key: key, value: value };', text: 'Otherwise add it to the end of the chain.' }
        ] },
        { file: 'js/structures.js', fn: 'hashGet', about: 'Looks a key up.', steps: [
            { at: 'var chain = table.buckets[hashIndex(table, key)];', text: 'Go straight to the bucket.' },
            { at: 'if (chain[i].key === key) return chain[i].value;', text: 'Scan the short chain for the exact key.' }
        ] },
        { file: 'js/store.js', fn: 'buildReferenceIndex', about: 'Fills the table with all 160 photos.', steps: [
            { at: 'var table = hashCreate(199);', text: '199 buckets: a prime a little above 160 keeps chains short.' },
            { at: "src: IMG_COLORS + flower + '-' + arrangement + '-' + color + '.jpg',", text: 'Every combination first gets its generated preview…' },
            { at: '{ src: IMG_PRODUCTS + ref.file, real: true });', text: '…then the 14 real photos overwrite their entries.' }
        ] },
        { file: 'js/algorithms.js', fn: 'sumRecursive', about: 'Adds up a list recursively.', steps: [
            { at: 'if (at >= items.length) return 0;', text: 'Base case: the empty rest adds nothing.' },
            { at: 'return (Number(valueOf(items[at])) || 0) + sumRecursive(items, valueOf, at + 1);', text: 'This item plus the sum of the rest.' }
        ] },
        { file: 'js/store.js', fn: 'makeFlowerItem', about: 'Checks the choice and prices it.', steps: [
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
    files: 'js/algorithms.js (breakIntoBills, describeBills) · js/store.js (makeQuoteItem) · js/shop-product.js (billHint)',
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
    outputs: ['The bill suggestion under the amount box, and the "Use N bills" button.', 'A quote item in the cart, labelled "Quote".'],
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
        { file: 'js/algorithms.js', fn: 'breakIntoBills', about: 'Greedy change-making.', steps: [
            { at: 'var remaining = Math.floor(Number(amount) || 0);', text: 'Start with the whole amount.' },
            { at: 'for (var i = 0; i < denominations.length; i++)', text: 'Go through the notes, largest first.' },
            { at: 'var count = Math.floor(remaining / note);', text: 'Take as many of this note as fit.' },
            { at: 'remaining -= note * count;', text: 'Subtract them; move on to the next smaller note.' },
            { at: 'return { bills: bills, remainder: remaining', text: 'Return the bills, what could not be made, and the total count.' }
        ] },
        { file: 'js/shop-product.js', fn: 'billHint', about: 'Turns the result into the hint text.', steps: [
            { at: 'var b = breakIntoBills(amount, DENOMINATIONS);', text: 'Run the greedy break-down.' },
            { at: "return 'Fewest bills: ' + describeBills(b)", text: 'Show the notes and the total.' }
        ] },
        { file: 'js/store.js', fn: 'makeQuoteItem', about: 'Checks a gift and builds its cart item.', steps: [
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
    files: 'js/structures.js (llAppend, llRemove, llUpdate, llEntries) · js/store.js (basketAdd, basketRemove, basketSetQuantity) · js/shop-basket.js',
    data: 'basket — linked list { nodes, head, tail, size }, each node { value, next, live }',
    summary: ['Singly linked list', 'O(1) append · O(n) remove', 'O(n)'],
    business: [
        'Customers collect several items before checking out — a rose bouquet, a picture bouquet — change quantities, and remove things they no longer want, in any order.',
        'The cart must keep the items in the order they were added and remove any one of them cleanly.'
    ],
    inputs: [['Customer picks', '"Add to cart" on a product; + / − on a line; "Remove".'], ['Built by modules 4 and 5', 'The checked item: product, choices, quantity, price.']],
    steps: [
        'Append: the new item becomes a node at the tail; the old tail’s "next" points to it (O(1), thanks to the tail pointer).',
        'Change quantity: replace that node’s value with a copy carrying the new quantity and price.',
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
    demo: ['Add a Rose Bouquet and a Picture Bouquet; open the cart: two lines, in that order.', 'Press + on the first line: its quantity and price update.', 'Remove the first line: the second stays exactly as it was.'],
    shots: [['m06-cart', 'The cart with two lines']],
    trace: 'linkedList', traceTitle: 'the cart’s nodes and links',
    walk: [
        { file: 'js/structures.js', fn: 'llAppend', about: 'Adds a node at the tail.', steps: [
            { at: 'list.nodes[index] = { value: value, next: NIL, live: true };', text: 'Make a node in the next free slot; it points nowhere yet.' },
            { at: 'if (list.head === NIL) list.head = index;', text: 'If the list was empty it becomes the head…' },
            { at: 'else list.nodes[list.tail].next = index;', text: '…otherwise the old tail points to it.' },
            { at: 'list.tail = index;', text: 'It is the new tail.' }
        ] },
        { file: 'js/structures.js', fn: 'llRemove', about: 'Unlinks one node.', steps: [
            { at: 'if (list.head === index) {', text: 'Removing the head: the head moves to the next node.' },
            { at: 'while (prev !== NIL && list.nodes[prev].next !== index) prev = list.nodes[prev].next;', text: 'Otherwise walk to the node before it.' },
            { at: 'list.nodes[prev].next = node.next;', text: 'Skip over it.' },
            { at: 'node.live = false;', text: 'Mark it dead; nothing else moves.' }
        ] },
        { file: 'js/structures.js', fn: 'llEntries', about: 'Walks the list in order.', steps: [
            { at: 'var out = [], cursor = list.head', text: 'Start at the head.' },
            { at: 'cursor = node.next;', text: 'Follow each "next" pointer until NIL.' }
        ] },
        { file: 'js/store.js', fn: 'basketSetQuantity', about: 'Changes a line’s quantity.', steps: [
            { at: 'return llUpdate(basket, index, copyRecord(item, { quantity: quantity, estimate: item.unitEstimate * quantity }));', text: 'Replace the node’s value with a copy carrying the new quantity and price.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm07', no: 7, part: 3, title: 'Checkout & Delivery', structure: 'Hash table · Validation',
    screens: 'Checkout step 2 — contact details, pickup (a date) or delivery (address, courier, date and time)',
    files: 'js/store.js (buildAreaIndex, lookupArea, deliveryQuote, slotLoad, pickupPlacesLeft) · js/orders.js (validateRequest, isValidEmail, isValidPhone) · js/shop-basket.js',
    data: 'areaIndex — hash table, 53 buckets; DELIVERY_AREAS (35 cities with aliases); COURIERS; orders (bookings already taken)',
    summary: ['Hash table (city → area) · character-scan validation', 'O(1) average look-up · O(n²) form check', 'O(n)'],
    business: [
        'At checkout the customer gives their name, email and mobile number and chooses pickup (a date only, Monday to Saturday) or delivery (address, date and time).',
        'The delivery fee depends on the city: free in Brgy. Lawa, ₱20–₱50 for nearby towns the shop delivers to itself (Friday to Sunday), and a courier rate (Flash Express or Lalamove) for Metro Manila and the rest of Bulacan. The fee must be worked out the moment the city is typed, however it is typed.'
    ],
    inputs: [
        ['Customer types / picks', 'Name, email, mobile, pickup or delivery; street, barangay, city; courier; date; delivery time; rush.'],
        ['Stored: DELIVERY_AREAS', '35 cities with aliases, their service (shop or courier) and fee or region.'],
        ['Stored: COURIERS', 'Each courier’s rate per region.'],
        ['Stored: orders', 'Bookings already taken, for time-slot and pickup-day capacity.']
    ],
    steps: [
        'At start-up, put every city name and alias, normalised, into a hash table (53 buckets).',
        'When a city is typed: normalise it ("  QUEZON   city " → "quezon city"), hash it, scan that bucket — the area record in O(1) on average. If "Marilao, Bulacan" is not found, try the part before the comma.',
        'Shop area: the fee is the area’s fee, or free if the barangay is Lawa. Courier area: look up the chosen courier’s rate for the area’s region.',
        'Check everything by scanning characters (no regular expressions): the email format, the mobile number, the date against the lead time, Sundays (pickup) or Friday–Sunday (shop delivery), and the places left that day or time.'
    ],
    ipo: {
        input: ['typed city, barangay, courier', 'chosen date and time'],
        process: ['buildAreaIndex() — hash table', 'lookupArea() → normaliseKey() → hashGet()', 'deliveryQuote() — the fee', 'validateRequest() — the rules'],
        output: ['fee and label ("Shop delivery to Marilao: ₱35")', 'errors under each field', 'a valid order form']
    },
    outputs: ['The fee notice under the address, the courier choices with their rates, the places left for each time or pickup date, and field errors.'],
    nMeaning: 'For the look-up, n = the length of the typed city (to normalise it); the table holds 45 names. For the form check, n = the cart lines (each one’s product is looked up — a loop inside a loop) and the orders (for capacity).',
    justification: [
        'Customers type city names in every possible way. Normalising then hashing turns any spelling into a direct look-up — O(1) on average — instead of comparing the input with all 45 names on every keystroke.',
        'Aliases ("QC", "Sta Maria", "Paranaque") are simply extra keys pointing at the same record, which a hash table handles naturally.',
        'Checking by scanning characters is required by the project rules (no regular expressions) and gives a precise message for each kind of mistake. Fees live in data, not code: the owner can add a city by adding one record.'
    ],
    demo: ['Add a bouquet and check out. Choose Delivery and type "  quezon   CITY ": the courier choices appear with ₱120 / ₱220.', 'Type "Marilao": "Shop delivery to Marilao: ₱35", Friday to Sunday.', 'Choose Pickup: only a date — no time slots — and the places left that day.'],
    shots: [['m07-delivery', 'Delivery to Manila: courier choices with their rates'], ['m07-pickup', 'Pickup: a date only']],
    trace: 'areas', traceTitle: 'the delivery-area look-ups',
    walk: [
        { file: 'js/store.js', fn: 'buildAreaIndex', about: 'Puts every city and alias in the hash table.', steps: [
            { at: 'var table = hashCreate(53);', text: '53 buckets for 45 keys.' },
            { at: 'hashPut(table, normaliseKey(area.city), area);', text: 'The city’s normalised name…' },
            { at: 'hashPut(table, normaliseKey(area.aliases[k]), area);', text: '…and each alias, all pointing at the same record.' }
        ] },
        { file: 'js/store.js', fn: 'lookupArea', about: 'Finds the area for whatever was typed.', steps: [
            { at: 'var found = hashGet(areaIndex, normaliseKey(city));', text: 'Normalise and look up.' },
            { at: "var head = cutText(city, ',')[0];", text: 'Not found? Try the part before a comma ("Marilao, Bulacan").' }
        ] },
        { file: 'js/store.js', fn: 'deliveryQuote', about: 'Works out the fee.', steps: [
            { at: "return { service: 'pickup', fee: 0", text: 'Pickup: free.' },
            { at: 'var free = isIn(area.freeBarangays || [], barangayKey(f.barangay));', text: 'Shop area: free in Brgy. Lawa…' },
            { at: 'service: \'inhouse\', fee: free ? 0 : area.fee', text: '…otherwise the area’s fee.' },
            { at: 'var rate = courierRate(courier.id, area.region);', text: 'Courier area: the chosen courier’s rate for the region.' },
            { at: "status: 'manual'", text: 'No rate on file: the fee must be set by the owner.' }
        ] },
        { file: 'js/orders.js', fn: 'validateRequest', about: 'Checks the checkout form.', steps: [
            { at: "if (!isValidEmail(form.email)) fail('email'", text: 'An email is required — confirmations go there.' },
            { at: "else if (form.date < earliest) fail('date'", text: 'Not earlier than the lead time allows.' },
            { at: "fail('date', 'The shop delivers on '", text: 'Shop deliveries only Friday to Sunday.' },
            { at: "fail('date', 'The shop is closed on Sundays.", text: 'Pickups: Monday to Saturday, by date only.' },
            { at: "fail('city', 'We have no delivery rate for '", text: 'A price-list cart needs a rate on file — it is never turned into a quote.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm08', no: 8, part: 3, title: 'Quotation Desk', structure: 'Circular queue · Insertion sort',
    screens: 'Order desk → "Quote requests" tab, and the quote editor',
    files: 'js/structures.js (cqEnqueue, cqDequeue, cqGrow) · js/orders.js (leaveQueue, quoteHistory, recentQuotes, pastQuoteFrom, quoteDraft, sendQuote) · js/admin-desk.js · js/admin-orders.js',
    data: 'quoteQueue — circular queue of order ids { items, head, tail, count, capacity }; orders (past quotations)',
    summary: ['Circular queue · insertion sort of past quotes', 'O(1) enqueue / dequeue · O(n²) draft', 'O(n)'],
    business: [
        'Quote requests for the five custom gifts arrive while the owner is busy. They must be answered fairly — first come, first served — and pricing each one by hand from scratch is slow.',
        'So requests wait in a first-in, first-out queue, and each quotation is pre-filled from the owner’s own past quotes for the same product and size; usually the owner only checks it and presses send.'
    ],
    inputs: [['Stored: quoteQueue', 'Order ids waiting for a quotation, in arrival order.'], ['Stored: orders', 'Past quotations: product, size, materials, labour, quantity, date.'], ['Owner types', 'Materials, labour and item cost per line; delivery and rush fees; a note.']],
    steps: [
        'A request joins the back of a circular queue (enqueue). The desk lists the queue front to back; the front is next.',
        'Pre-fill: quoteHistory() reads every quoted order once and collects its quoted lines, per piece and without their add-ons; insertion sort puts them newest first. For each line of the request, recentQuotes() walks that list and stops at the first five for the same product and size (or any size, marked); their average, times the quantity, fills the line.',
        'When the quotation is sent, the request leaves the queue — from the front in O(1) when it is the next in line (dequeue) — and the customer is emailed.',
        'When the buffer is full it doubles in size, unrolling so the head is at slot 0.'
    ],
    ipo: {
        input: ['new quote request', 'past quotations'],
        process: ['cqEnqueue() — join the back', 'quoteHistory() — insertion sort, newest first', 'recentQuotes() + pastQuoteFrom() — average of five', 'leaveQueue() — dequeue the front'],
        output: ['ordered list of requests', 'a pre-filled quotation', 'the "quotation ready" email']
    },
    outputs: ['The "Quote requests" tab in order, with position numbers.', 'The quote editor, pre-filled and marked "Filled in from your last N quotes".', 'The quotation email to the customer.'],
    nMeaning: 'For the queue, n = requests waiting. For the pre-fill, n = past quoted lines — every line of every quoted order.',
    justification: [
        'A queue is the fair-service structure: first in, first out. A circular buffer reuses the slots freed at the front, so enqueue and dequeue are O(1) and the array never creeps forward as removing from the front of a plain array would.',
        'Insertion sort puts the past quotes in date order and is stable. The list is read back to front first, so it is already nearly newest first — close to the O(n) best case. The history is built once per draft, so each line of the request searches one list instead of every order again.',
        'Averaging the five most recent quotes follows the owner’s current prices rather than old ones, and pre-filling from the owner’s own history automates the job without inventing prices.'
    ],
    demo: ['Check out a cart with a Money Bouquet: it becomes a quote request.', 'In the order desk, open "Quote requests": it is last in line; SU-220 is first.', 'Press "Prepare quotation": the figures are already filled in from past Money Bouquet quotes. Send it.'],
    shots: [['m08-queue', 'Quote requests, first in first out'], ['m08-editor', 'The quote editor, pre-filled from past quotes']],
    trace: 'queue', traceTitle: 'the quote queue and the pre-fill',
    walk: [
        { file: 'js/structures.js', fn: 'cqEnqueue', about: 'Joins the back of the queue.', steps: [
            { at: 'if (queue.count === queue.capacity) cqGrow(queue);', text: 'Full? Double the buffer first.' },
            { at: 'queue.items[queue.tail] = value;', text: 'Write at the tail…' },
            { at: 'queue.tail = (queue.tail + 1) % queue.capacity;', text: '…and move the tail on, wrapping around with modulo.' }
        ] },
        { file: 'js/structures.js', fn: 'cqDequeue', about: 'Leaves from the front.', steps: [
            { at: 'var value = queue.items[queue.head];', text: 'Read the front.' },
            { at: 'queue.head = (queue.head + 1) % queue.capacity;', text: 'Move the head on, wrapping around.' }
        ] },
        { file: 'js/structures.js', fn: 'cqGrow', about: 'Doubles a full buffer.', steps: [
            { at: 'for (var k = 0; k < queue.count; k++) bigger[k] = queue.items[(queue.head + k) % queue.capacity];', text: 'Copy the items in queue order, so the head lands at slot 0.' }
        ] },
        { file: 'js/orders.js', fn: 'leaveQueue', about: 'Takes an id out when it is quoted or voided.', steps: [
            { at: 'if (cqFront(queue) === id) return cqDequeue(queue) === id;', text: 'Normally it is at the front: O(1) dequeue.' },
            { at: 'return cqRemove(queue, id);', text: 'Otherwise remove it from the middle, keeping the order.' }
        ] },
        { file: 'js/orders.js', fn: 'quoteHistory', about: 'Every quoted line the owner has priced, newest first.', steps: [
            { at: "if (order.id === ignoreId || order.quotedAt === 0 || order.status === 'requested') continue;", text: 'Only orders the owner has already quoted.' },
            { at: 'var base = past.materials - past.estimate;', text: 'Per piece, with the add-ons taken out.' },
            { at: 'return insertionSort(backwards(seen), function (a, b) { return b.stamp - a.stamp || a.seq - b.seq; });', text: 'Read back to front, then insertion sort newest first; lines quoted at the same moment keep their order.' }
        ] },
        { file: 'js/orders.js', fn: 'recentQuotes', about: 'The five most recent quotes for one product.', steps: [
            { at: 'for (var h = 0; h < history.length && out.length < 5; h++)', text: 'Walk the history from the newest, stopping after five.' },
            { at: 'if (line.productId === item.productId && (!sameSize || line.size === item.size)) listAdd(out, line);', text: 'Keep lines of the same product (and size).' }
        ] },
        { file: 'js/orders.js', fn: 'pastQuoteFrom', about: 'What the owner charged before.', steps: [
            { at: 'var recent = recentQuotes(history, item, true), sameSize = recent.length > 0;', text: 'The same size first…' },
            { at: 'if (!sameSize) recent = recentQuotes(history, item, false);', text: '…or any size if there is none.' },
            { at: 'materials: roundMoney(sumRecursive(recent', text: 'Average them.' }
        ] },
        { file: 'js/orders.js', fn: 'sendQuote', about: 'Sends the quotation.', steps: [
            { at: 'var errors = validateQuote(order, draft);', text: 'Every line must be priced; a courier fee must be set.' },
            { at: 'if (!revising) leaveQueue(quoteQueue, order.id);', text: 'Leave the queue.' },
            { at: 'emailQuoteReady(order, stamp);', text: 'Email the customer that it is approved.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm09', no: 9, part: 3, title: 'Payment, Receipts & Email', structure: 'Circular queue (outgoing mail)',
    screens: 'Checkout step 3 (payment), the receipt, Track order (paying a quotation), Order desk → Outbox',
    files: 'js/orders.js (gcashProblem, receiptWithRef, placeOrder, acceptQuote, issueReceipt) · js/notify.js (queueEmail) · js/mail.js (drainMail) · js/email-config.js',
    data: 'receipts — array of snapshots; outbox — array of emails; mailQueue — circular queue of outbox positions; EMAIL_CONFIG',
    summary: ['Circular queue (mail) · linear search for used references', 'O(1) per email · O(n) reference check', 'O(n)'],
    business: [
        'The shop takes only two payments: a 50% down payment or full payment, both by GCash with the 13-digit reference number. Every payment needs a receipt, and the customer must be told by email: order confirmed (with the tracking number), quotation ready, payment received, ready for pickup, cancelled.',
        'A GCash reference can only pay once. Emails must go out in the order they were written, and none may be lost if the connection drops.'
    ],
    inputs: [['Customer picks / types', '50% or 100%; the GCash reference number.'], ['Stored: the order', 'Lines, totals, customer email.'], ['Stored: receipts', 'Every reference already used.'], ['Stored: EMAIL_CONFIG', 'The EmailJS IDs (blank = emails kept in the Outbox, marked "not sent").']],
    steps: [
        'Check the reference: 13 digits, and not already on any receipt (a linear search).',
        'Price-list cart: place the order and take the payment in one step; if anything fails, no order is left behind.',
        'Record the payment; take a snapshot of the order into a numbered receipt (OR-0001…), so later edits never change it.',
        'Write the email, store it in the outbox array and put its position in a circular queue. Every 1.5 s the sender takes the front of the queue and posts it to EmailJS, one at a time, marking it sent or failed.'
    ],
    ipo: {
        input: ['payment choice + GCash reference', 'the order'],
        process: ['gcashProblem() — 13 digits, unused', 'acceptQuote() / placeOrder()', 'issueReceipt() — snapshot', 'queueEmail() → cqEnqueue(); drainMail() → cqDequeue()'],
        output: ['a paid order in production', 'a receipt', 'an email sent or kept in the Outbox']
    },
    outputs: ['The receipt (printable) with paid and outstanding amounts.', 'The "Order confirmed" screen with the tracking number.', 'Emails to the customer, and the Outbox tab listing each one.'],
    nMeaning: 'For the reference check, n = receipts so far. For the queue, n = emails waiting. For a receipt, n = the order’s lines.',
    justification: [
        'Emails must leave in the order they were written ("confirmed" before "ready"), and only one may be in flight at a time — a first-in, first-out queue is exactly that. The circular buffer keeps enqueue and dequeue O(1).',
        'Receipts are snapshots (copies), not live views of the order, because a receipt records what was paid at that moment.',
        'Checking the reference against every receipt is a linear search, O(n); with a few hundred receipts a year that is instant and needs no extra index.'
    ],
    demo: ['Add a Rose Bouquet, check out with pickup, choose "100% Full Payment via GCash", enter 1234567890123 and place the order.', 'The receipt opens; the confirmation shows the tracking number.', 'Try to pay another order with the same reference: refused.', 'In the order desk, open "Outbox": the "Order confirmed" email is there.'],
    shots: [['m09-pay', 'Checkout: the two GCash payments'], ['m09-receipt', 'The receipt'], ['m09-outbox', 'The Outbox']],
    trace: 'payment', traceTitle: 'a payment, its receipt and its email',
    walk: [
        { file: 'js/orders.js', fn: 'gcashProblem', about: 'The checks every payment shares.', steps: [
            { at: "if (!isValidGcashRef(gcashRef)) return 'Enter the 13-digit GCash reference number.';", text: 'Exactly 13 digits.' },
            { at: 'var used = receiptWithRef(gcashRef);', text: 'Not already used on a receipt.' }
        ] },
        { file: 'js/orders.js', fn: 'placeOrder', about: 'Checkout for a price-list cart: place and pay in one step.', steps: [
            { at: 'var errors = validateRequest(form, items, isoFromStamp(stamp));', text: 'Check the form first.' },
            { at: 'var problem = gcashProblem(gcashRef);', text: 'Check the payment before anything is created.' },
            { at: 'var made = submitRequest(form, stamp);', text: 'Create the order (priced automatically).' },
            { at: 'var paid = acceptQuote(made.order.id, methodId, gcashRef, stamp);', text: 'Take the payment.' },
            { at: "voidOrder(made.order.id, 'Payment could not be recorded'", text: 'Never leave a half-made order.' }
        ] },
        { file: 'js/orders.js', fn: 'acceptQuote', about: 'Records the payment.', steps: [
            { at: 'if (stamp - order.quotedAt > QUOTE_EXPIRY_DAYS', text: 'An expired quotation cannot be paid.' },
            { at: 'order.amountPaid = method.share === 1 ? total : roundMoney(total * method.share);', text: 'Full or half of the total.' },
            { at: 'enterProduction(order);', text: 'Into the production line (module 10).' },
            { at: 'var receipt = issueReceipt(order', text: 'Issue the receipt…' },
            { at: 'emailOrderConfirmed(order, receipt, stamp);', text: '…and the confirmation email.' }
        ] },
        { file: 'js/orders.js', fn: 'issueReceipt', about: 'Snapshots the order into a receipt.', steps: [
            { at: "no: 'OR-' + leftPad(counters.receipt, 4, '0'),", text: 'The next receipt number.' },
            { at: 'balance: orderBalance(order), status: paymentStatus(order)', text: 'Paid to date, balance and status, as they are now.' }
        ] },
        { file: 'js/notify.js', fn: 'queueEmail', about: 'Writes an email and queues it.', steps: [
            { at: "if (!mailEnabled || !isValidEmail(to) || textHas(toLower(to), '@example.com')) return null;", text: 'Never email the demo customers.' },
            { at: 'listAdd(outbox, record);', text: 'Keep it in the outbox…' },
            { at: 'cqEnqueue(mailQueue, outbox.length - 1);', text: '…and queue its position for sending.' }
        ] },
        { file: 'js/mail.js', fn: 'drainMail', about: 'Sends the queue, one at a time.', steps: [
            { at: 'var record = outbox[cqDequeue(mailQueue)];', text: 'Take the front of the queue.' },
            { at: "record.status = 'simulated';", text: 'EmailJS not set up: keep it, marked "not sent".' },
            { at: 'fetch(EMAILJS_URL, {', text: 'Otherwise post it to EmailJS.' },
            { at: "record.status = response.ok ? 'sent' : 'failed';", text: 'Mark the result; then send the next one.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm10', no: 10, part: 4, title: 'Production & Tracking', structure: 'Min-heap · Circular queue · Binary search',
    screens: 'Order desk → "In production" tab and "Mark ready"; Track order on the shop',
    files: 'js/structures.js (heapInsert, heapSiftUp, heapExtractMin, heapCompare) · js/orders.js (enterProduction, productionLine, completeNext, orderById, customerLookup) · js/algorithms.js (binarySearch)',
    data: 'rushLane — min-heap keyed (due date, arrival); standardLane — circular queue; orders — array sorted by order number',
    summary: ['Min-heap · circular queue · binary search', 'O(log n) heap · O(1) queue · O(log n) find', 'O(n)'],
    business: [
        'Paid orders must be made in the right order. Rush orders (₱50 extra, ready next day) go first, earliest due date first. Regular orders are made in the order they were paid. An order still owing a balance cannot be released, but it must not hold up the paid orders behind it.',
        'Customers check their order with the tracking number (e.g. SU-215) and their mobile number or email, so the shop needs to find an order by number quickly.'
    ],
    inputs: [['Stored: rushLane (heap), standardLane (queue)', 'Order ids in production.'], ['Stored: orders', 'In ascending order-number order.'], ['Customer types', 'Tracking number and mobile number or email.'], ['Owner presses', '"Mark ready".']],
    steps: [
        'Paid rush order: insert it into a min-heap keyed by (due date, arrival number) — it sifts up past later dates. Paid standard order: enqueue it.',
        'Mark ready: walk the line (heap order, then queue order) to the first order that is fully paid; take it out (the heap minimum or the queue front in the usual case) and email the customer. Listing the line in heap order sorts a copy of the heap’s array by the same key with insertion sort; the heap itself is untouched.',
        'Tracking: orders are numbered in increasing order and only ever appended, so the array is already sorted — binary search halves the range at each step.'
    ],
    ipo: {
        input: ['paid order', '"Mark ready"', 'tracking number'],
        process: ['heapInsert() / cqEnqueue()', 'nextReleasable() → heapExtractMin() / cqDequeue()', 'binarySearch() on order numbers'],
        output: ['the production line, in order', 'order released + "ready" email', 'the customer’s order page']
    },
    outputs: ['The "In production" tab with positions, rush badges and the "Mark ready" button.', 'The customer’s tracking page with the timeline.'],
    nMeaning: 'For the heap and the queue, n = orders in production. For binary search, n = all orders.',
    justification: [
        'A min-heap always gives the earliest due date, in O(log n) per insert or removal — keeping a sorted list instead would cost O(n) per insert. Adding the arrival number to the key makes it stable: equal dates are served in the order they were paid.',
        'Standard orders are fair first-in, first-out: a circular queue, O(1) at both ends.',
        'Binary search finds an order among n in O(log n) — about 10 steps for 1,000 orders — and costs nothing extra because order numbers are handed out in increasing order.'
    ],
    demo: ['In the order desk, open "In production": rush orders first, then standard.', 'Press "Mark ready": the first fully paid order is released and the customer emailed; an order owing a balance keeps its place.', 'On the shop, press "Track order" and enter SU-201 with 0917 555 0142.'],
    shots: [['m10-production', 'The production line'], ['m10-track', 'Tracking an order']],
    trace: 'heap', traceTitle: 'the rush heap and the order search',
    walk: [
        { file: 'js/structures.js', fn: 'heapInsert', about: 'Adds an order to the rush lane.', steps: [
            { at: 'heap.items[heap.size] = { value: value, priority', text: 'Put it at the end of the array (the next leaf).' },
            { at: 'heapSiftUp(heap, heap.size - 1);', text: 'Sift it up while it beats its parent.' }
        ] },
        { file: 'js/structures.js', fn: 'heapSiftUp', about: 'Restores the heap upward.', steps: [
            { at: 'var parent = Math.floor((child - 1) / 2);', text: 'The parent of index i is (i − 1) ÷ 2.' },
            { at: 'if (heapCompare(heap.items[child], heap.items[parent]) >= 0) break;', text: 'Stop once the parent is not later.' },
            { at: 'heapSwap(heap, child, parent);', text: 'Otherwise swap and continue upward.' }
        ] },
        { file: 'js/structures.js', fn: 'heapExtractMin', about: 'Removes the earliest-due order.', steps: [
            { at: 'var top = heap.items[0];', text: 'The minimum is always at the root.' },
            { at: 'heap.items[0] = heap.items[heap.size];', text: 'Move the last leaf to the root…' },
            { at: 'if (heap.size > 0) heapSiftDown(heap, 0);', text: '…and sink it to its place.' }
        ] },
        { file: 'js/structures.js', fn: 'heapCompare', about: 'Which order goes first.', steps: [
            { at: 'if (a.priority !== b.priority) return a.priority - b.priority;', text: 'Earlier due date first…' },
            { at: 'return a.seq - b.seq;', text: '…then whoever paid first.' }
        ] },
        { file: 'js/orders.js', fn: 'completeNext', about: '"Mark ready".', steps: [
            { at: 'var order = nextReleasable();', text: 'The first fully paid order in line.' },
            { at: 'if (heapPeek(rushLane) === order.id) heapExtractMin(rushLane);', text: 'Rush: usually the heap minimum.' },
            { at: 'leaveQueue(standardLane, order.id);', text: 'Standard: usually the queue front.' },
            { at: 'stackPush(completedStack, { id: order.id, position: position });', text: 'Remember it for undo (module 11).' },
            { at: 'emailOrderReady(order, stamp);', text: 'Email "ready for pickup / on its way".' }
        ] },
        { file: 'js/algorithms.js', fn: 'binarySearch', about: 'Finds an order by number.', steps: [
            { at: 'var mid = Math.floor((low + high) / 2);', text: 'Look at the middle.' },
            { at: 'if (key === target) return mid;', text: 'Found.' },
            { at: 'if (key < target) low = mid + 1;', text: 'Too small: search the right half…' },
            { at: 'else high = mid - 1;', text: '…too big: search the left half.' }
        ] },
        { file: 'js/orders.js', fn: 'customerLookup', about: 'Shows an order only to its customer.', steps: [
            { at: 'var order = orderByRef(ref);', text: 'Binary search by number.' },
            { at: 'return byEmail || byPhone ? order : null;', text: 'Only if the mobile number or email matches.' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm11', no: 11, part: 4, title: 'Order Records', structure: 'Stack · Insertion sort',
    screens: 'Order desk → "Completed" and "Voided" tabs; "Undo last" in production',
    files: 'js/structures.js (stackPush, stackPop) · js/orders.js (completeNext, undoCompletion, completedByDate, voidOrder, expireQuotes)',
    data: 'completedStack — stack of { id, position }; orders (completion and void times, reasons)',
    summary: ['Stack (undo) · insertion sort by date', 'O(1) push / pop · O(n) sort when nearly in order', 'O(n)'],
    business: [
        'Every finished order must be kept with all its details, organised by date. Cancelled orders are kept too, marked "VOIDED – NON-REFUNDABLE", never deleted. Quotations the customer never pays are cancelled automatically after three days.',
        'People make mistakes: if the owner marks the wrong order ready, they need to undo it — and the order must go back exactly where it was.'
    ],
    inputs: [['Stored: orders', 'Completion and void times, reasons, payments.'], ['Stored: completedStack', 'The completions made this session, newest on top.'], ['Owner presses', '"Undo last"; "Void" with a reason.'], ['The clock', 'Every minute, for expiring quotations.']],
    steps: [
        'Each "Mark ready" pushes { order, its place in line } onto a stack.',
        'Undo pops the top — the most recent completion — and puts the order back: into the heap with its original key, or into the queue at its old position.',
        'Completed orders: read the list back to front (it is kept oldest first), insertion sort it by completion time, newest first, then group consecutive orders of the same day with a day total.',
        'Voiding takes the order out of its queue or lane, keeps the record and any payment, and emails the customer. Every minute, quotations older than three days are voided by "System".'
    ],
    ipo: {
        input: ['"Mark ready" / "Undo last"', 'completed and voided orders'],
        process: ['stackPush() / stackPop()', 'insertionSort() by date + group by day', 'voidOrder(), expireQuotes()'],
        output: ['Completed tab grouped by day', 'Voided tab', 'order back in line after undo']
    },
    outputs: ['The "Completed" tab (days with totals; each order opens in full).', 'The "Voided" tab with reason, who and when.', 'The cancellation email.'],
    nMeaning: 'n = number of orders (completed or voided); for the stack, n = completions this session.',
    justification: [
        'Undo is last in, first out by nature — you undo the most recent action first — which is exactly a stack, O(1) push and pop.',
        'Storing the position with each completion means undo restores the order exactly, not just "somewhere in production".',
        'Insertion sort gives a stable date order. Orders are completed mostly in the order they were placed, so reading the oldest-first array back to front leaves it nearly newest first already: the sort runs close to its O(n) best case (15 comparisons for 15 orders, instead of the worst case of 105). Grouping consecutive same-day orders is then a single O(n) pass.'
    ],
    demo: ['In "In production" press "Mark ready", then "Undo last": the order is back at its place.', 'Open "Completed": orders grouped by day, newest first, each with a day total.', 'Void an order awaiting payment: it moves to "Voided" as VOIDED – NON-REFUNDABLE.'],
    shots: [['m11-completed', 'Completed orders grouped by day'], ['m11-voided', 'Voided orders kept on record']],
    trace: 'stack', traceTitle: 'undo and the records by date',
    walk: [
        { file: 'js/structures.js', fn: 'stackPush', about: 'Pushes onto the stack.', steps: [
            { at: 'stack.top++;', text: 'Move the top up one…' },
            { at: 'stack.items[stack.top] = value;', text: '…and store the value there.' }
        ] },
        { file: 'js/structures.js', fn: 'stackPop', about: 'Pops the top.', steps: [
            { at: 'if (stack.top === NIL) return null;', text: 'Empty: nothing to undo.' },
            { at: 'var value = stack.items[stack.top];', text: 'Take the top value…' },
            { at: 'stack.top--;', text: '…and move the top down.' }
        ] },
        { file: 'js/orders.js', fn: 'undoCompletion', about: 'Undo the last "Mark ready".', steps: [
            { at: 'var entry = stackPop(completedStack);', text: 'The most recent completion.' },
            { at: 'heapInsert(rushLane, order.id, dueKey(order), order.laneSeq);', text: 'Rush: back in the heap with its original key.' },
            { at: 'if (entry.position <= 0) cqRequeueFront(standardLane, order.id);', text: 'Standard: back at the front…' },
            { at: 'else cqInsertAt(standardLane, entry.position, order.id);', text: '…or at its old place if it was released from behind an order still owing.' }
        ] },
        { file: 'js/orders.js', fn: 'completedByDate', about: 'Completed orders by day.', steps: [
            { at: "var sorted = insertionSort(backwards(ordersWithStatus('completed')), function (a, b) { return b.completedAt - a.completedAt || a.id - b.id; });", text: 'Read back to front, then insertion sort newest first — nearly in order already.' },
            { at: 'if (!last || last.date !== day) {', text: 'A new day starts a new group…' },
            { at: 'last.total = roundMoney(last.total + orderTotal(sorted[i]));', text: '…and the day total grows.' }
        ] },
        { file: 'js/orders.js', fn: 'voidOrder', about: 'Cancels, but keeps the record.', steps: [
            { at: 'if (order.status === \'requested\') leaveQueue(quoteQueue, order.id);', text: 'Leave the quote queue…' },
            { at: 'if (order.status === \'paid\') leaveProduction(order);', text: '…or the production line.' },
            { at: "order.status = 'voided';", text: 'Marked VOIDED – NON-REFUNDABLE; payments are retained.' },
            { at: 'emailOrderVoided(order, stamp);', text: 'Tell the customer.' }
        ] },
        { file: 'js/orders.js', fn: 'expireQuotes', about: 'The automatic clean-up.', steps: [
            { at: "var stale = keepWhere(orders, function (o) { return o.status === 'quoted' && now - o.quotedAt > limit; });", text: 'Quotations unpaid for more than three days…' },
            { at: "voidOrder(stale[i].id, 'Quotation expired", text: '…are voided by "System".' }
        ] }
    ]
},

/* ===================================================================== */
{
    id: 'm12', no: 12, part: 4, title: 'Order Desk', structure: 'Two-step sign-in · Bucketing by date',
    screens: 'index.html#admin — sign-in, the six-digit code, the Overview (daily, monthly, yearly)',
    files: 'js/admin-signin.js (deskSignIn, issueOtp, verifyOtp) · js/core.js (fnv1a) · js/reports.js (bucketOf, tallyPeriods, periodReport) · js/admin-overview.js',
    data: 'ADMIN_PASS_HASH and EMAIL_CONFIG.adminEmail; deskState (tries, lock, the code’s hash); orders and receipts',
    summary: ['FNV-1a hash compare · one-pass bucketing by date', 'O(n) sign-in · O(n²) report', 'O(n)'],
    business: [
        'The owner runs the shop from the order desk, at index.html#admin — linked from nowhere on the shop. It needs a sign-in: email and password, then a six-digit code sent to the owner’s email (two-step verification).',
        'Once in, the Overview answers "how is the shop doing?" for any day, month or year: money collected, sales, orders placed, pieces sold, orders made ready, voids, and that period’s best sellers. The owner can also edit any order or product.'
    ],
    inputs: [['Owner types', 'Email, password, the emailed code; a day, month or year.'], ['Stored: ADMIN_PASS_HASH, EMAIL_CONFIG.adminEmail', 'The password’s hash and the owner’s email.'], ['Stored: orders, receipts', 'Everything the Overview counts.']],
    steps: [
        'Sign-in: compare the email exactly and the password by its FNV-1a hash; five wrong tries lock the desk for 30 seconds.',
        'Two-step: make a random six-digit code, keep only its hash, email it; it lasts five minutes, allows three tries, and a new one can be sent after 30 seconds (three per sign-in).',
        'Overview: a period is a key "2026-10-05", "2026-10" or "2026", and a record falls in it when its date begins with the key. For the breakdown, bucketOf() reads the day (month view) or the month (year view) straight off the record’s date and uses it as the row number, so one pass over the orders and receipts fills every row.'
    ],
    ipo: {
        input: ['email + password', 'six-digit code', 'period (day / month / year)'],
        process: ['deskSignIn() — hash compare + lock-out', 'issueOtp() / verifyOtp()', 'periodReport() → tallyPeriods() → bucketOf()'],
        output: ['the order desk opens', 'Overview figures, breakdown, best sellers']
    },
    outputs: ['The sign-in and code screens.', 'The Overview: figure cards, day-by-day or month-by-month table, best sellers.', 'The tabs: quote requests, payments, production, completed, voided, products, outbox.'],
    nMeaning: 'For hashing, n = characters of the password or code. For the Overview, n = orders and receipts — and each order’s lines are added up (a loop inside a loop).',
    justification: [
        'Storing hashes (not the password or the code) means the page never holds them as text. Codes expire and are limited in tries, so guessing is impractical. This keeps customers off the desk; real security needs a server, because anyone can read a browser-only site’s code.',
        'Every date in the system is "YYYY-MM-DD", so "is this in October 2026?" is "does it begin with 2026-10?" — one rule handles days, months and years, and a year is the sum of its months.',
        'Reading each record’s own day or month as its row number fills all 31 rows of a month in one pass, instead of scanning every order again for each row.'
    ],
    demo: ['Open index.html#admin. Sign in with {OWNER} and admin123.', 'Enter the six-digit code (emailed; shown on screen while EmailJS is not set up).', 'The Overview opens on today. Switch to Monthly, then Yearly; use ‹ › to move.'],
    shots: [['m12-login', 'Step 1: email and password'], ['m12-code', 'Step 2: the six-digit code'], ['m12-overview', 'The Overview, monthly']],
    trace: 'desk', traceTitle: 'the sign-in and the Overview',
    walk: [
        { file: 'js/admin-signin.js', fn: 'deskSignIn', about: 'Step 1: email and password.', steps: [
            { at: 'if (now < deskState.lockedUntil) {', text: 'Locked? Say how long.' },
            { at: 'var emailOk = toLower(strip(email)) === toLower(strip(EMAIL_CONFIG.adminEmail));', text: 'The email must match exactly.' },
            { at: 'if (emailOk && fnv1a(password) === ADMIN_PASS_HASH) {', text: 'The password is compared by its hash.' },
            { at: 'deskState.lockedUntil = now + ADMIN_LOCK_MS;', text: 'Five misses lock the desk for 30 seconds.' }
        ] },
        { file: 'js/admin-signin.js', fn: 'issueOtp', about: 'Makes a code.', steps: [
            { at: 'var code = otpCode();', text: 'Six random digits from the browser’s secure random source.' },
            { at: 'deskState.otp = { hash: fnv1a(code), expires: now + OTP_LIFETIME_MS, tries: 0, sentAt: now };', text: 'Keep only its hash, its expiry and a try counter.' }
        ] },
        { file: 'js/admin-signin.js', fn: 'verifyOtp', about: 'Step 2: the code.', steps: [
            { at: "if (now > otp.expires) { deskState.otp = null; return 'That code has expired. Send a new one.'; }", text: 'Expired after five minutes.' },
            { at: 'if (fnv1a(digitsOnly(code)) === otp.hash', text: 'Right code: signed in.' },
            { at: 'otp.tries++;', text: 'Wrong code: one try fewer (three in all).' }
        ] },
        { file: 'js/reports.js', fn: 'bucketOf', about: 'Which row a moment belongs to.', steps: [
            { at: 'if (!beginsWith(iso, key)) return -1;', text: 'Outside the period: no row.' },
            { at: "if (part === 'day') return readNumber(iso, 8, 10) - 1;", text: 'Month view: the day of the month is the row.' },
            { at: "if (part === 'month') return readNumber(iso, 5, 7) - 1;", text: 'Year view: the month is the row.' }
        ] },
        { file: 'js/reports.js', fn: 'tallyPeriods', about: 'One pass fills every row.', steps: [
            { at: 'var order = orders[o], at = bucketOf(order.createdAt, key, part);', text: 'Each order goes straight to its row…' },
            { at: 't.units += sumRecursive(order.items', text: '…adding its pieces if it was paid.' },
            { at: 'at = bucketOf(receipts[r].stamp, key, part);', text: 'Money collected: each receipt to its row.' }
        ] },
        { file: 'js/reports.js', fn: 'periodReport', about: 'The whole Overview for a period.', steps: [
            { at: "part = 'month';", text: 'A year: twelve month rows…' },
            { at: "part = 'day';", text: '…a month: one row per day.' },
            { at: 'tallyPeriods(buckets, key, part);', text: 'One pass over the orders and receipts fills them all.' },
            { at: 'best: topSellers(salesTally(function (o) { return inPeriod(o.createdAt, key); }), 5)', text: 'The period’s best sellers (module 1).' }
        ] }
    ]
}
];

module.exports = {
    PARTS: PARTS, SYSTEM: SYSTEM, COUNTING: COUNTING, MODULES: MODULES,
    GENERAL_QUESTIONS: GENERAL_QUESTIONS, GLOSSARY: GLOSSARY, FILE_MAP: FILE_MAP
};
