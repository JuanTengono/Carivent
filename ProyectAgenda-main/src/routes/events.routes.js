const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getEventsDashboard,
    getEventCapacity,
    runAutomationJobs,
} = require("../controllers/events.controller");

router.post("/create-event", authMiddleware, permissionMiddleware("CREATE_EVENT"), createEvent);
router.put("/update-event/:id", authMiddleware, permissionMiddleware("UPDATE_EVENT"), updateEvent);
router.delete("/delete-event/:id", authMiddleware, permissionMiddleware("DELETE_EVENT"), deleteEvent);
router.get("/get-events", authMiddleware, permissionMiddleware("READ_EVENTS"), getEvents);
router.get("/get-dashboard-summary", authMiddleware, permissionMiddleware("READ_EVENTS"), getEventsDashboard);
router.get("/get-capacity/:id", authMiddleware, permissionMiddleware("READ_EVENTS"), getEventCapacity);
router.post("/run-automation-jobs", authMiddleware, permissionMiddleware("RUN_AUTOMATIONS"), runAutomationJobs);

module.exports = router;
