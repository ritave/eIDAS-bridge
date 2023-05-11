import "./Button.scss";

export type Props = {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  content?: React.ReactElement;
};

export function Button({ content, onClick }: Props) {
  return <button onClick={onClick}>{content}</button>;
}
