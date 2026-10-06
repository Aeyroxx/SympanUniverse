/* =========================================================================
   DATA — the shop's reference data, as plain arrays of plain records.

   Nothing here changes while the page runs except through store.js, which
   copies the product seed into its own working array so the order desk
   can edit prices and descriptions without touching these originals.

   Source: Sýmpan Universe's own order sheet and colour chart
   ("Sympan Universe (2).pdf", colors.jpg). Where the sheet gives no figure
   the product says so and is quoted by the owner instead of priced here.
   ========================================================================= */

var IMG_PRODUCTS = 'assets/products/';
var IMG_COLORS = 'assets/colors/';

/* =========================================================================
   RIBBON COLOURS — the twenty on the shop's colour chart, in chart order.
   The hex values are sampled from the chart itself.
   ========================================================================= */
var COLORS = [
    { id: 'red',           name: 'Red',           hex: '#d62527' },
    { id: 'wine-red',      name: 'Wine Red',      hex: '#781f22' },
    { id: 'orange',        name: 'Orange',        hex: '#db572a' },
    { id: 'peach',         name: 'Peach',         hex: '#e6b2a4' },
    { id: 'yellow',        name: 'Yellow',        hex: '#e7d045' },
    { id: 'golden-yellow', name: 'Golden Yellow', hex: '#e4b602' },
    { id: 'matcha',        name: 'Matcha',        hex: '#7f8d5b' },
    { id: 'emerald-green', name: 'Emerald Green', hex: '#2e5332' },
    { id: 'navy-blue',     name: 'Navy Blue',     hex: '#254771' },
    { id: 'baby-blue',     name: 'Baby Blue',     hex: '#82adcd' },
    { id: 'dark-blue',     name: 'Dark Blue',     hex: '#0c112f' },
    { id: 'violet',        name: 'Violet',        hex: '#5d325f' },
    { id: 'purple',        name: 'Purple',        hex: '#8e81af' },
    { id: 'purple-pink',   name: 'Purple Pink',   hex: '#d997cd' },
    { id: 'baby-pink',     name: 'Baby Pink',     hex: '#feb9df' },
    { id: 'milky-white',   name: 'Milky White',   hex: '#e7dbc1' },
    { id: 'white',         name: 'White',         hex: '#e4e7ec' },
    { id: 'choco-brown',   name: 'Choco Brown',   hex: '#2f2323' },
    { id: 'silver-gray',   name: 'Silver Gray',   hex: '#919b9d' },
    { id: 'black',         name: 'Black',         hex: '#242626' }
];

/* =========================================================================
   ARRANGEMENTS — round domes and layered cones are built differently, so
   they offer different flower counts and have their own photographs.
   ========================================================================= */
var ARRANGEMENTS = [
    { id: 'round',   name: 'Round',   counts: [3, 7, 9, 12, 18, 25],
      blurb: 'A domed posy, flowers packed shoulder to shoulder.' },
    { id: 'layered', name: 'Layered', counts: [1, 2, 3, 5, 7, 9, 12],
      blurb: 'A tall cone built up in tiers of wrap.' }
];

/* =========================================================================
   REFERENCE PHOTOGRAPHS

   Real single-colour photographs of the shop's own work. Every other
   flower × arrangement × colour combination has a generated preview in
   assets/colors/, made by recolouring one of these photographs to the
   chart colour, so a customer always sees the arrangement they picked in
   the colour they picked.
   ========================================================================= */
