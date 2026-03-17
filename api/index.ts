import type { IncomingMessage, ServerResponse } from "node:http";

type FastifyModule = {
  app: {
    server: {
      emit: (event: "request", req: IncomingMessage, res: ServerResponse) => void;
    };
  };
  ready: Promise<unknown>;
};

let modulePromise: Promise<FastifyModule> | null = null;

async function loadFastifyModule(): Promise<FastifyModule> {
  if (!modulePromise) {
    // Vercel's Node runtime loads this handler as CommonJS.
    // Dynamic import keeps compatibility with ESM app source.
    modulePromise = import("../apps/api/src/index.js") as Promise<FastifyModule>;
  }
  return modulePromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { app, ready } = await loadFastifyModule();
  await ready;
  app.server.emit("request", req, res);
}
