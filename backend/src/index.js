const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

const envPath = path.resolve(__dirname, "../.env");
const envExamplePath = path.resolve(__dirname, "../.env.example");

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("Auto-created .env file from .env.example");
}

dotenv.config({ path: envPath });

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