var REAL_REFERENCES = [
    { flower: 'rose',      arrangement: 'round',   color: 'red',         file: 'roses-round-1.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'navy-blue',   file: 'roses-round-3.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'purple-pink', file: 'roses-round-5.jpg' },
    { flower: 'rose',      arrangement: 'round',   color: 'baby-blue',   file: 'roses-round-8.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'baby-blue',   file: 'roses-layered-1.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'wine-red',    file: 'roses-layered-2.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'peach',       file: 'roses-layered-3.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'navy-blue',   file: 'roses-layered-4.jpg' },
    { flower: 'rose',      arrangement: 'layered', color: 'purple-pink', file: 'roses-layered-5.jpg' },
    { flower: 'plumeria',  arrangement: 'layered', color: 'red',         file: 'plumeria-layered-1.jpg' },
    { flower: 'dahlia',    arrangement: 'round',   color: 'navy-blue',   file: 'dahlia-round-1.jpg' },
    { flower: 'dahlia',    arrangement: 'layered', color: 'red',         file: 'dahlia-layered-1.jpg' },
    { flower: 'sunflower', arrangement: 'round',   color: 'wine-red',    file: 'custom-ribbon-2.jpg' },
    { flower: 'sunflower', arrangement: 'layered', color: 'navy-blue',   file: 'custom-ribbon-6.jpg' }
];

var FLOWERS = ['rose', 'plumeria', 'dahlia', 'sunflower'];

/* =========================================================================
   CATEGORY TREE — straight off the order sheet's three columns.
   ========================================================================= */
var CATEGORY_OUTLINE = [
    { label: 'Flower Bouquets', slug: 'flower-bouquets', children: [
        { label: 'Rose', slug: 'rose' },
        { label: 'Plumeria', slug: 'plumeria' },
        { label: 'Dahlia', slug: 'dahlia' },
        { label: 'Sunflower', slug: 'sunflower' }
    ] },
    { label: 'Other Bouquets', slug: 'other-bouquets', children: [
        { label: 'Paper Bills', slug: 'paper-bills' },
        { label: 'Makeup', slug: 'makeup' },
        { label: 'Pictures', slug: 'pictures' },
        { label: 'Sweets / Snacks', slug: 'sweets' }
    ] },
    { label: 'Gift Cakes', slug: 'gift-cakes', children: [
        { label: 'Diaper Cake', slug: 'diaper-cake' },
        { label: 'Beer-in-Can Cake', slug: 'beer-cake' }
    ] }
];

/* =========================================================================
   QUOTE TYPES — what the request form asks for each kind of gift.

   provided   the item the customer usually supplies themselves; null when
              the shop supplies everything.
   countLabel the quantity that drives the labour.
   detailLabel a free-text field for brand, type or preferred items.
   expenseLabel how the quote names the item cost, kept apart from
              materials and labour.
   ========================================================================= */
var QUOTE_TYPES = [
    { id: 'flower', provided: null, countLabel: 'Flowers', detailLabel: '', expenseLabel: '' },
    { id: 'money', provided: 'the paper bills', countLabel: 'Number of bills',
      detailLabel: 'Total amount inside (optional)', expenseLabel: 'Bills' },
    { id: 'makeup', provided: 'the makeup products', countLabel: 'Number of makeup products',
      detailLabel: 'Products, brands or shades', expenseLabel: 'Makeup products' },
    { id: 'pictures', provided: null, countLabel: 'Number of photographs',
      detailLabel: 'Print size or theme', expenseLabel: 'Photo prints' },
    { id: 'sweets', provided: 'the sweets and snacks', countLabel: 'Number of sweets and snacks',
      detailLabel: 'Preferred sweets and snacks', expenseLabel: 'Sweets and snacks' },
    { id: 'diaper', provided: 'the diapers', countLabel: 'Number of diapers',
      detailLabel: 'Diaper brand and size', expenseLabel: 'Diapers' },
    { id: 'beer', provided: 'the beer', countLabel: 'Number of cans',
      detailLabel: 'Beer type or brand', expenseLabel: 'Beer' }
];

/* =========================================================================
   PRODUCTS — the working catalogue is a copy of this, made in store.js.

   kind 'flower'  ribbon flowers. The order sheet prices these by count,
                  so they show "Starts at" the cheapest build and are
                  priced and paid at checkout — no quotation.
   kind 'fixed'   one set price (the picture bouquet), paid at checkout.
   kind 'quote'   the five gifts with no price list: money, makeup,
                  sweets, diaper cake and beer cake. Shown as Customized
                  Pricing and quoted from materials, labour and any item
                  cost.
   ========================================================================= */
