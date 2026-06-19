const express = require("express");
const router = express.Router();
const auth = require("./auth");
const products = require("./products");
const inventory = require("./inventory");
const ai = require("./ai");
const users = require("./users");
const exportRoutes = require("./export");
const statistic = require("./statistic");

router.use("/auth", auth);
router.use("/products", products);
router.use("/inventory", inventory);
router.use("/ai", ai);
router.use("/users", users);
router.use("/export", exportRoutes);
router.use("/statistic", statistic);

module.exports = router;
