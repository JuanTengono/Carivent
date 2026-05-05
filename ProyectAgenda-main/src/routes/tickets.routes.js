const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    createTicket,
    getTickets,
    validateTicket,
    cancelTicket,
    getAttendeesByEvent,
    getCapacitySummary,
} = require("../controllers/tickets.controller");

router.post("/create-ticket", authMiddleware, permissionMiddleware("CREATE_TICKET"), createTicket);
router.get("/get-tickets", authMiddleware, permissionMiddleware("READ_TICKETS"), getTickets);
router.put("/validate-ticket/:codeQr", authMiddleware, permissionMiddleware("VALIDATE_TICKET"), validateTicket);
router.put("/cancel-ticket/:id", authMiddleware, permissionMiddleware("UPDATE_TICKET"), cancelTicket);
router.get("/get-attendees/:eventId", authMiddleware, permissionMiddleware("READ_ATTENDEES"), getAttendeesByEvent);
router.get("/get-capacity/:eventId", authMiddleware, permissionMiddleware("READ_EVENTS"), getCapacitySummary);

module.exports = router;
