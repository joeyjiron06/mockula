import { Hono } from "hono";
import { serve } from "@hono/node-server";
import mockulaServer from "./server";

console.log("hono server starting...");
const app = new Hono();

app.get("/", (c) => c.text("Hono!"));
app.get("/external-api-data", async (c) => {
  const response = await fetch("https://external.api");
  const externalData = await response.json();

  return c.json(externalData);
});

if (process.env.NODE_ENV === "test") {
  await mockulaServer.init();
} else {
  console.log("mockulaServer is not initialized in production mode.");
}

const server = serve(
  {
    fetch: app.fetch,
    port: 9696,
  },
  (info) => {
    console.log(`hono server is running at http://localhost:${info.port}`);
  }
);

process.on("SIGINT", () => {
  console.log("Received SIGINT, closing server...");
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, closing server...");
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
