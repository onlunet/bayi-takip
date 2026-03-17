import type { IncomingMessage, ServerResponse } from "node:http";
import { app, ready } from "../apps/api/src/index";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app.server.emit("request", req, res);
}
