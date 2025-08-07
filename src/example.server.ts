import { Hono } from "hono";
import { serve } from "@hono/node-server";
import mockulaServer from "./server";

console.log("hono server starting...");
const app = new Hono();

app.get("/", (c) => c.text("Hono!"));
app.get("/external-api-data", async (c) => {
  const response = await fetch("https://external.api");
  const text = await response.text();

  return c.text(text);
});
app.get("/another-external-api", async (c) => {
  const response = await fetch("https://another.external.api");
  const text = await response.text();

  return c.text(text);
});
app.get("/some--external-api", async (c) => {
  const response = await fetch("https://another.external.api");
  const text = await response.text();

  return c.text(text);
});
app.post("/changeMockulaServer/onUnhandledRequest/default", async (c) => {
  await mockulaServer.close();
  await mockulaServer.init();
  return c.text("done!");
});
app.post("/changeMockulaServer/onUnhandledRequest/error", async (c) => {
  await mockulaServer.close();
  await mockulaServer.init({ onUnhandledRequest: "error" });
  return c.text("done!");
});
app.post("/changeMockulaServer/onUnhandledRequest/bypass", async (c) => {
  await mockulaServer.close();
  await mockulaServer.init({ onUnhandledRequest: "bypass" });
  return c.text("done!");
});
app.post("/changeMockulaServer/onUnhandledRequest/custom", async (c) => {
  await mockulaServer.close();
  await mockulaServer.init({
    onUnhandledRequest: (req) => {
      if (req.url === "https://another.external.api/") {
        return new Response("Custom response for another external API");
      }
      return new Response("Custom unhandled request", { status: 400 });
    },
  });
});

if (process.env.NODE_ENV === "test") {
  await mockulaServer.init();
} else {
  console.log("mockulaServer is not initialized in production mode.");
}

serve(
  {
    fetch: app.fetch,
    port: 9696,
  },
  (info) => {
    console.log(`hono server is running at http://localhost:${info.port}`);
  }
);
