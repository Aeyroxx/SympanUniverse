/* =========================================================================
   DATA · DELIVERY AT SCHEDULE
   Mga city at fee, couriers at rate nila, time slots, at yung paalala na
   estimate lang ang date at oras.
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

// ---------- Courier tracking ----------

var OTHER_COURIER = { id: 'other', name: 'Another courier', site: '' };
var TRACKING_NUMBER_MIN = 4;
var TRACKING_NUMBER_MAX = 40;
var TRACKING_LINK_MAX = 300;

// ---------- Schedule ----------

var SCHEDULE_NOTE_DELIVERY = 'Delivery dates and times are estimates. Bad weather (heavy rain, typhoons, ' +
    'flooding), traffic, road closures or courier delays can move them — we will message you if your ' +
    'delivery changes.';

var SCHEDULE_NOTE_PICKUP = 'Pickup dates are estimates too. Bad weather, a power interruption or a ' +
    'very busy week can delay an order — we will message you if it is not ready on the date.';

var FULFILMENT_MODES = [
    { id: 'pickup', name: 'Pickup', blurb: 'Collect at the shop in Lawa, Meycauayan.' },
    { id: 'delivery', name: 'Delivery', blurb: 'By the shop nearby, or by courier further out.' }
];

// 0 = Linggo hanggang 6 = Sabado. Biyernes hanggang Linggo ang sariling delivery.
var INHOUSE_DAYS = [5, 6, 0];
var INHOUSE_DAY_NAMES = 'Friday, Saturday or Sunday';

// May time slot ang delivery. Ang pickup, date lang, may limit kada araw.
var TIME_SLOTS = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
var SLOT_CAPACITY = 2;
var PICKUP_DAY_CAPACITY = 8;
