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
      setCurrent((state) => {
        const myEvent: any = typeof event === "string" ? { id: event } : event;
        const transition = config.states[state.id].on[myEvent.id];
        if (transition === undefined) {
          throw new Error(
            `Invalid transition from state "${state.id}" on event "${event}"`
          );
        }
        const coercedTransition =
          typeof transition === "string" ? { target: transition } : transition;
        coercedTransition.actions?.forEach((action) =>
          action(state.context, myEvent)
        );
        const next = {
          id: coercedTransition.target,
          context: state.context,
        };
        return next;
      });
    },
    [config]
  );
  return { current, send };
}
