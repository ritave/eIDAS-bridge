import "./StatusText.scss";

export type Props = {
  main: string;
  subText?: string;
};
export function StatusText({ main, subText }: Props) {
  return (
    <div className="statusText">
      <p className="mainText">{main}</p>
      <p className="subText">{subText}</p>
    </div>
  );
}
