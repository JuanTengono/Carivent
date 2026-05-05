const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    createNotification,
    getNotifications,
    markNotificationAsRead,
    broadcastPromotion,
    broadcastEventNotice,
    registerDevice,
    unregisterDevice,
} = require("../controllers/notifications.controller");

router.post("/create-notification", authMiddleware, permissionMiddleware("CREATE_NOTIFICATION"), createNotification);
router.get("/get-notifications", authMiddleware, permissionMiddleware("READ_NOTIFICATIONS"), getNotifications);
router.put("/mark-notification-as-read/:id", authMiddleware, permissionMiddleware("UPDATE_NOTIFICATION"), markNotificationAsRead);
router.post("/broadcast-promotion", authMiddleware, permissionMiddleware("CREATE_NOTIFICATION"), broadcastPromotion);
router.post("/broadcast-event", authMiddleware, permissionMiddleware("CREATE_NOTIFICATION"), broadcastEventNotice);
router.post("/register-device", authMiddleware, registerDevice);
router.post("/unregister-device", authMiddleware, unregisterDevice);

module.exports = router;