var PRODUCT_SEED = [
    {
        id: 101, name: 'Rose Bouquet', line: 'rose', kind: 'flower', quoteType: 'flower', flower: 'rose',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-06-01',
        priceTable: [{ count: 1, price: 55 }, { count: 2, price: 110 }, { count: 3, price: 165 },
                     { count: 5, price: 260 }, { count: 7, price: 350 }, { count: 9, price: 430 },
                     { count: 12, price: 555 }, { count: 18, price: 825 }, { count: 25, price: 1135 }],
        materials: ['Satin ribbon', 'Korean wrapping paper', 'Floral wire and tape', 'Ribbon bow'],
        blurb: 'Hand-rolled satin roses, counted out as many as you like.',
        story: 'Each rose is rolled by hand from satin ribbon. Choose a round dome or a tall layered ' +
               'build, the number of flowers and one of twenty ribbon colours. The price follows the ' +
               'count on the shop’s price list, so you see it before you pay.',
        gallery: ['roses-round-1.jpg', 'roses-round-2.jpg', 'roses-round-3.jpg', 'roses-round-4.jpg',
                  'roses-round-5.jpg', 'roses-round-6.jpg', 'roses-round-7.jpg', 'roses-round-8.jpg',
                  'roses-layered-1.jpg', 'roses-layered-2.jpg', 'roses-layered-3.jpg',
                  'roses-layered-4.jpg', 'roses-layered-5.jpg']
    },
    {
        id: 102, name: 'Plumeria Bouquet', line: 'plumeria', kind: 'flower', quoteType: 'flower', flower: 'plumeria',
        arrangements: ['round', 'layered'], leadDays: 2, addedOn: '2024-06-01',
        priceTable: [{ count: 1, price: 45 }, { count: 2, price: 85 }, { count: 3, price: 130 },
                     { count: 5, price: 210 }, { count: 7, price: 280 }, { count: 9, price: 350 },
                     { count: 12, price: 450 }, { count: 18, price: 670 }, { count: 25, price: 925 }],
        materials: ['Satin ribbon', 'Pearl centres', 'Korean wrapping paper', 'Floral wire and tape'],
        blurb: 'Five-petal plumeria with a pearl centre. The gentlest of the three.',
        story: 'Folded plumeria blossoms, each with a pearl at the centre. They pack tightly into a ' +
               'round bed or rise in a layered cone, in any of the twenty ribbon colours.',
        gallery: ['plumeria-round-1.jpg', 'plumeria-round-2.jpg', 'plumeria-round-3.jpg',
                  'plumeria-round-4.jpg', 'plumeria-round-5.jpg', 'plumeria-round-6.jpg',
                  'plumeria-layered-1.jpg']
    },
    {
        id: 103, name: 'Dahlia Bouquet', line: 'dahlia', kind: 'flower', quoteType: 'flower', flower: 'dahlia',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-08-15',
        priceTable: [{ count: 1, price: 75 }, { count: 2, price: 145 }, { count: 3, price: 220 },
                     { count: 5, price: 360 }, { count: 7, price: 490 }, { count: 9, price: 620 },
                     { count: 12, price: 820 }, { count: 18, price: 1220 }, { count: 25, price: 1680 }],
        materials: ['Satin ribbon', 'Korean wrapping paper', 'Floral wire and tape', 'Hot glue'],
        blurb: 'Dozens of folded petals per bloom. The longest to make, and it shows.',
        story: 'A single dahlia is dozens of folded petals stacked into a sphere, which is why it ' +
               'costs more per flower than anything else on the sheet. Worth the extra day.',
        gallery: ['dahlia-round-1.jpg', 'dahlia-layered-1.jpg']
    },
    {
        id: 104, name: 'Sunflower Bouquet', line: 'sunflower', kind: 'flower', quoteType: 'flower', flower: 'sunflower',
        arrangements: ['round', 'layered'], leadDays: 3, addedOn: '2024-10-01',
        priceTable: [{ count: 1, price: 55 }, { count: 2, price: 110 }, { count: 3, price: 165 },
                     { count: 5, price: 260 }, { count: 7, price: 350 }, { count: 9, price: 430 },
                     { count: 12, price: 555 }, { count: 18, price: 825 }, { count: 25, price: 1135 }],
        materials: ['Satin ribbon', 'Felt centres', 'Korean wrapping paper', 'Floral wire and tape'],
        blurb: 'Bright satin sunflowers, set among roses in the colour you choose.',
        story: 'Sunflowers are almost always ordered mixed — against roses in a colour of your ' +
               'choosing. Priced on the rose price list, by the number of flowers.',
        gallery: ['custom-ribbon-2.jpg', 'custom-ribbon-6.jpg', 'custom-ribbon-7.jpg']
    },
    {
        id: 201, name: 'Money Bouquet', line: 'paper-bills', kind: 'quote', quoteType: 'money',
        leadDays: 2, addedOn: '2024-06-01', sizes: ['Small', 'Medium', 'Large', 'Extra large'],
        materials: ['Korean wrapping paper', 'Bill sleeves and clips', 'Ribbon', 'Filler flowers'],
        blurb: 'Your own bills, folded onto stems. Priced on materials and labour.',
        story: 'You provide the bills; the shop folds each one onto a stem and wraps the lot as a ' +
               'bouquet. The quotation covers materials and the labour of assembly, which depends ' +
               'on the size, the number of bills and how intricate the design is.',
        gallery: ['money-1.jpg', 'money-2.jpg', 'money-3.jpg']
    },
    {
        id: 202, name: 'Makeup Bouquet', line: 'makeup', kind: 'quote', quoteType: 'makeup',
        leadDays: 3, addedOn: '2024-06-01', sizes: ['Small', 'Medium', 'Large'],
        materials: ['Korean wrapping paper', 'Dried gypsophila', 'Product holders', 'Ribbon'],
        blurb: 'Her actual shades, wrapped like flowers with dried gypsophila.',
        story: 'Built around cosmetics, nested in wrap with dried gypsophila so the whole thing ' +
               'still reads as a bouquet. Tell the shop whether you will bring the makeup yourself; ' +
               'the quotation covers materials and labour, plus the products if the shop sources them.',
        gallery: ['makeup-1.jpg', 'makeup-2.jpg']
    },
    {
        id: 203, name: 'Picture Bouquet', line: 'pictures', kind: 'fixed', quoteType: 'pictures', price: 650,
        leadDays: 2, addedOn: '2024-06-01', sizes: ['Standard'],
        materials: ['Photo prints', 'Card backing and stems', 'Korean wrapping paper', 'Ribbon'],
        blurb: 'Your photographs, printed and mounted where the flowers would be.',
        story: 'Send the shots and they come back as prints on stems, wrapped like a bouquet. ' +
               'Usually a graduation, but it works for anniversaries and farewells just as well. ' +
               'One price per bouquet, straight off the shop\'s order sheet.',
        gallery: ['picture-1.jpg']
    },
    {
        id: 204, name: 'Sweets & Snacks Bouquet', line: 'sweets', kind: 'quote', quoteType: 'sweets',
        leadDays: 2, addedOn: '2024-09-01', sizes: ['Small', 'Medium', 'Large'],
        materials: ['Korean wrapping paper', 'Cellophane', 'Sticks and tape', 'Ribbon'],
        blurb: 'Chocolates and snacks arranged as a bouquet. Tell us their favourites.',
        story: 'Usually built from sweets you provide. If the shop buys them, the quotation lists ' +
               'that cost separately from the materials and labour, so you can see exactly what ' +
               'goes where.',
        gallery: ['sweets-1.jpg', 'sweets-2.jpg']
    },
    {
        id: 301, name: 'Diaper Cake', line: 'diaper-cake', kind: 'quote', quoteType: 'diaper',
        leadDays: 3, addedOn: '2024-06-01', sizes: ['1 tier', '2 tiers', '3 tiers'],
        materials: ['Satin ribbon', 'Cake board', 'Rubber bands', 'Topper and toys'],
        blurb: 'A tiered cake of rolled diapers, stacked with newborn essentials.',
        story: 'Every layer is rolled diapers, banded in satin and finished with a topper. The ' +
               'diapers are usually yours; the quotation covers materials and the labour of ' +
               'rolling and assembly.',
        gallery: ['diaper-cake-1.jpg']
    },
    {
        id: 302, name: 'Beer-in-Can Cake', line: 'beer-cake', kind: 'quote', quoteType: 'beer',
        leadDays: 3, addedOn: '2024-09-01', sizes: ['1 tier', '2 tiers', '3 tiers'],
        materials: ['Cake board', 'Satin ribbon', 'Wrap and tape', 'Topper'],
        blurb: 'Cans stacked and wrapped into a tiered cake. A birthday standard.',
        story: 'Tell the shop the beer and how many cans. If you bring the beer, the quotation is ' +
               'materials and labour; if the shop buys it, the beer is listed as its own cost.',
        gallery: ['beer-cake-1.jpg']
    }
];

