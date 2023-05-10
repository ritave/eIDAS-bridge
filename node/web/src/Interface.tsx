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

const machineConfig: MachineConfig = {
  initial: "display",
  states: {
    display: { on: { link: "insertCard" } },
    insertCard: { on: { inserted: "enterPin" } },
    enterPin: { on: { entered: "generatingProof" } },
    generatingProof: { on: { generated: "verify" } },
    verify: { on: { submit: "verifying" } },
    verifying: { on: { verified: "display" } },
  },
};

export function Interface() {
  const { address, isConnected } = useAccount();
  const { status: ensStatus, data: ensName } = useEnsName({ address });
  const { current, send } = useStateMachine(machineConfig);
  const [hack_text, hack_set] = useState<string | undefined>(undefined);

  useEffect(() => {
    let handle: any = undefined;

    if (
      ["insertCard", "enterPin", "generatingProof", "verifying"].includes(
        current
      )
    ) {
      const TIME = 3500;
      const event = Object.keys(machineConfig.states[current].on)[0];
      if (event === "verified") {
        handle = setTimeout(() => {
          send(event);
          hack_set("Verified by European Union");
        }, TIME);
      } else {
        handle = setTimeout(() => send(event), TIME);
      }
    }

    return () => clearTimeout(handle);
  }, [current, send]);

  const isLoading =
    ensStatus === "loading" ||
    current === "verifying" ||
    current === "generatingProof";

  let sub = null;
  switch (current) {
    case "display":
      if (!isConnected) {
        sub = <ConnectButton />;
      } else if (hack_text === undefined) {
        sub = (
          <Button
            content={<>Link your identity</>}
            onClick={() => send("link")}
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
        <StatusText
          main="Enter your PIN"
          subText="Enter your qualified signature PIN"
        />
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
          onClick={() => send("submit")}
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
          upperText={hack_text ?? ""}
          ens={ens}
          //rotate float
          float
        />
        <div className="belowCentered">{sub}</div>
      </div>
    </div>
  );
}
