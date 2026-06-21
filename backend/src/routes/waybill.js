const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/waybillController");
const { requireAuth, permit } = require("../middleware/auth");

router.get("/", requireAuth, ctrl.list);
router.get("/:id", requireAuth, ctrl.getOne);
router.post("/", requireAuth, ctrl.create);
router.delete("/:id", requireAuth, permit("ADMIN"), ctrl.remove);

module.exports = router;
