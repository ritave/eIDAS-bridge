import fox from "./fox.svg";
import { Button, Props } from "../Button/Button";

export function FoxButton(props: Props) {
  return (
    <Button
      onClick={props.onClick}
      content={
        <>
          <img src={fox} />
          {props.content}
        </>
      }
    />
  );
}
