import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A tiny encrypted file that remembers your server (target branch) list across browsers, restarts and time.
 *
 * What the encryption is, honestly: AES-256-GCM with a key derived (scrypt) from your OS user name and home folder.
 * The file is unreadable to a person who opens it, and tamper-evident, and it only decrypts for the same OS user.
 * It is NOT protection against someone who has access to your machine and this source code (the app has to be able to
 * decrypt it on its own). Don't put secrets in it: it holds branch names only, never your GitHub token.
 *
 * File format: "NCP1" | salt(16) | iv(12) | auth tag(16) | ciphertext.   Writes are atomic and keep a .bak.
 */
const MAGIC = Buffer.from("NCP1");
const FILE = "state.dat";
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Where to look/write. STORE_DIR, if set, is used exclusively. Otherwise: the app's own folder, then the home folder
// (the fallback when the app folder isn't writable). Reading checks them in that order so nothing is ever missed.
const candidates = () =>
  process.env.STORE_DIR
    ? [process.env.STORE_DIR]
    : [path.join(appDir, ".cherrypicker-data"), path.join(os.homedir(), ".node-cherrypicker")];

const secret = () => ["node-cherrypicker", os.userInfo().username, os.homedir()].join("\0");
const deriveKey = (salt) => crypto.scryptSync(secret(), salt, 32);

const encrypt = (obj) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(salt), iv);
  cipher.setAAD(MAGIC);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
};

const decrypt = (buf) => {
  if (buf.length < 48 || !buf.subarray(0, 4).equals(MAGIC)) throw new Error("not a store file");
  const salt = buf.subarray(4, 20);
  const iv = buf.subarray(20, 32);
  const tag = buf.subarray(32, 48);
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(salt), iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(48)), decipher.final()]).toString("utf8"));
};

const tryRead = (file) => {
  try {
    return decrypt(fs.readFileSync(file));
  } catch {
    return null;
  }
};

/** The saved state, or null if nothing (readable) has been saved yet. */
export const loadState = () => {
  for (const dir of candidates()) {
    for (const name of [FILE, `${FILE}.bak`]) {
      const state = tryRead(path.join(dir, name));
      if (state) return state;
    }
  }
  return null;
};

/** Where the file lives (for display/debugging): the first candidate that already has one, else null. */
export const storePath = () => candidates().map((d) => path.join(d, FILE)).find((f) => fs.existsSync(f)) || null;

const writableDir = () => {
  for (const dir of candidates()) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      /* try the next place */
    }
  }
  throw new Error("No writable folder to save settings in.");
};

/** Merge `patch` into the saved state and write it back (atomically, keeping the previous version as .bak). */
export const saveState = (patch) => {
  const dir = writableDir();
  const file = path.join(dir, FILE);
  const next = { ...(loadState() || {}), ...patch, version: 1, updatedAt: new Date().toISOString() };

  if (fs.existsSync(file)) {
    if (tryRead(file)) fs.copyFileSync(file, `${file}.bak`);
    else fs.renameSync(file, `${file}.corrupt-${Date.now()}`); // keep an unreadable file instead of destroying it
  }
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, encrypt(next), { mode: 0o600 });
  fs.renameSync(tmp, file);
  return next;
};
