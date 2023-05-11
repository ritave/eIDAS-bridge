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

const send = (ws: WebSocket, data: OutputMessage | string): Promise<void> => {
  let resolve: () => void;
  let reject: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const message = typeof data === "string" ? data : JSON.stringify(data);
  console.log("WS, send", message);
  ws.send(message, (err) => {
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
    cert?: CertificateCreationResult;
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
        console.log("WS, verify out:", data);
        await send(ws, data);
      });

      ws.on("error", console.error);

      ws.on("message", async (data) => {
        const message: InputMessage = JSON.parse(data.toString());
        console.log("WS, received", message);
        switch (message.id) {
          case "LINK":
            console.log("WS, LINK");
            verify.start();
            break;
          case "SIGN":
            console.log(
              `WS, SIGN, pin: ${message.pin}, challenge: ${message.challenge}`
            );
            verify.send(message.pin);
            verify.send(message.challenge);
            break;
        }
      });
    });
  }

  async close() {
    assert(this.wss !== null);
    await promisify(this.wss.close.bind(this.wss));
    this.wss = null;
  }
}
