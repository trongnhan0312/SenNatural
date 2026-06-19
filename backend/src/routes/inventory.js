const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/inventoryController");
const { requireAuth, permit } = require("../middleware/auth");

router.post("/import", requireAuth, permit("ADMIN", "STAFF"), ctrl.importStock);
router.post("/export", requireAuth, permit("ADMIN", "STAFF"), ctrl.exportStock);
router.get("/history", requireAuth, ctrl.history);

module.exports = router;
