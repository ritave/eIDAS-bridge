/* eslint-disable jsx-a11y/alt-text */
import { useEffect, useRef } from "react";
import "./Card.scss";
import chip from "./chip.svg";
import connectivity from "./connectivity.svg";
import fox from "./fox.svg";

export type Props = {
  upperText?: string;
  ens?: string;
  float?: boolean;
  trackMouse?: boolean;
};

const CONSTRAINT = 400;

export function Card({ ens, upperText, float, trackMouse }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const x = event.clientX;
      const y = event.clientY;

      window.requestAnimationFrame(() => {
        const el = cardRef.current;

        if (!el) {
          return;
        }
        const box = el.getBoundingClientRect();

        const calcX = -(y - box.y - box.height / 2) / CONSTRAINT;
        const calcY = (x - box.x - box.width / 2) / CONSTRAINT;

        const transform = `perspective(50px)
                           rotateX(${calcX}deg)
                           rotateY(${calcY}deg)`;

        el.style.transform = transform;
      });
    };

    if (trackMouse) {
      window.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [trackMouse]);
  let result = (
    <div className="card" ref={cardRef}>
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
  return result;
}
