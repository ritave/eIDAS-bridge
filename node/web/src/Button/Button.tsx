import "./Button.scss";

export type Props = {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  content?: React.ReactElement;
  className?: string;
};

export function Button({ content, onClick, className }: Props) {
  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
