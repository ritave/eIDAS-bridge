/* eslint-disable jsx-a11y/alt-text */
import "./Card.scss";
import chip from "./chip.svg";
import connectivity from "./connectivity.svg";
import fox from "./fox.svg";

export type Props = {
  upperText?: string;
  ens?: string;
  rotate?: boolean;
  float?: boolean;
};

export function Card({ ens, rotate, upperText, float }: Props) {
  let result = (
    <div className="card">
      <p className="upper-text">{upperText}</p>
      <div className="chip-group">
        <img src={chip} />
        <img src={connectivity} className="connectivity" />
      </div>
      <p className="ens">{ens}</p>
      <img src={fox} className="fox" />
    </div>
  );
  if (float) {
    result = <div className="float">{result}</div>;
  }
  if (rotate) {
    result = <div className="rotate">{result}</div>;
  }
  return result;
}
