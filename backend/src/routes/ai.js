const express = require("express");
const router = express.Router();
const { chat, getHistory } = require("../controllers/aiController");
const { requireAuth } = require("../middleware/auth");

router.post("/chat", requireAuth, chat);
router.get("/history", requireAuth, getHistory);

module.exports = router;
