const vitePath = __dirname + "/frontend/node_modules/vite";
const { createServer } = require(vitePath);
(async () => {
  const server = await createServer({
    root: __dirname + "/frontend",
    server: { host: true, port: 5173 },
  });
  await server.listen();
  console.log("Vite dev server running");
})();
