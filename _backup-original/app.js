// --- SYMPAN UNIVERSE: ARRAY-BASED DATA STRUCTURES ---

let catalog = [
    { id: 101, name: "Ribbon Rose (Round)", type: "regular", price: 430, sales: 125, category: "Ribbon Bouquets", occasion: "Anniversary" },
    { id: 102, name: "Ribbon Plumeria (Layered)", type: "regular", price: 210, sales: 90, category: "Ribbon Bouquets", occasion: "Birthday" },
    { id: 103, name: "Ribbon Dahlia (Round)", type: "regular", price: 490, sales: 50, category: "Ribbon Bouquets", occasion: "Graduation" },
    { id: 104, name: "Money Bouquet Base", type: "money", price: 500, sales: 210, category: "Other Bouquets", occasion: "Birthday" },
    { id: 105, name: "Makeup Bouquet", type: "regular", price: 1000, sales: 35, category: "Gift Cakes", occasion: "Anniversary" },
    { id: 106, name: "Diaper Cake", type: "regular", price: 800, sales: 18, category: "Gift Cakes", occasion: "Baby Shower" }
];

let linkedList = [], headPtr = -1; 
let orderQueue = [], queueHead = 0, queueTail = 0; 
let minHeap = [], heapSize = 0; 
let historyStack = [], topPtr = -1; 
let pickupSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"], bookedSlots = [];
let orderCounter = 214; 

function saveState() {
    localStorage.setItem('sympan_sys', JSON.stringify({ linkedList, headPtr, orderQueue, queueHead, queueTail, minHeap, heapSize, historyStack, topPtr, bookedSlots, orderCounter }));
}

function loadState() {
    let d = JSON.parse(localStorage.getItem('sympan_sys'));
    if (!d) {
        // PRE-POPULATED DATA (Para may laman agad ang system)
        orderQueue = [
            { id: 212, name: "Aizel Esteban", slot: "09:00 AM", time: 30 },
            { id: 213, name: "Jollina Garcia", slot: "11:00 AM", time: 30 }
        ];
        queueTail = 2;
        minHeap = [ { priority: 1, order: { id: 214, name: "Durden Sebastian", slot: "02:00 PM", time: 15 } } ];
        heapSize = 1;
        historyStack = [ { id: 210, name: "Ellain Roque", slot: "09:00 AM", time: 30 }, { id: 211, name: "Ralph Richard", slot: "09:00 AM", time: 15 } ];
        topPtr = 1;
        orderCounter = 214;
        saveState();
    } else {
        linkedList = d.linkedList||[]; headPtr = d.headPtr!==-1?d.headPtr:-1;
        orderQueue = d.orderQueue||[]; queueHead = d.queueHead||0; queueTail = d.queueTail||0;
        minHeap = d.minHeap||[]; heapSize = d.heapSize||0;
        historyStack = d.historyStack||[]; topPtr = d.topPtr!==-1?d.topPtr:-1;
        bookedSlots = d.bookedSlots||[]; orderCounter = d.orderCounter||214;
    }
}

let occasionHash = [[], [], [], [], []];
function hashString(str) {
    let total = 0; for(let i=0; i<str.length; i++) total += str.charCodeAt(i);
    return total % 5;
}
for(let i=0; i<catalog.length; i++) {
    let idx = hashString(catalog[i].occasion);
    let chain = occasionHash[idx];
    chain[chain.length] = catalog[i];
}
function getByOccasion(occ) {
    let idx = hashString(occ), chain = occasionHash[idx], res = [];
    for(let i=0; i<chain.length; i++) if(chain[i].occasion === occ) res[res.length] = chain[i];
    return res;
}
function getByCategory(catName) {
    let res = [];
    for(let i=0; i<catalog.length; i++) if(catalog[i].category === catName) res[res.length] = catalog[i];
    return res;
}

function mergeSort(arr, key) {
    if (arr.length <= 1) return arr;
    let mid = Math.floor(arr.length / 2), left = [], right = [];
    for(let i=0; i<mid; i++) left[i] = arr[i];
    for(let i=mid; i<arr.length; i++) right[i - mid] = arr[i];
    return merge(mergeSort(left, key), mergeSort(right, key), key);
}
function merge(left, right, key) {
    let result = [], i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        if (left[i][key] <= right[j][key]) result[k++] = left[i++];
        else result[k++] = right[j++];
    }
    while (i < left.length) result[k++] = left[i++];
    while (j < right.length) result[k++] = right[j++];
    return result;
}

