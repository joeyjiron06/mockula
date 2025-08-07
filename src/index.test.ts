import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import mockula, { http } from "./client";

beforeAll(() => mockula.listen());
beforeEach(() => mockula.resetHandlers());
beforeEach(() =>
  fetch(
    "http://localhost:9696/changeMockulaServer/onUnhandledRequest/default",
    { method: "POST" }
  )
);
afterAll(() => mockula.close());

describe("index", () => {
  it("should return the data from the server when / is called which has no http requests", async () => {
    // Make a request to the example server's root endpoint
    // This endpoint doesn't make any external HTTP requests, so it should work normally
    const response = await fetch("http://localhost:9696/");
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("Hono!");
  });

  it("should return the mocked data from the server when /mocked-data is called", async () => {
    http.get("https://external.api/", () => {
      return Response.json({
        message: "Mocked response from external API",
      });
    });

    const response = await fetch("http://localhost:9696/external-api-data");
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      message: "Mocked response from external API",
    });
  });

  it("should warn if there is an unhandled request", async () => {
    fetch("http://localhost:9696/changeMockulaServer/onUnhandledRequest/warn", {
      method: "POST",
    });
    const response = await fetch("http://localhost:9696/external-api-data");
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("");
  });

  it("should error if there is an unhandled request", async () => {
    fetch(
      "http://localhost:9696/changeMockulaServer/onUnhandledRequest/error",
      {
        method: "POST",
      }
    );
    const response = await fetch("http://localhost:9696/external-api-data");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe("Internal Server Error");
  });

  it("should return an error if there is an unhandled request for option bypass", async () => {
    fetch(
      "http://localhost:9696/changeMockulaServer/onUnhandledRequest/bypass",
      {
        method: "POST",
      }
    );
    const response = await fetch("http://localhost:9696/external-api-data");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe("Internal Server Error");
  });

  it("should return a custom response when onUnhandledRequest is a function", async () => {
    fetch(
      "http://localhost:9696/changeMockulaServer/onUnhandledRequest/custom",
      {
        method: "POST",
      }
    );
    const response = await fetch("http://localhost:9696/another-external-api");
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("Custom response for another external API");
  });
});
