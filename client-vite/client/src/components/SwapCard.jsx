import { useEffect, useRef, useState } from "react";

const OUT = 220; // ms the outgoing side takes to leave
const IN = 340; // ms the incoming side takes to arrive

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Swaps between the form (front) and the run view (back).
 * Forward: the form fades out while drifting up, the page scrolls to the top, and the run view rises in
 * from below. Reverse (dismiss) plays the same motion backwards.
 * The outgoing side stays mounted until it has finished leaving, so nothing resets mid-fade.
 */
const SwapCard = ({ side, front, back }) => {
  const [shown, setShown] = useState(side);
  const [phase, setPhase] = useState("idle"); // idle | out | in
  const [dir, setDir] = useState("forward");
  const last = useRef({ front, back });
  const root = useRef(null);
  if (front) last.current.front = front;
  if (back) last.current.back = back;

  useEffect(() => {
    if (side === shown) return;
    const reduce = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    if (reduce) {
      setShown(side);
      root.current?.focus({ preventScroll: true });
      return;
    }
    setDir(side === "back" ? "forward" : "reverse");
    setPhase("out");
    const swap = setTimeout(() => {
      setShown(side);
      setPhase("in");
      root.current?.focus({ preventScroll: true });
    }, OUT);
    const done = setTimeout(() => setPhase("idle"), OUT + IN);
    return () => {
      clearTimeout(swap);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  const node =
    shown === "front"
      ? side === "front" ? front : last.current.front
      : side === "back" ? back : last.current.back;

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`swap ${phase !== "idle" ? `is-${phase}-${dir}` : ""}`}
    >
      {node}
    </div>
  );
};

export default SwapCard;
