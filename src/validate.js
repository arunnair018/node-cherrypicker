// Shared by the socket protocol and the saved server list: what counts as an acceptable branch name.
// No leading "-" (can't be read as a git option), no "..", only plain path-like characters.
export const BRANCH_RE = /^(?!-)(?!.*\.\.)[\w./-]+$/;
