const express = require("express");
const router = express.Router();
const { exportExcel, exportPDF } = require("../controllers/exportController");
const { requireAuth, permit } = require("../middleware/auth");

router.get("/excel", requireAuth, permit("ADMIN"), exportExcel);
router.get("/pdf", requireAuth, permit("ADMIN"), exportPDF);

module.exports = router;
