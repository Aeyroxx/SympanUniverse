/* =========================================================================
   BACKEND · STATE  (ito ang "database" ng site)
   Lahat ng array at structure na hawak ng shop habang bukas ang page.
   Walang localStorage at walang server: pag ni-reload, uulit sa demo
   history. Nandito rin ang mga hanap sa reference data (linear scan).
   ========================================================================= */

var products = [];             // mga product, pwedeng i-edit ng desk
var orders = [];               // lahat ng order, pataas ayon sa id
var receipts = [];             // lahat ng resibo, pataas ayon sa number
var basket = llCreate();       // cart ng customer (linked list)
var quoteQueue = cqCreate(8);  // mga order na naghihintay ng quotation (FIFO)
var rushLane = heapCreate();   // bayad na rush orders, pinakamaagang due date muna
var standardLane = cqCreate(8);// bayad na standard orders, unang nagbayad unang gagawin
var completedStack = stackCreate(); // mga na-release, pinakabago sa ibabaw, para sa undo
var categoryTree = null;       // n-ary tree ng mga category
var areaIndex = null;          // hash table: city -> delivery area
var referenceIndex = null;     // hash table: flower|arrangement|colour -> litrato
var counters = { order: 201, receipt: 1, mail: 1, log: 1 };
var outbox = [];               // lahat ng email ng shop, pinakaluma muna
var auditLog = [];             // security at audit events, pinakaluma muna (sa dulo lang nadadagdag)
var failedSignIns = hashCreate(17); // hash table: email na tinype -> maling password, pause
var codeSends = hashCreate(17);    // hash table: email -> ilang code ngayong oras
var staffAccounts = [];        // mga account ng desk, pataas ayon sa id
var staffEmailIndex = hashCreate(17); // hash table: email ng account -> id
var mailQueue = cqCreate(8);   // mga email na naghihintay i-send (FIFO)
var mailEnabled = false;       // naka-off habang pinapatakbo ang demo history

// Ginagawa ulit lahat ng structures galing sa seed data.
// Time O(n²) · Space O(n)
function storeInit() {
    products = [];
    for (var i = 0; i < PRODUCT_SEED.length; i++) listAdd(products, productFromSeed(PRODUCT_SEED[i]));
    orders = [];
    receipts = [];
    basket = llCreate();
    quoteQueue = cqCreate(8);
    rushLane = heapCreate();
    standardLane = cqCreate(8);
    completedStack = stackCreate();
    counters = { order: 201, receipt: 1, mail: 1, log: 1 };
    outbox = [];
    auditLog = [];
    failedSignIns = hashCreate(17);
    codeSends = hashCreate(17);
    buildAccounts();
    mailQueue = cqCreate(8);
    mailEnabled = false;
    categoryTree = treeFromOutline('All gifts', CATEGORY_OUTLINE);
    areaIndex = buildAreaIndex();
    referenceIndex = buildReferenceIndex();
}

// ---------- Hanap sa reference data ----------

// Hanap sa array gamit yung id, linear search.
// Time O(n) · Space O(1)
function byId(list, id) {
    return firstWhere(list, function (record) { return record.id === id; });
}

// Kulay gamit yung id.
// Time O(n) · Space O(1)
function colorById(id) { return byId(COLORS, id); }

// Arrangement gamit yung id.
// Time O(n) · Space O(1)
function arrangementById(id) { return byId(ARRANGEMENTS, id); }

// Quote type gamit yung id.
// Time O(n) · Space O(1)
function quoteTypeById(id) { return byId(QUOTE_TYPES, id); }

// Add-on gamit yung id.
// Time O(n) · Space O(1)
function addonById(id) { return byId(ADDONS, id); }

// Payment method gamit yung id.
// Time O(n) · Space O(1)
function paymentById(id) { return byId(PAYMENT_METHODS, id); }

// Courier gamit yung id.
// Time O(n) · Space O(1)
function courierById(id) { return byId(COURIERS, id); }

// Pickup o delivery gamit yung id.
// Time O(n) · Space O(1)
function modeById(id) { return byId(FULFILMENT_MODES, id); }
