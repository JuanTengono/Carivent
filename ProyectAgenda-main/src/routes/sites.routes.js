const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
const { createSite, updateSite, deleteSite, getSites } = require("../controllers/sites.controller");

router.post("/create-site", authMiddleware, permissionMiddleware("CREATE_SITE"), createSite);
router.put("/update-site/:id", authMiddleware, permissionMiddleware("UPDATE_SITE"), updateSite);
router.delete("/delete-site/:id", authMiddleware, permissionMiddleware("DELETE_SITE"), deleteSite);
router.get("/get-sites", authMiddleware, permissionMiddleware("READ_SITES"), getSites);

module.exports = router;