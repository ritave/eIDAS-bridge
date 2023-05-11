import { CertificateCreationResult } from "pem";
import https from "https";
import assert from "assert";
import { WebSocket, WebSocketServer } from "ws";
import { promisify } from "util";
import { VerifyController } from "./verify-controller";

type InputMessage =
  | { id: "LINK" }
  | { id: "SIGN"; pin: string; challenge: string };

type OutputMessage =
  | { id: "INSERTED" }
  | { id: "SIGNED" }
  | { id: "GENERATED"; proof: string };

const HACK_DELAY_MS = 2500;
const delay = (ms: number) => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  setTimeout(resolve, ms);
  return promise;
};

const send = (ws: WebSocket, json: OutputMessage): Promise<void> => {
  let resolve: () => void;
  let reject: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  console.log("WS, sending", json);
  ws.send(JSON.stringify(json), (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
  return promise;
};

export class WsServer {
  server: https.Server | null = null;
  wss: WebSocketServer | null = null;

  async start(opts: {
    port: number;
    cert: CertificateCreationResult;
  }): Promise<void> {
    //assert(this.server === null && this.wss === null);
    assert(this.wss === null);

    /*
    this.server = https.createServer({
      key: opts.cert.clientKey,
      cert: opts.cert.certificate,
    });*/
    this.wss = new WebSocketServer({ port: opts.port });

    this.wss.on("connection", (ws) => {
      console.log("WS, connection");
      const verify = new VerifyController();
      verify.on("out", async (data) => {
        console.log("ws, out:", data);
        await send(ws, data as any);
      });

      ws.on("error", console.error);

      ws.on("message", async (data) => {
        const message: InputMessage = JSON.parse(data.toString());
        console.log("WS, Received", message);
        switch (message.id) {
          case "LINK":
            verify.start();
            /*
            await delay(HACK_DELAY_MS);
            send(ws, { id: "INSERTED" });*/
            break;
          case "SIGN":
            console.log(
              `SIGN, pin: ${message.pin}, challenge: ${message.challenge}`
            );
            verify.send(message.pin);
            verify.send(message.challenge);
            /*
            await delay(HACK_DELAY_MS);
            await send(ws, { id: "SIGNED" });
            await delay(HACK_DELAY_MS);
            await send(ws, {
              id: "GENERATED",
              proof: `{ response: "foobar - ${message.pin} - ${message.challenge}" }`,
            });*/
            break;
        }
      });
    });

    //this.server.listen(opts.port);
  }

  async close() {
    //assert(this.server !== null && this.wss !== null);
    assert(this.wss !== null);
    await promisify(this.wss.close.bind(this.wss));
    //this.server.closeAllConnections();
    //await promisify(this.server.close.bind(this.server))();
    //this.server = null;
    this.wss = null;
  }
}
