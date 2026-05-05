const express = require("express");
const router = express.Router();
const {
    getPublicEvents,
    getPublicSites,
    getPublicAgendas,
    getPublicEventCapacity,
    openAppResetPassword,
    openAppVerifyEmail,
} = require("../controllers/public.controller");

router.get("/events", getPublicEvents);
router.get("/get-events", getPublicEvents);

router.get("/sites", getPublicSites);
router.get("/get-sites", getPublicSites);

router.get("/agendas", getPublicAgendas);
router.get("/get-agendas", getPublicAgendas);

router.get("/events/:id/capacity", getPublicEventCapacity);
router.get("/open-app/reset-password", openAppResetPassword);
router.get("/open-app/verify-email", openAppVerifyEmail);

module.exports = router;
