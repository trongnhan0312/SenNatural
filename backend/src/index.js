const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const prisma = require("./prismaClient");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => res.send("Sen Natural API"));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
