import { useId } from "react";

// Twin cherries on a joined stem. `mono` draws it in currentColor (for use on a coloured button).
export const CherryLogo = ({ size = 28, mono = false }) => {
  // gradient ids must be unique per instance: several logos can be on the page at once, and a
  // duplicate id resolves to the first one, which may sit inside a hidden element (then it paints nothing)
  const uid = useId().replace(/:/g, "");
  const body = `cherry-body-${uid}`;
  const leaf = `cherry-leaf-${uid}`;
  return (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={body} x1="10" y1="30" x2="56" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#c9b8ff" />
        <stop offset="0.55" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#5b34d6" />
      </linearGradient>
      <linearGradient id={leaf} x1="36" y1="6" x2="56" y2="14" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#a78bfa" />
        <stop offset="1" stopColor="#7c5cff" />
      </linearGradient>
    </defs>
    <path d="M20 34c1-12 8-20 17-25M44 36c-1-12-4-20-7-27" stroke={mono ? "currentColor" : "#a78bfa"} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M37 9c5-5 13-5 19-1-4 7-13 9-19 1Z" fill={mono ? "currentColor" : `url(#${leaf})`} />
    <circle cx="19" cy="45" r="13" fill={mono ? "currentColor" : `url(#${body})`} />
    <circle cx="44" cy="47" r="12" fill={mono ? "currentColor" : `url(#${body})`} />
    {!mono && (
      <>
        <ellipse cx="14.5" cy="40" rx="3.2" ry="2" fill="#fff" opacity="0.35" transform="rotate(-35 14.5 40)" />
        <ellipse cx="40" cy="42.5" rx="3" ry="1.9" fill="#fff" opacity="0.3" transform="rotate(-35 40 42.5)" />
      </>
    )}
  </svg>
  );
};

const Svg = ({ children, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {children}
  </svg>
);
export const CheckIcon = (p) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
export const XIcon = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const MinusIcon = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const CopyIcon = (p) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>;
export const ExternalIcon = (p) => <Svg {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Svg>;
export const BranchIcon = (p) => <Svg {...p}><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 8v8M18 10c0 5-12 2-12 6" /></Svg>;
export const GithubIcon = (p) => <Svg {...p}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></Svg>;
export const FolderIcon = (p) => <Svg {...p}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></Svg>;
export const ServerIcon = (p) => <Svg {...p}><rect x="2" y="3" width="20" height="7" rx="2" /><rect x="2" y="14" width="20" height="7" rx="2" /><path d="M6 7h.01M6 18h.01" /></Svg>;
export const ChevronIcon = ({ direction = "left", ...p }) => <Svg {...p}><path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></Svg>;
export const ArrowRightIcon = (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const SparkleIcon = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M13 5c.8 5.6 3.4 8.2 9 9-5.6.8-8.2 3.4-9 9-.8-5.6-3.4-8.2-9-9 5.6-.8 8.2-3.4 9-9Z" />
    <path d="M24.5 3c.4 2.7 1.6 3.9 4.3 4.3-2.7.4-3.9 1.6-4.3 4.3-.4-2.7-1.6-3.9-4.3-4.3 2.7-.4 3.9-1.6 4.3-4.3Z" />
  </svg>
);
export const HistoryIcon = (p) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></Svg>;
export const MenuIcon = (p) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>;
export const Spinner = ({ size = 16 }) => <span className="spinner" style={{ width: size, height: size }} />;
