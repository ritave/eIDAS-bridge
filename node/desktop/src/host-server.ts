import https from "https";
import http from "http";
import { CertificateCreationResult } from "pem";
import { promisify } from "util";
import Static from "node-static";
import assert from "assert";

export class HttpServer {
  server: https.Server | http.Server | null = null;

  async start(opts: {
    port: number;
    public: string;
    cert?: CertificateCreationResult;
  }): Promise<void> {
    assert(this.server === null);

    const staticServe = new Static.Server(opts.public);

    /*
    this.server = https
      .createServer(
        {
          key: opts.cert.clientKey,
          cert: opts.cert.certificate,
        },
        (req, res) => {
          req
            .addListener("end", () => {
              staticServe.serve(req, res);
            })
            .resume();
        }
      )
      .listen(opts.port);*/
    this.server = http
      .createServer((req, res) => {
        req
          .addListener("end", () => {
            staticServe.serve(req, res);
          })
          .resume();
      })
      .listen(opts.port);
  }

  async close() {
    assert(this.server !== null);
    this.server.closeAllConnections();
    await promisify(this.server.close.bind(this.server))();
    this.server = null;
  }
}
