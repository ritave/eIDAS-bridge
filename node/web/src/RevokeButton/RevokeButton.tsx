import { Button, Props } from "../Button/Button";
import "./RevokeButton.scss";
import human from "./human.svg";

export function RevokeButton({ onClick }: Pick<Props, "onClick">) {
  return (
    <Button
      className="revoke"
      onClick={onClick}
      content={
        <>
          <img src={human} />
          Revoke identity
        </>
      }
    />
  );
}
