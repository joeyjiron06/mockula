import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import mockula, { http } from "./client";

beforeAll(() => mockula.listen());
beforeEach(() => mockula.resetHandlers());
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
});
