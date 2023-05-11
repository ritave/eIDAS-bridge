import EventEmitter from "events";
import assert from "assert";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import readline from "readline";

export declare interface VerifyController {
  on(event: "out", listener: (data: object) => void): this;
}

export class VerifyController extends EventEmitter {
  child: ChildProcessWithoutNullStreams | null;

  start() {
    this.kill();

    console.log("verify start");

    const bin = path.join(__dirname, "signer.bin");
    console.log("verify, starting", bin);

    this.child = spawn(bin, {
      windowsHide: true,
    });
    readline
      .createInterface({ input: this.child.stdout, terminal: false })
      .on("line", (line) => {
        console.log("Verify, line:", line);
        this.emit("out", JSON.parse(line));
      });
  }

  send(data: string) {
    console.log("verify send:", data);
    assert(this.child !== null);
    this.child.stdin.write(`${data}\n`);
  }

  kill() {
    console.log("verify kill");
    this.child?.kill();
    this.child = null;
  }
}
