import * as path from "path";
import { resolveZipEntryPath } from "./zipExtractor";

describe("ZIP extraction paths", () => {
  const root = path.resolve("/tmp/valoride-generated-project");

  it("keeps normal archive entries inside the extraction root", () => {
    expect(resolveZipEntryPath(root, "ui/src/App.tsx")).toBe(
      path.join(root, "ui", "src", "App.tsx"),
    );
  });

  it("rejects path traversal entries", () => {
    const unsafeEntries = [
      "../outside.txt",
      "ui/../../outside.txt",
      "..\\outside.txt",
      "/absolute.txt",
      "C:/absolute.txt",
    ];
    for (const entryName of unsafeEntries) {
      expect(() => resolveZipEntryPath(root, entryName)).toThrow(
        "Unsafe ZIP entry path",
      );
    }
  });
});
