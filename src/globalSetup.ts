import waitOn from "wait-on";
import { ChildProcess, exec, spawn } from "node:child_process";

let childProcess: ChildProcess | null = null;

const DEBUG = false;

export async function setup() {
  await startExampleServer();
}

export async function teardown() {
  await stopExampleServer();
}

export async function startExampleServer() {
  childProcess = exec("pnpm run start-example-server", {
    env: {
      NODE_ENV: "test",
    },
  });

  childProcess.stdout?.on("data", (data) => {
    if (DEBUG) {
      console.log(`EXAMPLE_SERVER: ${data}`);
    }
  });

  await waitOn({
    resources: ["http-get://localhost:9696/"],
    // log: true,
    // verbose: true,
  });
}

export async function stopExampleServer() {
  if (childProcess) {
    if (process.platform === "win32" && childProcess.pid) {
      spawn("taskkill", ["/pid", childProcess.pid.toString(), "/t", "/f"]);
    } else {
      childProcess.kill("SIGTERM"); // Use SIGTERM first, then SIGKILL if needed
    }

    childProcess = null;
    await waitOn({
      resources: [`http://localhost:9696/`],
      reverse: true, // Wait for the server to become unavailable
      // log: true,
      // verbose: true,
    });
  }
}
