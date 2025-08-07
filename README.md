<br />

<h1 align="center">
  🎩
  <br />
  Mockula
</h1>
<p align="center">API mocking for server rendered apps.</p>

This is a dead simple library that allows you to mock network requests on our backend server but controlling the responses from your tests.

## Usage

**server.ts**

```ts
// ...server code here (like nextjs, remix, react-router)
// example:
app.get("my-api", (req, res) => {
  const response = await fetch("https://external.api");
  const json = await response.json();
  res.json({
    ...json,
    extraDetails: "hello",
  });
});

if (process.env.NODE_ENV === "TEST") {
  const mockulaServer = await import("mockula/server");
  await mockulaServer.init();
}
```

**server.test.ts**

```ts
import mockula, { http } from "mockula/client";

beforeAll(() => mockula.listen());
afterEach(() => mockula.resetHandlers());
afterAll(() => mockula.close());

test("it should return the mocked data", () => {
  http.get("https://external.api", (request: node.Request) => {
    return Response.json({
      mockedData: "hello",
    });
  });

  const response = await fetch("http://localhost:3000/my-api");
  const json = await response.json();

  expect(json).toEqual({
    mockedData: "hello",
    extraDetails: "hello",
  });
});
```

## API Options

### Server Options

```ts
await mockulaServer.init({
  // ...options here
});
```

- **port** - a port for the mockula server to connect

### Client Options

```ts
await mockula.listen({
  // ...options here
});
```

- **port** - a port for the mockula client to connect
