import { useCallback, useState } from "react";

export type MachineConfig<
  Event extends { id: string },
  Context extends object = object
> = {
  initial: string;
  context?: Context;
  states: Record<
    string,
    {
      on: Record<
        string,
        | string
        | {
            target: string;
            actions?: ((context: Context, event: Event) => void)[];
          }
      >;
    }
  >;
};

export function useStateMachine<
  Event extends { id: string } = { id: string },
  Context extends object = object
>(config: MachineConfig<Event, Context>) {
  const [current, setCurrent] = useState<{
    id: string;
    context: Context;
  }>({
    id: config.initial,
    context: config.context ?? ({} as any),
  });
  const send = useCallback(
    (event: string | Event) => {
      const myEvent: any = typeof event === "string" ? { id: event } : event;
      const transition = config.states[current.id].on[myEvent.id];
      if (transition === undefined) {
        console.error(
          `Invalid transition from state "${current.id}" on event "${event}"`
        );
      } else {
        const coercedTransition =
          typeof transition === "string" ? { target: transition } : transition;
        coercedTransition.actions?.forEach((action) =>
          action(current.context, myEvent)
        );
        const next = { id: coercedTransition.target, context: current.context };
        setCurrent(next);
      }
    },
    [config, current]
  );
  return { current, send };
}
