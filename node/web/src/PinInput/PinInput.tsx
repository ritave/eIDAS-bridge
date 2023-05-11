import { useEffect, useMemo, useRef, useState } from "react";
import "./PinInput.scss";

export type Props = {
  onSubmit?: (pin: string) => void;
  length?: number;
  disabled?: boolean;
  value?: string;
};

export function PinInput({ length, onSubmit, disabled, value }: Props) {
  const myLength = length ?? 4;

  const refs = useRef<(HTMLInputElement | null)[]>(Array(myLength).fill(null));
  const [pin, setPin] = useState<string[]>(Array(myLength).fill(""));

  useEffect(() => {
    if (value !== undefined) {
      setPin(Array(...value));
    }
    if (myLength < pin.length) {
      setPin(pin.slice(undefined, myLength));
    } else if (myLength > pin.length) {
      setPin(pin.concat(Array(myLength - pin.length).fill("")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, myLength]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (value === undefined) {
      pin[index] = e.target.value;
      setPin([...pin]);
      console.log(pin);
    }

    const allFilled = pin.every((v) => v !== "");
    if (allFilled && onSubmit) {
      for (let i = 0; i < myLength; i++) {
        const ref = refs.current[i];
        if (ref !== null) {
          ref.disabled = true;
        }
      }
      onSubmit(pin.join(""));
    } else if (!allFilled && e.target.value !== "") {
      for (let i = index + 1; i < myLength; i++) {
        if (!refs.current[i]?.value.length) {
          refs.current[i]?.focus();
          break;
        }
      }
    }
  };

  const inputs = [];
  for (let i = 0; i < myLength; i++) {
    refs.current[i] = null;
    inputs.push(
      <input
        ref={(ref) => (refs.current[i] = ref)}
        maxLength={1}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        type="tel"
        onChange={(e) => onInput(e, i)}
        disabled={disabled}
        value={pin[i]}
        key={i}
      />
    );
  }

  return <div className="pinInput">{inputs}</div>;
}
