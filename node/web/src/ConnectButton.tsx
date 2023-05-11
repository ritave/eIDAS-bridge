import { useConfig, useConnect } from "wagmi";
import { FoxButton } from "./FoxButton/FoxButton";

export type Props = {
  onSuccess?: () => void;
};

export function ConnectButton({ onSuccess }: Props) {
  const { connectors } = useConfig();
  const { connect } = useConnect({ connector: connectors[0], onSuccess });
  return <FoxButton onClick={() => connect()} content={<>Connect</>} />;
}