/* =========================================================================
   ADD-ONS — the four on the order sheet. Glitter is priced by how many
   flowers it has to cover, so it is offered on flower bouquets only.
   ========================================================================= */
var ADDONS = [
    { id: 'lights',  name: 'Fairy Lights', price: 20, flowersOnly: false, note: 'Warm micro-LED strand, battery included' },
    { id: 'topper',  name: 'Butterfly Topper', price: 5, flowersOnly: false, note: 'Hand-cut organza butterflies' },
    { id: 'card',    name: 'Message Card w/ Dried Flower', price: 20, flowersOnly: false, note: 'Handwritten, with a dried bloom' },
    { id: 'glitter', name: 'Glitters', price: 5, flowersOnly: true, note: 'Priced by how many flowers it covers' }
];

var GLITTER_TIERS = [
    { upTo: 3, price: 5 }, { upTo: 7, price: 10 }, { upTo: 12, price: 15 },
    { upTo: 18, price: 20 }, { upTo: 25, price: 25 }
];

var CARD_FLOWERS = ['Sunflower', 'Rose', 'Lavender', 'Pink Carnation', 'Purple Carnation', 'Aster Pink'];

/* =========================================================================
   DELIVERY

   inhouse  the shop delivers or meets up itself, Friday to Sunday, at the
            handling fee on its order sheet (free inside Brgy. Lawa).
   courier  outside that area. Rates below are the shop's planning figures
            per courier and region, not live rates — the owner confirms
            the fee before the quotation goes out. A city that is in
            neither list has no rate at all and the owner enters one.
   ========================================================================= */
