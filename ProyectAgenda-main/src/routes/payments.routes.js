const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    getPayments,
    getPaymentById,
    confirmPayment,
    failPayment,
    createPaymentIntent,
    confirmStripePayment,
} = require("../controllers/payments.controller");

router.get("/get-payments", authMiddleware, permissionMiddleware("READ_PAYMENTS"), getPayments);
router.get("/get-payment/:id", authMiddleware, getPaymentById);
router.put("/confirm-payment/:id", authMiddleware, permissionMiddleware("UPDATE_PAYMENT"), confirmPayment);
router.put("/fail-payment/:id", authMiddleware, permissionMiddleware("UPDATE_PAYMENT"), failPayment);
router.post("/create-payment-intent", authMiddleware, permissionMiddleware("CREATE_TICKET"), createPaymentIntent);
router.post("/confirm-payment", authMiddleware, confirmStripePayment);

module.exports = router;
