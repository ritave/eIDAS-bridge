import "./Interface.scss";
import logo from "./logo.svg";
import { MetamaskBoxAnimation } from "./fox/MetamaskBoxAnimation";
import { Card } from "./Card/Card";
import GridLoader from "react-spinners/GridLoader";

import {
  mainnet,
  useAccount,
  useContractRead,
  useEnsAddress,
  useEnsName,
} from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { MachineConfig, useStateMachine } from "./useStateMachine";
import { StatusText } from "./StatusText/StatusText";
import { Button } from "./Button/Button";
import { FoxButton } from "./FoxButton/FoxButton";
import { PinInput } from "./PinInput/PinInput";
import { useWebSocket } from "react-use-websocket/dist/lib/use-websocket";
import { ReadyState } from "react-use-websocket/dist/lib/constants";
import { sepolia, writeContract, waitForTransaction } from "@wagmi/core";
import { DEPLOY, METADATA } from "./contract";
import { useHash } from "./useHash";
import { RevokeButton } from "./RevokeButton/RevokeButton";

type Proof = {
  A: [bigint, bigint];
  B: [[bigint, bigint], [bigint, bigint]];
  C: [bigint, bigint];
  Input: [bigint];
};

type EnteredEvent = { id: "ENTERED"; pin: string };
type GeneratedEvent = { id: "GENERATED"; proof: Proof };
type SubmitEvent = { id: "VERIFY" | "REVOKE"; hash: string };
const submitAction = (context: Context, event: Event) => {
  context.hash = (event as SubmitEvent).hash;
};

type Event =
  | { id: "LINK" }
  | { id: "INSERTED" }
  | EnteredEvent
  | { id: "SIGNING" }
  | GeneratedEvent
  | SubmitEvent
  | { id: "VERIFYING" }
  | { id: "DISPLAY" }
  | { id: "REVOKED" };

type Context = {
  pin?: string;
  proof?: Proof;
  upperText?: string;
  hash?: string;
};

const machineConfig: MachineConfig<Event, Context> = {
  initial: "display",
  context: {},
  states: {
    display: {
      on: {
        LINK: "insertCard",
        REVOKE: { target: "revoking", actions: [submitAction] },
      },
    },
    revoking: { on: { REVOKED: "display" } },
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
    generatingProof: {
      on: {
        GENERATED: {
          target: "verify",
          actions: [
            (context, event) => {
              context.proof = (event as GeneratedEvent).proof;
            },
          ],
        },
      },
    },
    verify: {
      on: {
        VERIFY: {
          target: "verifying",
          actions: [submitAction],
        },
      },
    },
    verifying: {
      on: {
        VERIFIED: {
          target: "display",
        },
      },
    },
  },
};

export function Interface() {
  const [hash, setHash] = useHash();
  const { address, isConnected } = useAccount();

  const walletOrHash =
    hash === "" || hash.endsWith(".eth") ? address : hash.slice(1);

  const { data: ensAddress, isLoading: isEnsAddressLoading } = useEnsAddress({
    name: hash.endsWith(".eth") ? hash.slice(1) : undefined,
    chainId: mainnet.id,
  });

  const displayAddress = ensAddress ?? walletOrHash;

  const { data: isVerified, isLoading: isVerifiedLoading } = useContractRead({
    abi: METADATA.output.abi,
    address: DEPLOY.sepolia,
    chainId: sepolia.id,
    functionName: "isVerified",
    args: [displayAddress as any],
    enabled: displayAddress !== undefined,
    watch: true,
  });

  const { data: ensName, isLoading: isEnsLoading } = useEnsName({
    address: displayAddress as any,
    chainId: mainnet.id,
  });
  const { current, send } = useStateMachine(machineConfig);

  const onMessage = (e: MessageEvent) => {
    //const isBigNumber = (num: number) => !Number.isSafeInteger(+num);
    const yes = (..._: any[]) => true;
    const enquoteBigNumber = (
      jsonString: string,
      bigNumChecker: (_: number) => boolean
    ) =>
      jsonString.replaceAll(
        /([:\s\[,]*)(\d+)([\s,\]]*)/g,
        (matchingSubstr, prefix, bigNum, suffix) =>
          bigNumChecker(bigNum)
            ? `${prefix}"${bigNum}"${suffix}`
            : matchingSubstr
      );

    const message = JSON.parse(enquoteBigNumber(e.data, yes), (_, value) =>
      !isNaN(value) && yes(value) ? BigInt(value) : value
    );
    console.log("WS, in", message);
    send(message);
  };
  const { sendJsonMessage: wsSend, readyState: wsReady } = useWebSocket(
    "ws://localhost:8081",
    { onMessage }
  );

  const isLoading =
    isEnsAddressLoading ||
    isVerifiedLoading ||
    isEnsLoading ||
    wsReady !== ReadyState.OPEN ||
    ["verifying", "generatingProof", "signing", "revoking"].includes(
      current.id
    );

  let sub = null;
  switch (current.id) {
    case "display":
      if (!isConnected) {
        sub = <ConnectButton />;
      } else {
        if (
          wsReady === ReadyState.OPEN &&
          displayAddress === address &&
          !isVerified
        ) {
          sub = (
            <Button
              content={<>Link your identity</>}
              onClick={() => {
                send("LINK");
                wsSend({ id: "LINK" });
              }}
            />
          );
        } else if (displayAddress === address && isVerified) {
          sub = (
            <RevokeButton
              onClick={async () => {
                const { hash } = await writeContract({
                  address: DEPLOY.sepolia,
                  abi: METADATA.output.abi,
                  functionName: "revoke",
                  chainId: sepolia.id,
                });
                send({ id: "REVOKE", hash });
                await waitForTransaction({ chainId: sepolia.id, hash });
                setHash(address!);
                send("REVOKED");
              }}
            />
          );
        }
      }
      break;
    case "revoking":
      sub = (
        <StatusText
          main="Revoking identity"
          subText="Revoking identity for demo purpouses"
        />
      );
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
            length={6}
            onSubmit={(pin) => {
              send({ id: "ENTERED", pin });
              wsSend({
                id: "SIGN",
                pin,
                // we can only do 16 bytes challenge for the hackathon
                // non-checksummed lower 16 bytes of the address,
                //   makes it way easier to verify on-chain
                challenge: address?.slice(-32).toLowerCase(),
              });
            }}
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
          <PinInput length={6} disabled={true} value={current.context?.pin} />
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
          onClick={async () => {
            const { A, B, C, Input } = current.context.proof!;

            const { hash } = await writeContract({
              address: DEPLOY.sepolia,
              abi: METADATA.output.abi,
              functionName: "identityVerification",
              chainId: sepolia.id,
              args: [A, B, C, Input as any],
            });
            send({ id: "VERIFY", hash });
            await waitForTransaction({ chainId: sepolia.id, hash });
            setHash(address!);
            send("VERIFIED");
          }}
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

  let ens = ensName ?? displayAddress ?? "";
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
          upperText={isVerified ? "Verified by European Union" : undefined}
          ens={ens}
          trackMouse
          float
        />
        <div className="belowCentered">{sub}</div>
      </div>
    </div>
  );
}