function addToCart(name, price, notes) {
    let newNodeIdx = linkedList.length;
    linkedList[newNodeIdx] = { name: name, price: price, notes: notes, qty: 1, next: -1, active: true };
    if (headPtr === -1) headPtr = newNodeIdx;
    else {
        let curr = headPtr;
        while (linkedList[curr].next !== -1) curr = linkedList[curr].next;
        linkedList[curr].next = newNodeIdx;
    }
    saveState(); renderCart(); alert("Item added to Cart!");
}
function removeCartItem(index) {
    linkedList[index].active = false;
    if (headPtr === index) headPtr = linkedList[index].next;
    else {
        let current = headPtr;
        while (current !== -1 && linkedList[current].next !== index) current = linkedList[current].next;
        if (current !== -1) linkedList[current].next = linkedList[index].next;
    }
    saveState(); renderCart();
}

function submitOrderForm(customerName, slotIndex, isVIP) {
    let slot = pickupSlots[slotIndex], slotTaken = false;
    for(let i=0; i<bookedSlots.length; i++) if(bookedSlots[i].slot === slot && bookedSlots[i].date === new Date().toDateString()) slotTaken = true;
    if(slotTaken) return alert(`Slot ${slot} is full! Select another.`);
    if(headPtr === -1) return alert("Your cart is empty.");
    
    orderCounter++;
    let newOrder = { id: orderCounter, name: customerName, slot: slot, time: isVIP ? 15 : 30 };
    bookedSlots[bookedSlots.length] = { slot: slot, date: new Date().toDateString() };
    
    if(isVIP) {
        let node = { order: newOrder, priority: 1 };
        minHeap[heapSize] = node;
        let curr = heapSize;
        while (curr > 0) {
            let parent = Math.floor((curr - 1) / 2);
            if (minHeap[curr].priority >= minHeap[parent].priority) break;
            let temp = minHeap[curr]; minHeap[curr] = minHeap[parent]; minHeap[parent] = temp;
            curr = parent;
        }
        heapSize++;
    } else orderQueue[queueTail++] = newOrder;
    
    linkedList = []; headPtr = -1;
    saveState(); renderCart();
    alert(`Success! Order #${newOrder.id} submitted to Queue.`);
}

function calculateDenominations(amount) {
    let denoms = [1000, 500, 200, 100, 50, 20], counts = [0,0,0,0,0,0], remain = amount, str = "";
    for (let i = 0; i < denoms.length; i++) {
        while (remain >= denoms[i]) { counts[i]++; remain -= denoms[i]; }
        if(counts[i] > 0) str += `[P${denoms[i]}x${counts[i]}] `;
    }
    return str;
}
function calcRecursion(arr, idx) {
    if (idx >= arr.length) return 0;
    return parseInt(arr[idx].getAttribute('data-price')) + calcRecursion(arr, idx + 1);
}

// UI RENDERING
function renderCatalog(items) {
    const div = document.getElementById('catalogResults'); if(!div) return;
    div.innerHTML = '';
    for(let i=0; i<items.length; i++) {
        let c = items[i];
        div.innerHTML += `
            <div class="col-md-6 mb-3">
                <div class="card h-100 text-center p-2">
                    <img src="${c.id}.png" class="img-placeholder w-100 object-fit-cover" alt="[ IMAGE PLACEHOLDER ]" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-placeholder w-100" style="display:none;">[ IMAGE: ${c.name} ]</div>
                    <div class="card-body p-2 mt-2">
                        <h6 class="mb-1 fw-bold">${c.name}</h6>
                        <p class="text-muted small mb-2">${c.category} | ${c.occasion}</p>
                        <p class="fw-bold mb-3">P ${c.price}.00</p>
                        <button class="btn btn-typewriter w-100" onclick="openModal(${c.id})">SELECT</button>
                    </div>
                </div>
            </div>`;
    }
}

function getBestSellers(n) {
    let arr = [...catalog], topN = [];
    for (let i = 0; i < n; i++) {
        let maxIdx = i;
        for (let j = i + 1; j < arr.length; j++) if (arr[j].sales > arr[maxIdx].sales) maxIdx = j;
        let temp = arr[i]; arr[i] = arr[maxIdx]; arr[maxIdx] = temp;
        topN[i] = arr[i];
    }
    return topN;
}

