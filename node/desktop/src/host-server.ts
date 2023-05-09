import https from "https";
import pem, {
  CertificateCreationResult,
  CertificateCreationOptions,
} from "pem";
import { promisify } from "util";
import Static from "node-static";
import assert from "assert";

export class HttpServer {
  server: https.Server | null = null;

  async start(opts: { port: number; public: string }): Promise<void> {
    assert(this.server === null);
    const cert = await (
      promisify(pem.createCertificate) as (
        _: CertificateCreationOptions
      ) => Promise<CertificateCreationResult>
    )({
      days: 7,
      selfSigned: true,
    });

    const staticServe = new Static.Server(opts.public);

    this.server = https
      .createServer(
        {
          key: cert.clientKey,
          cert: cert.certificate,
        },
        (req, res) => {
          req
            .addListener("end", () => {
              staticServe.serve(req, res);
            })
            .resume();
        }
      )
      .listen(opts.port);
  }

  async close() {
    assert(this.server !== null);
    this.server.closeAllConnections();
    await promisify(this.server.close.bind(this.server))();
    this.server = null;
  }
}
