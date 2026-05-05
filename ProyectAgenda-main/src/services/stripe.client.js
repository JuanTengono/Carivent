const Stripe = require("stripe");

let stripeSingleton = null;

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY no esta configurada");
    }
    if (!stripeSingleton) {
        stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripeSingleton;
}

function getStripePublishableKey() {
    const key = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!key) {
        throw new Error("STRIPE_PUBLISHABLE_KEY no esta configurada");
    }
    return key;
}

module.exports = {
    getStripe,
    getStripePublishableKey,
};
