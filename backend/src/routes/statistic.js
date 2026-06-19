const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/statController");
const { requireAuth, permit } = require("../middleware/auth");

router.get("/dashboard", requireAuth, ctrl.dashboard);
router.get("/revenue", requireAuth, permit("ADMIN"), ctrl.revenue);
router.get("/profit", requireAuth, permit("ADMIN"), ctrl.profit);
router.get("/top-product", requireAuth, ctrl.topProduct);

module.exports = router;
