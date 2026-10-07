/* =========================================================================
   DATA · SECURITY NG ORDER DESK
   Yung seed ng accounts (salt at hash lang, walang password na nakasulat)
   at mga limit: password, sign-in code, reset code, ilang mali bago
   mag-pause, at idle sign-out.
   ========================================================================= */

// Mga account ng desk. Walang password na nakasulat: salt at salted hash lang.
// Yung email ng owner ay galing sa email-config.js. Yung demo staff ay nasa
// example.com kaya nasa screen ang code niya. Password: tingnan ang README.
var STAFF_SEED = [
    { id: 1, name: 'Shop owner', email: '', role: 'owner', salt: 'su-owner-2026', passHash: 217525834 },
    { id: 2, name: 'Bea Cruz', email: 'bea.cruz@example.com', role: 'staff', salt: 'su-staff-2026', passHash: 2345561029 }
];

var PASSWORD_ROUNDS = 200;   // ilang ulit ng FNV-1a bawat password

// Password reset: six-digit code sa email ng account, tapos bagong password.
// Hash lang ng code ang tinatago.
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

// Kahit ilang beses ulitin, hanggang ganito lang karaming code kada oras sa isang email.
var CODE_SEND_MAX = 6;
var CODE_SEND_WINDOW_MS = 60 * 60 * 1000;

// Kusang magsa-sign out ang desk pag ganito katagal walang tap o key.
var DESK_IDLE_MS = 15 * 60 * 1000;
