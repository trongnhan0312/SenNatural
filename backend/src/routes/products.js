const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/productController");
const { requireAuth, permit } = require("../middleware/auth");

router.get("/", requireAuth, ctrl.list);
router.get("/:id", requireAuth, ctrl.getOne);
router.post("/", requireAuth, permit("ADMIN"), ctrl.create);
router.put("/:id", requireAuth, permit("ADMIN"), ctrl.update);
router.delete("/:id", requireAuth, permit("ADMIN"), ctrl.remove);

module.exports = router;
