type MockulaServerOptions = Partial<{
  /**
   * The port on which the Mockula server will run.
   * If not specified, it will default to 9966.
   * @default 9966
   */
  port: number;

  /**
   * The strategy to handle unhandled requests.
   * Can be 'warn', 'error', 'bypass', or a custom function.
   * - 'warn': Logs a warning for unhandled requests.
   * - 'error': Throws an error for unhandled requests.
   * - 'bypass': Allows the request to pass through without mocking.
   * - Custom function: A function that takes the request and returns a Response or Promise<Response>.
   * @default 'warn'
   */
  onUnhandledRequest:
    | "warn"
    | "error"
    | "bypass"
    | CustomUnhandledRequestStrategy;
}>;

type CustomUnhandledRequestStrategy = (
  request: Request
) => Response | Promise<Response>;

const DEFAULT_OPTIONS = {
  port: 9966,
  onUnhandledRequest: "warn",
} satisfies Required<MockulaServerOptions>;

class MockulaServer {
  private initialized: boolean = false;

  /**
   * Initializes the Mockula server.
   * This method overrides the fetch function to mock API responses.
   */
  async init(options?: MockulaServerOptions) {
    if (this.initialized) {
      console.warn(
        `⚠️ Mockula server is already initialized. Be sure to only call it once. 
If you need to reinitialize, call close() first.`
      );
      return;
    }

    const finalOptions = { ...DEFAULT_OPTIONS, ...options };

    mockGlobalFetch(finalOptions);

    this.initialized = true;
  }

  async close() {
    unmockGlobalFetch();
    this.initialized = false;
  }
}

let originalFetch: typeof fetch | undefined;

function mockGlobalFetch(options: Required<MockulaServerOptions>) {
  // Store the original fetch function
  originalFetch = globalThis.fetch;

  // Override the global fetch function
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    const headers =
      init?.headers || (input instanceof Request ? input.headers : {});
    const body =
      init?.body ||
      (input instanceof Request && input.body ? await input.text() : undefined);

    // Forward the request to the Mockula server
    if (!originalFetch) {
      throw new Error("Original fetch function not available");
    }

    const mockulaResponse = await originalFetch(
      `http://localhost:${options.port}/internal-request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          method,
          headers:
            headers instanceof Headers
              ? Object.fromEntries(headers.entries())
              : headers,
          body,
        }),
      }
    );

    console.log("mockulaResponse.status", mockulaResponse.status, options);
    if (mockulaResponse.status === 404) {
      if (options.onUnhandledRequest === "warn") {
        console.warn(`⚠️ No handler found for request:
URL: ${url}
Method: ${method}`);
      } else if (options.onUnhandledRequest === "error") {
        throw new Error(`No handler found for request:
URL: ${url}
Method: ${method}
If you want to allow unhandled requests, set the onUnhandledRequest option to 'bypass'.
`);
      } else if (options.onUnhandledRequest === "bypass") {
        return originalFetch(input, init);
      } else if (typeof options.onUnhandledRequest === "function") {
        return options.onUnhandledRequest(
          new Request(url, { method, headers, body })
        );
      }
    }

    const responseJson = await mockulaResponse.json();

    const {
      status,
      statusText,
      headers: responseHeaders,
      body: responseBody,
    } = responseJson;

    return new Response(responseBody, {
      status,
      statusText,
      headers: new Headers(responseHeaders),
    });
  };
}

function unmockGlobalFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

// export a singleton instance of MockulaServer
export default new MockulaServer();
