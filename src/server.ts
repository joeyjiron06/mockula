type MockulaServerOptions = {
  /**
   * The port on which the Mockula server will run.
   * If not specified, it will default to 9966.
   * @default 9966
   */
  port?: number;
};

const DEFAULT_OPTIONS = {
  port: 9966,
} satisfies MockulaServerOptions;

class MockulaServer {
  private options: MockulaServerOptions = DEFAULT_OPTIONS;
  private didInit: boolean = false;
  private originalFetch: typeof fetch | undefined;

  /**
   * Initializes the Mockula server.
   * This method overrides the fetch function to mock API responses.
   */
  async init(options: MockulaServerOptions = {}) {
    if (this.didInit) {
      console.warn(
        `⚠️ Mockula server is already initialized. Be sure to only call it once. 
If you need to reinitialize, call close() first.`
      );
      return;
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.didInit = true;

    // Store the original fetch function
    this.originalFetch = globalThis.fetch;

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
        (input instanceof Request && input.body
          ? await input.text()
          : undefined);

      // Forward the request to the Mockula server
      if (!this.originalFetch) {
        throw new Error("Original fetch function not available");
      }

      const mockulaResponse = await this.originalFetch(
        `http://localhost:${this.options.port}/request`,
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

  async close() {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = undefined;
    }
    this.didInit = false;
  }
}

// export a singleton instance of MockulaServer
export default new MockulaServer();
