const express = require("express");
const router = express.Router();
const {
    register,
    login,
    logout,
    refresh,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", authMiddleware, refresh);
router.post("/logout", authMiddleware, logout);
router.post("/request-email-verification", requestEmailVerification);
router.post("/resend-email-verification", requestEmailVerification);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

module.exports = router;
