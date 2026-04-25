/**
 * DataTransfer (drag & drop) → files + relative paths, including dropped folders
 * (Chrome / Edge: webkitGetAsEntry + directory read).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const MEDIA_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|mp4|webm|mov|m4v|avi|mkv)$/i;

function isSkippableJunkName(name: string) {
  if (name === ".DS_Store" || name === "Thumbs.db") return true;
  if (name.startsWith("._")) return true;
  return false;
}

function keepMediaFile(file: File) {
  if (isSkippableJunkName(file.name)) return false;
  if (file.type.startsWith("image/") || file.type.startsWith("video/"))
    return true;
  return MEDIA_EXT.test(file.name);
}

function getFileFromFileEntry(
  fe: { file: (ok: (f: File) => void, err: (e: Error) => void) => void },
): Promise<File> {
  return new Promise((resolve, reject) => {
    fe.file((f) => resolve(f), (e) => reject(e));
  });
}

function readAllEntriesInDir(
  dr: { readEntries: (a: (e: any[]) => void, b: (e: Error) => void) => void },
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const out: any[] = [];
    const read = () => {
      dr.readEntries(
        (results: any[]) => {
          if (results.length === 0) {
            resolve(out);
            return;
          }
          out.push(...results);
          read();
        },
        (e) => {
          reject(e);
        },
      );
    };
    read();
  });
}

async function walkDirectory(
  dir: { createReader: () => any; name: string },
  pathPrefix: string,
): Promise<{ file: File; relPath: string }[]> {
  const allOut: { file: File; relPath: string }[] = [];
  const entries = await readAllEntriesInDir(dir.createReader());
  for (const ent of entries) {
    const name = (ent as { name: string }).name;
    const sub = pathPrefix + "/" + name;
    if (ent.isFile) {
      const f = await getFileFromFileEntry(
        ent as { file: (a: (f: File) => void, b: (e: Error) => void) => void },
      );
      if (keepMediaFile(f)) allOut.push({ file: f, relPath: sub });
    } else if (ent.isDirectory) {
      allOut.push(
        ...(await walkDirectory(ent as { createReader: () => any; name: string }, sub)),
      );
    }
  }
  return allOut;
}

function itemGetAsEntry(item: any): { isFile: boolean; isDirectory: boolean; name: string } | null {
  if (item.webkitGetAsEntry && typeof item.webkitGetAsEntry === "function") {
    return item.webkitGetAsEntry() as { isFile: boolean; isDirectory: boolean; name: string } | null;
  }
  return null;
}

export async function readDropDataTransfer(
  dataTransfer: DataTransfer,
): Promise<{ file: File; relPath: string }[]> {
  const out: { file: File; relPath: string }[] = [];
  for (const item of Array.from(dataTransfer.items) as any[]) {
    const entry = itemGetAsEntry(item);
    if (entry) {
      if (entry.isFile) {
        const fe = entry as unknown as {
          name: string;
          file: (a: (f: File) => void, b: (e: Error) => void) => void;
        };
        const f = await getFileFromFileEntry(fe);
        if (keepMediaFile(f)) out.push({ file: f, relPath: fe.name });
      } else if (entry.isDirectory) {
        const d = entry as { createReader: () => any; name: string; isFile: false; isDirectory: true };
        out.push(
          ...(await walkDirectory(
            d,
            d.name,
          )),
        );
      }
    } else if (item.kind === "file") {
      const f = item.getAsFile() as File | null;
      if (f && keepMediaFile(f)) out.push({ file: f, relPath: f.name });
    }
  }
  return out;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
