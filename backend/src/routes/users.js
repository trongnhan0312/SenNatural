const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const { requireAuth, permit } = require("../middleware/auth");

router.get("/", requireAuth, permit("ADMIN"), ctrl.list);
router.get("/:id", requireAuth, permit("ADMIN"), ctrl.getOne);
router.post("/", requireAuth, permit("ADMIN"), ctrl.create);
router.put("/:id", requireAuth, permit("ADMIN"), ctrl.update);
router.delete("/:id", requireAuth, permit("ADMIN"), ctrl.remove);

module.exports = router;
