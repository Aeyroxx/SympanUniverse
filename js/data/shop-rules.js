/* =========================================================================
   DATA · RULES NG SHOP
   Bayad (GCash 50% o 100%), rush fee, pera para sa greedy, info ng shop,
   at ilang araw bago mag-expire ang quotation.
   ========================================================================= */

// Pag hindi nabayaran ang quotation sa loob ng ilang araw na ito, kusang vino-void.
var QUOTE_EXPIRY_DAYS = 3;

var PAYMENT_METHODS = [
    { id: 'gcash-50', name: '50% Down Payment via GCash', short: '50% down payment', share: 0.5,
      blurb: 'Pay half now to confirm. The balance is settled before pickup or delivery.' },
    { id: 'gcash-100', name: '100% Full Payment via GCash', short: 'Full payment', share: 1,
      blurb: 'Pay the whole amount now. Nothing is due later.' }
];

var GCASH_REF_LENGTH = 13;
var RUSH_FEE = 50;

// Pinakamalaki muna, kailangan ito ng greedy.
var DENOMINATIONS = [1000, 500, 200, 100, 50, 20];

var SHOP_INFO = {
    name: 'Sýmpan Universe',
    address: 'Lawa, Meycauayan, Bulacan',
    email: 'sympan.universe@gmail.com',
    social: '@sympan.universe',
    hours: 'Mon–Sat · 9am–6pm'
};
