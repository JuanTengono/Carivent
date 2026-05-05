const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    createPromotion,
    updatePromotion,
    deletePromotion,
    getPromotions,
} = require("../controllers/promotions.controller");

router.post("/create-promotion", authMiddleware, permissionMiddleware("CREATE_PROMOTION"), createPromotion);
router.put("/update-promotion/:id", authMiddleware, permissionMiddleware("UPDATE_PROMOTION"), updatePromotion);
router.delete("/delete-promotion/:id", authMiddleware, permissionMiddleware("DELETE_PROMOTION"), deletePromotion);
router.get("/get-promotions", authMiddleware, permissionMiddleware("READ_PROMOTIONS"), getPromotions);

module.exports = router;
