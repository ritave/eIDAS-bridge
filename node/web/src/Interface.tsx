import "./Interface.scss";
import logo from "./logo.svg";
import { MetamaskBoxAnimation } from "./fox/MetamaskBoxAnimation";
import { Card } from "./Card/Card";
import GridLoader from "react-spinners/GridLoader";

import { useAccount, useEnsName } from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { MachineConfig, useStateMachine } from "./useStateMachine";
import { StatusText } from "./StatusText/StatusText";
import { useEffect, useState } from "react";
import { Button } from "./Button/Button";
import { FoxButton } from "./FoxButton/FoxButton";
import { PinInput } from "./PinInput/PinInput";

type EnteredEvent = { id: "ENTERED"; pin: string };

type Event =
  | { id: "LINK" }
  | { id: "INSERTED" }
  | EnteredEvent
  | { id: "SIGNING" }
  | { id: "GENERATED" }
  | { id: "VERIFY" }
  | { id: "VERIFYING" }
  | { id: "DISPLAY" };

type Context = { pin?: string; proof?: string; upperText?: string };

const machineConfig: MachineConfig<Event, Context> = {
  initial: "display",
  context: {},
  states: {
    display: { on: { LINK: "insertCard" } },
    insertCard: { on: { INSERTED: "enterPin" } },
    enterPin: {
      on: {
        ENTERED: {
          target: "signing",
          actions: [
            (context, event) => {
              context.pin = (event as EnteredEvent).pin;
            },
          ],
        },
      },
    },
    signing: {
      on: {
        SIGNED: {
          target: "generatingProof",
          actions: [
            (context) => {
              delete context.pin;
            },
          ],
        },
      },
    },
    generatingProof: { on: { GENERATED: "verify" } },
    verify: { on: { SUBMIT: "verifying" } },
    verifying: {
      on: {
        VERIFIED: {
          target: "display",
          actions: [
            (context) => {
              context.upperText = "Verified by European Union";
            },
          ],
        },
      },
    },
  },
};

export function Interface() {
  const { address, isConnected } = useAccount();
  const { status: ensStatus, data: ensName } = useEnsName({ address });
  const { current, send } = useStateMachine(machineConfig);

  // hacky hack of hackiness
  useEffect(() => {
    let handle: any = undefined;

    if (
      ["insertCard", "generatingProof", "verifying", "signing"].includes(
        current.id
      )
    ) {
      const TIME = 3500;
      const event = Object.keys(machineConfig.states[current.id].on)[0];
      handle = setTimeout(() => send(event), TIME);
    }

    return () => clearTimeout(handle);
  }, [current, send]);

  const isLoading =
    ensStatus === "loading" ||
    ["verifying", "generatingProof", "signing"].includes(current.id);

  let sub = null;
  switch (current.id) {
    case "display":
      if (!isConnected) {
        sub = <ConnectButton />;
      } else if (current.context?.upperText === undefined) {
        sub = (
          <Button
            content={<>Link your identity</>}
            onClick={() => send("LINK")}
          />
        );
      }
      break;
    case "insertCard":
      sub = (
        <StatusText
          main="Insert your card"
          subText="Please insert your identity card to computer"
        />
      );
      break;
    case "enterPin":
      sub = (
        <>
          <StatusText
            main="Enter your PIN"
            subText="Enter your qualified signature PIN"
          />
          <PinInput
            length={4}
            onSubmit={(pin) => send({ id: "ENTERED", pin })}
          />
        </>
      );
      break;
    case "signing":
      sub = (
        <>
          <StatusText
            main="Communicating with ID"
            subText="Communicating with your ID to confirm your identity"
          />
          <PinInput length={4} disabled={true} value={current.context?.pin} />
        </>
      );
      break;
    case "generatingProof":
      sub = (
        <StatusText
          main="Generating proof"
          subText="Generating anonymous proof of your identity"
        />
      );
      break;
    case "verify":
      sub = (
        <FoxButton
          content={<>Verify on-chain</>}
          onClick={() => send("SUBMIT")}
        />
      );
      break;
    case "verifying":
      sub = (
        <StatusText
          main="Verifying proof"
          subText="Waiting for on-chain transaction to go through"
        />
      );
      break;
    default:
      console.error(`State "${current.id}" not handled`);
  }

  let ens = ensName ?? address ?? "";
  if (ens.length > 12) {
    ens = ens.slice(0, 9) + "...";
  }
  return (
    <div className="App">
      <div className="logo">
        <img src={logo} />
        {isLoading ? (
          <GridLoader
            color="#ffffff"
            size={4}
            cssOverride={{ paddingLeft: "8px" }}
          />
        ) : null}
      </div>
      <MetamaskBoxAnimation
        phi={0}
        theta={Math.PI / 2}
        distance={800}
        hemisphereAxis={[0.1, 0.5, 0.2]}
        hemisphereColor1={[1, 1, 1]}
        hemisphereColor0={[1, 1, 1]}
        fogColor={[0.5, 0.5, 0.5]}
        interiorColor0={[1, 0.5, 0]}
        interiorColor1={[0.5, 0.2, 0]}
        noGLFallback={<div>WebGL not supported :(</div>}
        enableZoom={false}
        followMouse={false}
        allowDragging={false}
      />
      <div className="centered">
        <Card
          upperText={current.context?.upperText}
          ens={ens}
          trackMouse
          float
        />
        <div className="belowCentered">{sub}</div>
      </div>
    </div>
  );
}
