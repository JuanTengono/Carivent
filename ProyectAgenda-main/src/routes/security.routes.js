const express = require("express");
const router = express.Router();
const { createRole, updateRole, deleteRole, getRoles, getPermissions, createPermission, assignPermissionToRole } = require("../controllers/security.controller");
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

router.post("/store-role", authMiddleware, permissionMiddleware("CREATE_ROLE"), createRole);
router.put("/update-role/:id", authMiddleware, permissionMiddleware("UPDATE_ROLE"), updateRole);
router.delete("/delete-role/:id", authMiddleware, permissionMiddleware("DELETE_ROLE"), deleteRole);
router.get("/get-roles", authMiddleware, permissionMiddleware("READ_ROLES"), getRoles);
router.get("/get-permissions", authMiddleware, permissionMiddleware("READ_PERMISSIONS"), getPermissions);
router.post("/create-permission", authMiddleware, permissionMiddleware("CREATE_PERMISSION"), createPermission);
router.post("/assign-permission-to-role", authMiddleware, permissionMiddleware("ASSIGN_PERMISSION_TO_ROLE"), assignPermissionToRole);

module.exports = router;