import { Hono } from "hono";
import { serve, ServerType } from "@hono/node-server";

type MockulaHttpHandlerFunction = (
  request?: Request
) => Response | Promise<Response>;

type HandlerEntry = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string | RegExp;
  handler: MockulaHttpHandlerFunction;
};

class MockulaHttpHandler {
  private readonly handlers: Array<HandlerEntry> = [];

  get(url: string | RegExp, handler: MockulaHttpHandlerFunction) {
    this.handlers.push({
      method: "GET",
      url,
      handler,
    });
  }

  clear() {
    this.handlers.splice(0, this.handlers.length);
  }

  async handleRequest(request: Request): Promise<Response | null> {
    const url = request.url;
    const method = request.method;

    // Find the first matching handler
    for (const handlerEntry of this.handlers) {
      // Check if method matches
      if (handlerEntry.method !== method.toUpperCase()) {
        continue;
      }

      // Check if URL matches
      let urlMatches = false;
      if (typeof handlerEntry.url === "string") {
        urlMatches = handlerEntry.url === url;
      } else if (handlerEntry.url instanceof RegExp) {
        urlMatches = handlerEntry.url.test(url);
      }

      if (urlMatches) {
        // Call the handler function with the request
        return await handlerEntry.handler(request);
      }
    }

    // No handler found
    return null;
  }
}

class MockulaClient {
  public readonly httpHandler: MockulaHttpHandler = new MockulaHttpHandler();
  private server: null | ServerType = null;
  private port: number = 9966;

  async listen(port: number = 9966) {
    this.port = port;

    const app = new Hono();

    app.post("/internal-request", async (c) => {
      try {
        const requestData = await c.req.json();

        // Validate the request data structure
        if (!requestData.url || !requestData.method) {
          return c.json(
            { error: "Missing required fields: url and method" },
            400
          );
        }

        // Create a Request object from the request data
        const request = new Request(requestData.url, {
          method: requestData.method,
          headers: requestData.headers || {},
          body: requestData.body || undefined,
        });

        const response = await this.httpHandler.handleRequest(request);

        if (response === null) {
          return c.json(
            {
              error: `No handler found for this request:
url: ${request.url}
method: ${request.method}`,
            },
            404
          );
        }

        // Convert the Response object to something we can return
        const responseBody = await response.text();
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return c.json({
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
        });
      } catch (error) {
        console.error("Error handling request:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    });

    return new Promise((resolve) => {
      this.server = serve(
        {
          fetch: app.fetch,
          port: this.port,
        },
        (info) => {
          resolve(info);
        }
      );
    });
  }

  async resetHandlers() {
    this.httpHandler.clear();
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        return resolve(); // Nothing to close
      }

      this.server.close((error) => {
        this.server = null;

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

const defaultMockulaClient = new MockulaClient();

export const http = defaultMockulaClient.httpHandler;

// singleton instance of MockulaClient
export default defaultMockulaClient;
