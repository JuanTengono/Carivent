const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const { createAgenda, updateAgenda, deleteAgenda, getAgendas } = require("../controllers/agendas.controller");

router.post("/create-agenda", authMiddleware, permissionMiddleware("CREATE_AGENDA"), createAgenda);
router.put("/update-agenda/:id", authMiddleware, permissionMiddleware("UPDATE_AGENDA"), updateAgenda);
router.delete("/delete-agenda/:id", authMiddleware, permissionMiddleware("DELETE_AGENDA"), deleteAgenda);
router.get("/get-agendas", authMiddleware, permissionMiddleware("READ_AGENDAS"), getAgendas);

module.exports = router;