function openModal(id) {
    let item = null;
    for(let i=0; i<catalog.length; i++) if(catalog[i].id === id) item = catalog[i];
    if(!item) return;
    
    document.getElementById('modalItemId').value = id;
    document.getElementById('modalTitle').innerText = `Customize: ${item.name}`;
    
    if(item.type === "money") {
        document.getElementById('regularOptions').classList.add('d-none');
        document.getElementById('variantSection').classList.add('d-none');
        document.getElementById('moneyOptions').classList.remove('d-none');
    } else {
        document.getElementById('moneyOptions').classList.add('d-none');
        document.getElementById('regularOptions').classList.remove('d-none');
        
        // Ipakita ang Variant selection kapag hindi money bouquet
        document.getElementById('variantSection').classList.remove('d-none');
        document.getElementById('colorVariant').value = "Red"; // Default
        changeVariantImage(); // Update image placeholder
        
        let boxes = document.getElementsByClassName('addon-check');
        for(let i=0; i<boxes.length; i++) boxes[i].checked = false;
    }
    document.getElementById('customModal').style.display = 'flex';
}

function changeVariantImage() {
    let color = document.getElementById('colorVariant').value;
    let id = document.getElementById('modalItemId').value;
    
    // Update placeholder text
    document.getElementById('variantImagePlaceholder').innerText = `[ IMAGE: ${id}-${color.toLowerCase()} ]`;
    
    // Subukang i-load ang picture ng variant (hal. "101-blue.png")
    let img = document.getElementById('variantImage');
    img.src = `${id}-${color.toLowerCase()}.png`;
    img.classList.remove('d-none');
    document.getElementById('variantImagePlaceholder').classList.add('d-none');
}

function uiConfirmCustomization() {
    let id = parseInt(document.getElementById('modalItemId').value);
    let item = null;
    for(let i=0; i<catalog.length; i++) if(catalog[i].id === id) item = catalog[i];
    
    let finalPrice = item.price;
    let notes = "";

    if(item.type === "money") {
        let cash = parseInt(document.getElementById('targetCash').value);
        if(isNaN(cash) || cash <= 0) return alert("Enter valid cash amount.");
        finalPrice += cash;
        notes = `Target: P${cash} ` + calculateDenominations(cash);
    } else {
        // Kunin ang napiling Variant Color
        let color = document.getElementById('colorVariant').value;
        notes += `(Color: ${color}) `;

        let boxes = document.getElementsByClassName('addon-check');
        let selected = []; let count = 0;
        for(let i=0; i<boxes.length; i++) if(boxes[i].checked) selected[count++] = boxes[i];
        
        let addOnCost = calcRecursion(selected, 0); 
        finalPrice += addOnCost;
        for(let i=0; i<selected.length; i++) notes += `[${selected[i].value}] `;
    }
    
    addToCart(item.name, finalPrice, notes);
    closeModal();
}

function closeModal() { 
    document.getElementById('customModal').style.display = 'none'; 
}

function uiSearch() {
    let q = document.getElementById('searchInput').value.toLowerCase();
    let res = [], count = 0;
    for(let i=0; i<catalog.length; i++) if(catalog[i].name.toLowerCase().indexOf(q) !== -1) res[count++] = catalog[i];
    renderCatalog(res);
}
function uiFilterHash() {
    let occ = document.getElementById('filterOccasion').value;
    if(occ === "All") renderCatalog(catalog); else renderCatalog(getByOccasion(occ));
}
function uiFilterTree() {
    let cat = document.getElementById('filterCategory').value;
    if(cat === "All") renderCatalog(catalog); else renderCatalog(getByCategory(cat));
}

function renderCart() {
    let ul = document.getElementById('cartList'); if(!ul) return;
    ul.innerHTML = ''; let current = headPtr, total = 0;
    while (current !== -1) {
        if (linkedList[current].active !== false) {
            let item = linkedList[current]; total += item.price;
            ul.innerHTML += `
                <li class="mb-3 pb-2 border-bottom border-dashed small">
                    <div class="d-flex justify-content-between fw-bold"><span>${item.name}</span> <span>P ${item.price}</span></div>
                    <div class="text-muted fst-italic" style="font-size:0.75rem">${item.notes}</div>
                    <button class="btn btn-sm btn-outline-danger py-0 mt-1" onclick="removeCartItem(${current})">Remove</button>
                </li>`;
        }
        current = linkedList[current].next;
    }
    if (total === 0) ul.innerHTML = `<li class="text-muted small fw-bold">Cart is empty</li>`;
    else ul.innerHTML += `<li class="mt-3 fw-bold fs-5 text-end">TOTAL: P ${total}.00</li>`;
}

