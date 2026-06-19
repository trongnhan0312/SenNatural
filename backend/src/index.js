const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes");
const prisma = require("./prismaClient");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => res.send("Sen Natural API"));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