var DELIVERY_AREAS = [
    { city: 'Meycauayan', service: 'inhouse', fee: 20, freeBarangays: ['lawa'], aliases: ['meycauayan city'] },
    { city: 'Marilao', service: 'inhouse', fee: 35, aliases: [] },
    { city: 'Bocaue', service: 'inhouse', fee: 35, aliases: [] },
    { city: 'Obando', service: 'inhouse', fee: 50, aliases: [] },
    { city: 'Valenzuela', service: 'inhouse', fee: 50, aliases: ['valenzuela city'] },

    { city: 'Manila', service: 'courier', region: 'metro-manila', aliases: ['city of manila'] },
    { city: 'Quezon City', service: 'courier', region: 'metro-manila', aliases: ['qc'] },
    { city: 'Caloocan', service: 'courier', region: 'metro-manila', aliases: ['caloocan city'] },
    { city: 'Malabon', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Navotas', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'San Juan', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Mandaluyong', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Marikina', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Pasig', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Makati', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Pasay', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Taguig', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Pateros', service: 'courier', region: 'metro-manila', aliases: [] },
    { city: 'Parañaque', service: 'courier', region: 'metro-manila', aliases: ['paranaque'] },
    { city: 'Las Piñas', service: 'courier', region: 'metro-manila', aliases: ['las pinas'] },
    { city: 'Muntinlupa', service: 'courier', region: 'metro-manila', aliases: [] },

    { city: 'Malolos', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Guiguinto', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Balagtas', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Bulakan', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Santa Maria', service: 'courier', region: 'bulacan', aliases: ['sta maria'] },
    { city: 'San Jose del Monte', service: 'courier', region: 'bulacan', aliases: ['sjdm'] },
    { city: 'Pandi', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Plaridel', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Pulilan', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Baliwag', service: 'courier', region: 'bulacan', aliases: ['baliuag'] },
    { city: 'Norzagaray', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Calumpit', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Hagonoy', service: 'courier', region: 'bulacan', aliases: [] },
    { city: 'Paombong', service: 'courier', region: 'bulacan', aliases: [] }
];

var COURIERS = [
    { id: 'flash', name: 'Flash Express', blurb: 'Parcel courier, boxed and padded. 1–3 days.',
      rates: [{ region: 'bulacan', fee: 95 }, { region: 'metro-manila', fee: 120 }],
      site: 'https://www.flashexpress.ph', hosts: ['flashexpress.ph', 'flashexpress.com'] },
    { id: 'lalamove', name: 'Lalamove', blurb: 'Same-day motorcycle courier, booked on the day.',
      rates: [{ region: 'bulacan', fee: 160 }, { region: 'metro-manila', fee: 220 }],
      site: 'https://www.lalamove.com', hosts: ['lalamove.com'] }
];

/* =========================================================================
   COURIER TRACKING — the parcel number and / or link a courier gives the
   shop, attached to an order once it is sent. A courier not listed above
   can be named as "another courier".
   ========================================================================= */
var OTHER_COURIER = { id: 'other', name: 'Another courier', site: '' };
var TRACKING_NUMBER_MIN = 4;
var TRACKING_NUMBER_MAX = 40;
var TRACKING_LINK_MAX = 300;

/* =========================================================================
   SCHEDULE NOTE — dates and times are the shop's best estimate.
   ========================================================================= */
var SCHEDULE_NOTE_DELIVERY = 'Delivery dates and times are estimates. Bad weather (heavy rain, typhoons, ' +
    'flooding), traffic, road closures or courier delays can move them — we will message you if your ' +
    'delivery changes.';
var SCHEDULE_NOTE_PICKUP = 'Pickup dates are estimates too. Bad weather, a power interruption or a ' +
    'very busy week can delay an order — we will message you if it is not ready on the date.';

var FULFILMENT_MODES = [
    { id: 'pickup', name: 'Pickup', blurb: 'Collect at the shop in Lawa, Meycauayan.' },
    { id: 'delivery', name: 'Delivery', blurb: 'By the shop nearby, or by courier further out.' }
];

/* 0 = Sunday … 6 = Saturday. The shop's own runs: Friday to Sunday. */
var INHOUSE_DAYS = [5, 6, 0];
var INHOUSE_DAY_NAMES = 'Friday, Saturday or Sunday';
/* Deliveries are booked into time slots. Pickups are booked by date only,
   up to a number per day. */
var TIME_SLOTS = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
var SLOT_CAPACITY = 2;
var PICKUP_DAY_CAPACITY = 8;

/* A quotation the customer has not paid within this many days is voided
   automatically, so the owner never has to chase it. */
var QUOTE_EXPIRY_DAYS = 3;

/* =========================================================================
   PAYMENT — the only two ways the shop takes money.
   ========================================================================= */
var PAYMENT_METHODS = [
    { id: 'gcash-50', name: '50% Down Payment via GCash', short: '50% down payment', share: 0.5,
      blurb: 'Pay half now to confirm. The balance is settled before pickup or delivery.' },
    { id: 'gcash-100', name: '100% Full Payment via GCash', short: 'Full payment', share: 1,
      blurb: 'Pay the whole amount now. Nothing is due later.' }
];

var GCASH_REF_LENGTH = 13;
var RUSH_FEE = 50;

/* Largest first — the greedy bill count depends on it. */
var DENOMINATIONS = [1000, 500, 200, 100, 50, 20];

var SHOP_INFO = {
    name: 'Sýmpan Universe',
    address: 'Lawa, Meycauayan, Bulacan',
    email: 'sympan.universe@gmail.com',
    social: '@sympan.universe',
    hours: 'Mon–Sat · 9am–6pm'
};

/* The order desk's accounts — the credentials, kept as an array (see
   js/accounts.js). No password is written anywhere: each account has a
   salt and the salted hash of its password. The owner's email is the one
   in js/email-config.js; the demo staff account is on example.com, so its
   sign-in code is shown on screen instead of emailed.
     owner  the email in email-config.js   password: see README
     staff  bea.cruz@example.com           password: see README */
var STAFF_SEED = [
    { id: 1, name: 'Shop owner', email: '', role: 'owner', salt: 'su-owner-2026', passHash: 217525834 },
    { id: 2, name: 'Bea Cruz', email: 'bea.cruz@example.com', role: 'staff', salt: 'su-staff-2026', passHash: 2345561029 }
];
var PASSWORD_ROUNDS = 200;   // FNV-1a rounds per password hash
/* Password reset: a six-digit code emailed to the account's own address,
   then a new password. Only the code's hash is kept, as for the sign-in
   code. */
var RESET_LIFETIME_MS = 10 * 60 * 1000;
var RESET_MAX_TRIES = 3;
var RESET_RESEND_MS = 30000;
var RESET_MAX_SENDS = 3;
var PASSWORD_MIN = 8;
var PASSWORD_MAX = 64;
var ADMIN_MAX_ATTEMPTS = 5;
var ADMIN_LOCK_MS = 30000;
var OTP_LENGTH = 6;
var OTP_LIFETIME_MS = 5 * 60 * 1000;
var OTP_MAX_TRIES = 3;
var OTP_RESEND_MS = 30000;
var OTP_MAX_SENDS = 3;
/* However the sign-in or reset is started again, one email address gets at
   most this many codes an hour (sign-in and reset codes together). */
var CODE_SEND_MAX = 6;
var CODE_SEND_WINDOW_MS = 60 * 60 * 1000;
/* The desk signs itself out after this long without a tap or a key. */
var DESK_IDLE_MS = 15 * 60 * 1000;

/* =========================================================================
   SAMPLE PHOTOS — openly licensed photographs from the web, shown for the
   products the shop has not photographed yet. Each is labelled "Sample
   photo" on the site with its credit; the shop's own work replaces it.
   Credits are also in assets/products/CREDITS.md.
   ========================================================================= */
var PHOTO_CREDITS = [
    { file: 'sweets-1.jpg', title: 'Chocolate Bouquet', author: 'இந்து தங்கராஜ்',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Chocolate_Bouquet.jpg', changes: 'Resized.' },
    { file: 'sweets-2.jpg', title: 'Candy bouquet from my family', author: 'TwisterMc',
      license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      source: 'https://www.flickr.com/photos/13112188@N00/9095526092', changes: '' },
    { file: 'beer-cake-1.jpg', title: 'Max\'s Tower of Beer Cans', author: 'Smash the Iron Cage',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Max%27s_Tower_of_Beer_Cans.jpg', changes: 'Cropped and resized.' }
];

/* =========================================================================
   DATA PRIVACY NOTICE — under the Data Privacy Act of 2012 (Republic Act
   No. 10173). Shown from the shop's banner, the footer and checkout, where
   the customer must agree to it before ordering. The version is recorded
   on every order with the moment it was accepted. This is a starting
   text for the shop to review, not legal advice.
   ========================================================================= */
var PRIVACY_NOTICE_VERSION = '2026-10-06';
var ORDER_TERMS_VERSION = '2026-10-06';
var PRIVACY_NOTICE = [
    { title: 'Who we are',
      text: ['Sýmpan Universe is a handcrafted gift shop in Lawa, Meycauayan, Bulacan. We are the personal information controller for the details you give us when you order, and we follow the Data Privacy Act of 2012 (Republic Act No. 10173) and its rules.'] },
    { title: 'What we collect',
      text: ['To take an order: your name, mobile number, email address, and — if you give them — your Facebook or Instagram name, notes about the order, and any reference picture you attach.',
             'For a delivery: the street, barangay and city. For a gift this is often the recipient’s address — please let them know you are sharing it with us; we use it only to deliver. For a payment: the GCash reference number of your payment, so we can match it to your order.',
             'We do not ask for government IDs, birthdays or card details, and this website uses no cookies, trackers or advertising tools.'] },
    { title: 'Why we use it',
      text: ['Only to make, price, deliver and support your order: to prepare your quotation, confirm your payment and issue receipts, schedule pickup or delivery, send you emails about each step, and answer you if you message us.',
             'We do not sell your details or use them for advertising.'] },
    { title: 'Our basis for using it',
      text: ['Your consent, which you give by ticking the box at checkout, and the order itself: we need these details to fulfil what you asked us to make.',
             'You may withdraw your consent at any time by messaging us (see How to reach us). We then stop using your details for anything new. An order already in production still needs them to be finished and delivered, and the order terms on cancellations and payments still apply; receipts the law requires us to keep are kept.'] },
    { title: 'Who else receives it',
      text: ['For a courier delivery, the courier you choose (Flash Express or Lalamove) receives your name, mobile number and address.',
             'Our order emails are sent through EmailJS, an email service whose servers are outside the Philippines, so your email address and our message to you are processed abroad.',
             'When this page opens, your browser also loads its fonts from Google Fonts and its layout styles from jsDelivr. Like any website they see your IP address and browser, but none of your order details.',
             'No one else receives your details, unless the law requires it.'] },
    { title: 'How long we keep it, and how it is protected',
      text: ['This website keeps orders only in the open browser page: nothing is saved on your device, and reloading the page erases it. The emails we send you stay in the shop’s mailbox and in EmailJS’s sending history.',
             'The shop keeps your order details only as long as your order and its after-care need — at most one year after it is completed — then deletes them. Receipts and payment records are kept as long as tax rules require.',
             'Only the shop’s own people can see orders. Each person at the order desk signs in with their own account, password and a code sent to their email. (This demonstration copy also has a sample staff account whose code is shown on screen, because its example address cannot receive email.)'] },
    { title: 'Your rights',
      text: ['Under the Data Privacy Act you have the right to be informed, to access your personal data, to object to its processing and withdraw your consent, to have it corrected, to have it erased or blocked, to receive it in a form you can take elsewhere, and to be paid for damages if it is misused.',
             'You may also file a complaint with the National Privacy Commission (privacy.gov.ph).'] },
    { title: 'How to reach us',
      text: ['For any question or request about your data, email the shop at sympan.universe@gmail.com or message @sympan.universe. The shop owner acts as our data protection officer.'] }
];

/* The shop's own order rules (from its order sheet), agreed to at checkout
   alongside — but separately from — the privacy consent. */
var ORDER_TERMS = [
    'Every item is handmade. Processing takes 2 to 3 days or longer, depending on the design; rush orders cost ₱50 more.',
    'A 50% down payment or full payment by GCash confirms an order. Payments are non-refundable.',
    'No cancellations once production starts. A request or an unpaid quotation can be cancelled from Track order.',
    'The shop delivers itself on Fridays, Saturdays and Sundays: free within Brgy. Lawa, ₱20 to ₱50 for other nearby areas. Couriers deliver further out at their rates.',
    'Pickup and delivery dates and times are estimates. Weather, traffic and courier delays can move them; the shop will message you if they change.',
    'A small greeting card is free on request.'
];
