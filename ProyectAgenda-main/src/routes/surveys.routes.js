const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");

const {
    createSurvey,
    getSurveys,
    createSurveyResponse,
    getSurveyResponses,
} = require("../controllers/surveys.controller");

router.post("/create-survey", authMiddleware, permissionMiddleware("CREATE_SURVEY"), createSurvey);
router.get("/get-surveys", authMiddleware, permissionMiddleware("READ_SURVEYS"), getSurveys);
router.post("/create-survey-response", authMiddleware, permissionMiddleware("CREATE_SURVEY_RESPONSE"), createSurveyResponse);
router.get("/get-survey-responses", authMiddleware, permissionMiddleware("READ_SURVEY_RESPONSES"), getSurveyResponses);

module.exports = router;
