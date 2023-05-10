import { useCallback, useState } from "react";

export type MachineConfig = {
  initial: string;
  states: Record<string, { on: Record<string, string> }>;
};

export function useStateMachine(config: MachineConfig) {
  const [current, setCurrent] = useState(config.initial);
  const send = useCallback(
    (event: string) => {
      const next = config.states[current].on[event];
      if (next === undefined) {
        console.error(
          `Invalid transition from state "${current}" on event "${event}"`
        );
      } else {
        setCurrent(next);
      }
    },
    [config, current]
  );
  return { current, send };
}
