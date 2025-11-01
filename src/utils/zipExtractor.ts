import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import AdmZip from "adm-zip";

const ZIP_SIGNATURES: Array<readonly [number, number, number, number]> = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

function sanitizeFolderName(name: string): string {
  // Allow spaces and dots; remove path separators and control chars
  return name.replace(/[\n\r\t\\/\0]/g, "").trim();
}

function basenameNoExt(filename: string): string {
  const base = path.basename(filename);
  const idx = base.lastIndexOf(".");
  return idx > 0 ? base.slice(0, idx) : base;
}

function deriveVersionedFolderName(
  opts: { filename?: string; url?: string; fallbackName?: string },
): string {
  // Try content filename
  let raw = opts.filename || "";
  if (!raw && opts.url) {
    try {
      const u = new URL(opts.url);
      raw = u.pathname.split("/").pop() || "";
    } catch {
      // ignore
    }
  }
  let name = raw ? basenameNoExt(raw) : opts.fallbackName || `project-${Date.now()}`;

  name = sanitizeFolderName(name);

  // Ensure a version prefix exists (e.g., v1., v2-beta.)
  // If name already starts with something like v<alnum/.->.
  if (!/^v[0-9][\w.-]*\./i.test(name)) {
    const fallback = opts.fallbackName ? sanitizeFolderName(opts.fallbackName) : "project";
    // If filename had no version, construct one with v1.<fallback>
    name = `v1.${fallback}`;
  }
  return name;
}

export function isZipBuffer(data: Uint8Array | Buffer | null | undefined): boolean {
  if (!data || data.length < 4) {
    return false;
  }

  return ZIP_SIGNATURES.some((signature) =>
    signature.every((byte, index) => data[index] === byte),
  );
}

/**
 * Downloads a zip file from the given URL and extracts it to the target directory.
 * Uses VSCode's workspace.fs API for file operations.
 * @param url The download URL (signed or direct)
 * @param targetDir The absolute path to extract to
 * @param applicationName Optional application name to create a subfolder for extraction
 */
export async function downloadAndExtractZip(
  url: string,
  targetDir: string,
  applicationName?: string,
): Promise<string> {
  // Download zip to memory
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download zip: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Determine versioned folder name from Content-Disposition filename or URL
  const contentDisp = res.headers.get("content-disposition") || "";
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(
    contentDisp,
  );
  const headerFilename = decodeURIComponent(match?.[1] || match?.[2] || "");
  const versionedName = deriveVersionedFolderName({
    filename: headerFilename,
    url,
    fallbackName: applicationName,
  });

  const extractDir = path.join(targetDir, versionedName);

  // Extract zip using adm-zip
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  for (const entry of zipEntries) {
    const entryPath = path.join(extractDir, entry.entryName);
    if (entry.isDirectory) {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(entryPath));
    } else {
      // Ensure parent directory exists
      await vscode.workspace.fs.createDirectory(
        vscode.Uri.file(path.dirname(entryPath)),
      );
      // Write file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(entryPath),
        entry.getData(),
      );
    }
  }
  return extractDir;
}

/**
 * Extracts a local zip file to the target directory.
 * @param zipFilePath The absolute path to the zip file
 * @param targetDir The absolute path to extract to
 * @param applicationName Optional application name to create a subfolder for extraction
 */
export async function extractLocalZip(
  zipFilePath: string,
  targetDir: string,
  applicationName?: string,
): Promise<string> {
  // Read zip file from disk
  const buffer = await fs.promises.readFile(zipFilePath);

  // Prefer deriving folder from filename (which may include version); fallback to provided applicationName
  const versionedName = deriveVersionedFolderName({
    filename: path.basename(zipFilePath),
    fallbackName: applicationName,
  });
  const extractDir = path.join(targetDir, versionedName);

  // Extract zip using adm-zip
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  for (const entry of zipEntries) {
    const entryPath = path.join(extractDir, entry.entryName);
    if (entry.isDirectory) {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(entryPath));
    } else {
      // Ensure parent directory exists
      await vscode.workspace.fs.createDirectory(
        vscode.Uri.file(path.dirname(entryPath)),
      );
      // Write file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(entryPath),
        entry.getData(),
      );
    }
  }
  return extractDir;
}
