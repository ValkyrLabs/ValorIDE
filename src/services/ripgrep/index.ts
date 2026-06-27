import * as vscode from "vscode";
import * as childProcess from "child_process";
import * as fs from "fs/promises";
import type { Dirent } from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileExistsAtPath } from "@utils/fs";
import "@utils/path";
import { ValorIDEIgnoreController } from "@core/ignore/ValorIDEIgnoreController";

/*
This file provides functionality to perform regex searches on files using ripgrep.
Inspired by: https://github.com/DiscreteTom/vscode-ripgrep-utils

Key components:
1. getBinPath: Locates the ripgrep binary within the VSCode installation.
2. execRipgrep: Executes the ripgrep command and returns the output.
3. regexSearchFiles: The main function that performs regex searches on files.
   - Parameters:
     * cwd: The current working directory (for relative path calculation)
     * directoryPath: The directory to search in
     * regex: The regular expression to search for (Rust regex syntax)
     * filePattern: Optional glob pattern to filter files (default: '*')
   - Returns: A formatted string containing search results with context

The search results include:
- Relative file paths
- 2 lines of context before and after each match
- Matches formatted with pipe characters for easy reading

Usage example:
const results = await regexSearchFiles('/path/to/cwd', '/path/to/search', 'TODO:', '*.ts');

rel/path/to/app.ts
│----
│function processData(data: any) {
│  // Some processing logic here
│  // TODO: Implement error handling
│  return processedData;
│}
│----

rel/path/to/helper.ts
│----
│  let result = 0;
│  for (let i = 0; i < input; i++) {
│    // TODO: Optimize this function for performance
│    result += Math.pow(i, 2);
│  }
│----
*/

const isWindows = /^win/.test(process.platform);
const binName = isWindows ? "rg.exe" : "rg";

interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  match: string;
  beforeContext: string[];
  afterContext: string[];
}

const MAX_RESULTS = 300;
const FALLBACK_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "out",
  "dist",
  "build",
  ".cache",
  "tmp",
  "temp",
  "__pycache__",
  ".venv",
  "venv",
]);

export async function getBinPath(
  vscodeAppRoot: string,
): Promise<string | undefined> {
  const checkPath = async (root: string, pkgFolder: string) => {
    const fullPath = path.join(root, pkgFolder, binName);
    return (await fileExistsAtPath(fullPath)) ? fullPath : undefined;
  };

  const candidateRoots = [
    vscodeAppRoot,
    process.cwd(),
    path.resolve(__dirname, "../../.."),
    path.resolve(__dirname, "../../../.."),
  ];
  const packageFolders = [
    "node_modules/@vscode/ripgrep/bin/",
    "node_modules/vscode-ripgrep/bin",
    "node_modules.asar.unpacked/vscode-ripgrep/bin/",
    "node_modules.asar.unpacked/@vscode/ripgrep/bin/",
  ];

  for (const root of candidateRoots) {
    for (const folder of packageFolders) {
      const found = await checkPath(root, folder);
      if (found) {
        return found;
      }
    }
  }

  const pathProbe = childProcess.spawnSync(
    isWindows ? "where" : "command",
    isWindows ? [binName] : ["-v", binName],
    { encoding: "utf8", shell: !isWindows },
  );
  const pathMatch = pathProbe.stdout
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (pathMatch) {
    return pathMatch;
  }

  return (
    childProcess.spawnSync(binName, ["--version"], { encoding: "utf8" })
      .status === 0
      ? binName
      : undefined
  );
}

