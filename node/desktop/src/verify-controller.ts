import EventEmitter from "events";
import assert from "assert";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import readline from "readline";

export declare interface VerifyController {
  on(event: "out", listener: (data: string) => void): this;
}

export class VerifyController extends EventEmitter {
  child: ChildProcessWithoutNullStreams | null;

  start() {
    this.kill();

    console.log("Verify, start");

    const cwd = path.resolve(__dirname, "crypto");
    const bin = path.join(cwd, "bridge.bin");
    const args =
      "-pkey EIDAS.G16.pk -system EIDAS.G16.ccs -vkey EIDAS.G16.vk".split(" ");
    console.log("Verify, starting", bin, args);

    this.child = spawn(bin, args, {
      windowsHide: true,
      cwd,
    });
    readline
      .createInterface({ input: this.child.stdout, terminal: false })
      .on("line", (line) => {
        console.log("Verify, out:", line);
        this.emit("out", line);
      });
  }

  send(data: string) {
    console.log("Verify, in:", data);
    assert(this.child !== null);
    this.child.stdin.write(`${data}\n`);
  }

  kill() {
    console.log("Verify, kill");
    this.child?.kill();
    this.child = null;
  }
}
