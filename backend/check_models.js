const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("MODELS_LIST_SUCCESS");
      data.models.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("MODELS_LIST_FAILED", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}
run();