async function execRipgrep(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const rgProcess = childProcess.spawn(bin, args);
    // cross-platform alternative to head, which is ripgrep author's recommendation for limiting output.
    const rl = readline.createInterface({
      input: rgProcess.stdout,
      crlfDelay: Infinity, // treat \r\n as a single line break even if it's split across chunks. This ensures consistent behavior across different operating systems.
    });

    let output = "";
    let lineCount = 0;
    const maxLines = MAX_RESULTS * 5; // limiting ripgrep output with max lines since there's no other way to limit results. it's okay that we're outputting as json, since we're parsing it line by line and ignore anything that's not part of a match. This assumes each result is at most 5 lines.

    rl.on("line", (line) => {
      if (lineCount < maxLines) {
        output += line + "\n";
        lineCount++;
      } else {
        rl.close();
        rgProcess.kill();
      }
    });

    let errorOutput = "";
    rgProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    rl.on("close", () => {
      if (errorOutput) {
        reject(new Error(`ripgrep process error: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
    rgProcess.on("error", (error) => {
      reject(new Error(`ripgrep process error: ${error.message}`));
    });
  });
}

const matchesFilePattern = (filePath: string, filePattern?: string) => {
  if (!filePattern || filePattern === "*") {
    return true;
  }
  const basename = path.basename(filePath);
  if (filePattern.startsWith("*.")) {
    return basename.endsWith(filePattern.slice(1));
  }
  return basename === filePattern || filePath.endsWith(filePattern);
};

async function fallbackRegexSearchFiles(
  cwd: string,
  directoryPath: string,
  regex: string,
  filePattern?: string,
  valorideIgnoreController?: ValorIDEIgnoreController,
): Promise<string> {
  let matcher: RegExp;
  try {
    matcher = new RegExp(regex);
  } catch (error) {
    return `Invalid regex: ${error instanceof Error ? error.message : String(error)}`;
  }

  const results: SearchResult[] = [];
  const visit = async (dir: string): Promise<void> => {
    if (results.length >= MAX_RESULTS) {
      return;
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) {
        return;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!FALLBACK_SKIP_DIRS.has(entry.name)) {
          await visit(fullPath);
        }
        continue;
      }
      if (!entry.isFile() || !matchesFilePattern(fullPath, filePattern)) {
        continue;
      }
      if (
        valorideIgnoreController &&
        !valorideIgnoreController.validateAccess(fullPath)
      ) {
        continue;
      }

      let text: string;
      try {
        const stat = await fs.stat(fullPath);
        if (stat.size > 1_000_000) {
          continue;
        }
        text = await fs.readFile(fullPath, "utf8");
      } catch {
        continue;
      }

      const lines = text.split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (results.length >= MAX_RESULTS) {
          break;
        }
        matcher.lastIndex = 0;
        const line = lines[index];
        if (!matcher.test(line)) {
          continue;
        }
        results.push({
          filePath: fullPath,
          line: index + 1,
          column: Math.max(line.search(matcher), 0),
          match: `${line}\n`,
          beforeContext: index > 0 ? [`${lines[index - 1]}\n`] : [],
          afterContext:
            index < lines.length - 1 ? [`${lines[index + 1]}\n`] : [],
        });
      }
    }
  };

  await visit(directoryPath);
  return formatResults(results, cwd);
}

export async function regexSearchFiles(
  cwd: string,
  directoryPath: string,
  regex: string,
  filePattern?: string,
  valorideIgnoreController?: ValorIDEIgnoreController,
): Promise<string> {
  const vscodeAppRoot = vscode.env.appRoot;
  const rgPath = await getBinPath(vscodeAppRoot);

  if (!rgPath) {
    return fallbackRegexSearchFiles(
      cwd,
      directoryPath,
      regex,
      filePattern,
      valorideIgnoreController,
    );
  }

  const args = [
    "--json",
    "-e",
    regex,
    "--glob",
    filePattern || "*",
    "--context",
    "1",
    directoryPath,
  ];

  let output: string;
  try {
    output = await execRipgrep(rgPath, args);
  } catch {
    return "No results found";
  }
  const results: SearchResult[] = [];
  let currentResult: Partial<SearchResult> | null = null;

  output.split("\n").forEach((line) => {
    if (line) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "match") {
          if (currentResult) {
            results.push(currentResult as SearchResult);
          }
          currentResult = {
            filePath: parsed.data.path.text,
            line: parsed.data.line_number,
            column: parsed.data.submatches[0].start,
            match: parsed.data.lines.text,
            beforeContext: [],
            afterContext: [],
          };
        } else if (parsed.type === "context" && currentResult) {
          if (parsed.data.line_number < currentResult.line!) {
            currentResult.beforeContext!.push(parsed.data.lines.text);
          } else {
            currentResult.afterContext!.push(parsed.data.lines.text);
          }
        }
      } catch (error) {
        console.error("Error parsing ripgrep output:", error);
      }
    }
  });

  if (currentResult) {
    results.push(currentResult as SearchResult);
  }

  // Filter results using ValorIDEIgnoreController if provided
  const filteredResults = valorideIgnoreController
    ? results.filter((result) =>
        valorideIgnoreController.validateAccess(result.filePath),
      )
    : results;

  return formatResults(filteredResults, cwd);
}

function formatResults(results: SearchResult[], cwd: string): string {
  const groupedResults: { [key: string]: SearchResult[] } = {};

  let output = "";
  if (results.length >= MAX_RESULTS) {
    output += `Showing first ${MAX_RESULTS} of ${MAX_RESULTS}+ results. Use a more specific search if necessary.\n\n`;
  } else {
    output += `Found ${results.length === 1 ? "1 result" : `${results.length.toLocaleString()} results`}.\n\n`;
  }

  // Group results by file name
  results.slice(0, MAX_RESULTS).forEach((result) => {
    const relativeFilePath = path.relative(cwd, result.filePath);
    if (!groupedResults[relativeFilePath]) {
      groupedResults[relativeFilePath] = [];
    }
    groupedResults[relativeFilePath].push(result);
  });

  for (const [filePath, fileResults] of Object.entries(groupedResults)) {
    output += `${filePath.toPosix()}\n│----\n`;

    fileResults.forEach((result, index) => {
      const allLines = [
        ...result.beforeContext,
        result.match,
        ...result.afterContext,
      ];
      allLines.forEach((line) => {
        output += `│${line?.trimEnd() ?? ""}\n`;
      });

      if (index < fileResults.length - 1) {
        output += "│----\n";
      }
    });

    output += "│----\n\n";
  }

  return output.trim();
}
