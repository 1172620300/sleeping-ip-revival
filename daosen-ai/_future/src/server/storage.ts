import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface FileStorage {
  put(key: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}
function storagePath(key: string): string {
  const root = path.resolve(process.env.STORAGE_PATH ?? "./storage");
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`) || key.includes("..")) throw new Error("Invalid storage key");
  return target;
}
export class LocalFileStorage implements FileStorage {
  async put(key: string, bytes: Uint8Array) {
    const file = storagePath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: "wx" });
  }
  async get(key: string) { return new Uint8Array(await readFile(storagePath(key))); }
}
/** Future adapter contract. No fallback to public paths or client-side credentials. */
export interface S3CompatibleStorage extends FileStorage {
  signedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
export const storage: FileStorage = new LocalFileStorage();
