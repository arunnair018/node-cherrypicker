import { useEffect, useState } from "react";

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = (e) => setMatches(e.matches);
    mq.addEventListener("change", on);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
};