function uiSubmitOrder() {
    let name = document.getElementById('custName').value;
    let slot = document.getElementById('pickupSlot').value;
    let isRush = document.getElementById('isRush').checked;
    if(!name || slot === "none") return alert("Complete the form.");
    submitOrderForm(name, parseInt(slot), isRush);
}

// ADMIN QUEUE PROCESSING
function processRegularQueue() {
    if (queueHead === queueTail) return null;
    let order = orderQueue[queueHead++];
    topPtr++; historyStack[topPtr] = order; 
    saveState(); return order;
}
function processPriorityQueue() {
    if (heapSize === 0) return null;
    let min = minHeap[0]; heapSize--; minHeap[0] = minHeap[heapSize];
    let curr = 0;
    while (true) {
        let left = 2 * curr + 1, right = 2 * curr + 2, smallest = curr;
        if (left < heapSize && minHeap[left].priority < minHeap[smallest].priority) smallest = left;
        if (right < heapSize && minHeap[right].priority < minHeap[smallest].priority) smallest = right;
        if (smallest === curr) break;
        let temp = minHeap[curr]; minHeap[curr] = minHeap[smallest]; minHeap[smallest] = temp;
        curr = smallest;
    }
    topPtr++; historyStack[topPtr] = min.order; 
    saveState(); return min.order;
}
function undoLastOrder() {
    if (topPtr === -1) return null;
    let order = historyStack[topPtr]; topPtr--;
    if(order.time === 15) {
        let node = { order: order, priority: 1 }; minHeap[heapSize] = node;
        let curr = heapSize;
        while (curr > 0) {
            let parent = Math.floor((curr - 1) / 2);
            if (minHeap[curr].priority >= minHeap[parent].priority) break;
            let temp = minHeap[curr]; minHeap[curr] = minHeap[parent]; minHeap[parent] = temp;
            curr = parent;
        }
        heapSize++;
    } else orderQueue[queueTail++] = order;
    saveState(); return order;
}

function renderAdminQueues() {
    let out = document.getElementById('adminOutput'); if(!out) return;
    let wait = 0; for(let i=queueHead; i<queueTail; i++) wait += orderQueue[i].time;
    
    let histText = "RECENTLY COMPLETED:\n";
    if (topPtr === -1) histText += "- No history yet -";
    else {
        let limit = Math.max(-1, topPtr - 3); // Show last 3
        for(let i=topPtr; i>limit; i--) histText += `- Order #${historyStack[i].id} (${historyStack[i].name})\n`;
    }

    out.innerText = `[ FIFO QUEUE ]\nPending: ${queueTail - queueHead} orders.\nEst. Wait: ${wait} mins.\n\n[ RUSH PRIORITY ]\nPending: ${heapSize} urgent orders.\n\n------------------------\n${histText}`;
}

function uiAdminPop(type) {
    let order = null;
    if(type === 'reg') order = processRegularQueue();
    else if (type === 'vip') order = processPriorityQueue();
    else if (type === 'undo') { 
        order = undoLastOrder(); 
        if(order) alert(`Order #${order.id} returned to active Queue.`); else alert("No history to undo."); 
    }
    if(order && type !== 'undo') alert(`Processed Order #${order.id} for ${order.name}`);
    else if(!order && type !== 'undo') alert("Queue is empty.");
    renderAdminQueues();
}

// INITIALIZATION
window.onload = function() {
    loadState();
    if(document.getElementById('catalogResults')) {
        renderCatalog(catalog);
        let bs = getBestSellers(3), ul = document.getElementById('bestSellers');
        if(ul) {
            ul.innerHTML = '';
            for(let i=0; i<bs.length; i++) ul.innerHTML += `<li class="mb-2 pb-1 border-bottom border-dashed d-flex justify-content-between"><span>${bs[i].name}</span> <span>${bs[i].sales} SOLD</span></li>`;
        }
    }
    if(document.getElementById('cartList')) renderCart();
    if(document.getElementById('adminOutput')) renderAdminQueues();
};