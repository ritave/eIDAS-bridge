import EventEmitter from "events";
import assert from "assert";
export type Status =
  | "inactive"
  | "waitingForCard"
  | "talkingCard"
  | "generatingProof";

const StateMachine: {
  initial: string;
  states: Record<string, { on: Record<string, string> }>;
} = {
  initial: "inactive",
  states: {
    inactive: { on: { next: "waitingForCard", reset: "inactive" } },
    waitingForCard: { on: { next: "talkingToCard", reset: "inactive" } },
    talkingToCard: { on: { next: "generatingProof", reset: "inactive" } },
    generatingProof: { on: { next: "inactive", reset: "inactive" } },
  },
} as const;

export class VerifyController extends EventEmitter {
  #state: string = StateMachine.initial;
  #data: any = undefined;

  get state() {
    return this.#state;
  }
  get data() {
    return this.#data;
  }

  private send(event: string, data?: any) {
    const nextState: string | undefined =
      StateMachine.states[this.#state].on[event];
    assert(nextState !== undefined);
    this.emit("transition", nextState, this.#state, data);
    this.#state = nextState;
    this.#data = data;
  }
}
