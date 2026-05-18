import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { convertTheme } from "monaco-vscode-textmate-theme-converter/lib/cjs";
import darkModernTheme from "./default-themes/dark_modern.json";
import darkPlusTheme from "./default-themes/dark_plus.json";
import darkVsTheme from "./default-themes/dark_vs.json";
import hcBlackTheme from "./default-themes/hc_black.json";
import hcLightTheme from "./default-themes/hc_light.json";
import lightModernTheme from "./default-themes/light_modern.json";
import lightPlusTheme from "./default-themes/light_plus.json";
import lightVsTheme from "./default-themes/light_vs.json";

const defaultThemes: Record<string, string> = {
  "Default Dark Modern": "dark_modern",
  "Dark+": "dark_plus",
  "Default Dark+": "dark_plus",
  "Dark (Visual Studio)": "dark_vs",
  "Visual Studio Dark": "dark_vs",
  "Dark High Contrast": "hc_black",
  "Default High Contrast": "hc_black",
  "Light High Contrast": "hc_light",
  "Default High Contrast Light": "hc_light",
  "Default Light Modern": "light_modern",
  "Light+": "light_plus",
  "Default Light+": "light_plus",
  "Light (Visual Studio)": "light_vs",
  "Visual Studio Light": "light_vs",
};

const defaultThemePathCandidates: string[][] = [
  ["src", "integrations", "theme", "default-themes"],
  ["src", "integrations", "theme-defaults", "themes"], // legacy path
  ["out", "integrations", "theme", "default-themes"],
  ["out", "integrations", "theme-defaults", "themes"], // legacy path
  ["dist", "integrations", "theme", "default-themes"],
  ["dist", "integrations", "theme-defaults", "themes"], // legacy path
];

const bundledDefaultThemes: Record<string, unknown> = {
  "dark_modern.json": darkModernTheme,
  "dark_plus.json": darkPlusTheme,
  "dark_vs.json": darkVsTheme,
  "hc_black.json": hcBlackTheme,
  "hc_light.json": hcLightTheme,
  "light_modern.json": lightModernTheme,
  "light_plus.json": lightPlusTheme,
  "light_vs.json": lightVsTheme,
};

function parseThemeString(themeString: string | undefined): any {
  themeString = themeString
    ?.split("\n")
    .filter((line) => {
      return !line.trim().startsWith("//");
    })
    .join("\n");
  return JSON.parse(themeString ?? "{}");
}

function normalizeDefaultThemeFilename(filename: string): string {
  const withoutPrefix = filename.replace(/^\.?[\\/]/, "");
  return path.basename(withoutPrefix);
}

async function readDefaultThemeFile(filename: string): Promise<string> {
  const normalizedFilename = normalizeDefaultThemeFilename(filename);
  const extensionRoot = getExtensionUri().fsPath;

  for (const pathParts of defaultThemePathCandidates) {
    const candidatePath = path.join(
      extensionRoot,
      ...pathParts,
      normalizedFilename,
    );
    try {
      return await fs.readFile(candidatePath, "utf-8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") {
        continue;
      }
      throw error;
    }
  }

  const bundledTheme = bundledDefaultThemes[normalizedFilename];
  if (bundledTheme) {
    return JSON.stringify(bundledTheme);
  }

  throw new Error(
    `Default theme file not found in packaged extension: ${normalizedFilename}`,
  );
}

export async function getTheme() {
  let currentTheme = undefined;
  const colorTheme =
    vscode.workspace.getConfiguration("workbench").get<string>("colorTheme") ||
    "Default Dark Modern";

  try {
    for (let i = vscode.extensions.all.length - 1; i >= 0; i--) {
      if (currentTheme) {
        break;
      }
      const extension = vscode.extensions.all[i];
      if (extension.packageJSON?.contributes?.themes?.length > 0) {
        for (const theme of extension.packageJSON.contributes.themes) {
          if (theme.label === colorTheme) {
            const themePath = path.join(extension.extensionPath, theme.path);
            currentTheme = await fs.readFile(themePath, "utf-8");
            break;
          }
        }
      }
    }

    if (currentTheme === undefined && defaultThemes[colorTheme]) {
      const filename = `${defaultThemes[colorTheme]}.json`;
      currentTheme = await readDefaultThemeFile(filename);
    }

    // Strip comments from theme
    let parsed = parseThemeString(currentTheme);

    if (parsed.include) {
      const includeThemeString = await readDefaultThemeFile(parsed.include);
      const includeTheme = parseThemeString(includeThemeString);
      parsed = mergeJson(parsed, includeTheme);
    }

    const converted = convertTheme(parsed);

    converted.base = (
      ["vs", "hc-black"].includes(converted.base)
        ? converted.base
        : colorTheme.includes("Light")
          ? "vs"
          : "vs-dark"
    ) as any;

    return converted;
  } catch (e) {
    console.log("Error loading color theme: ", e);
  }
  return undefined;
}

type JsonObject = { [key: string]: any };
export function mergeJson(
  first: JsonObject,
  second: JsonObject,
  mergeBehavior?: "merge" | "overwrite",
  mergeKeys?: { [key: string]: (a: any, b: any) => boolean },
): any {
  const copyOfFirst = JSON.parse(JSON.stringify(first));

  try {
    for (const key in second) {
      const secondValue = second[key];

      if (!(key in copyOfFirst) || mergeBehavior === "overwrite") {
        // New value
        copyOfFirst[key] = secondValue;
        continue;
      }

      const firstValue = copyOfFirst[key];
      if (Array.isArray(secondValue) && Array.isArray(firstValue)) {
        // Array
        if (mergeKeys?.[key]) {
          // Merge keys are used to determine whether an item form the second object should override one from the first
          const keptFromFirst: any[] = [];
          firstValue.forEach((item: any) => {
            if (
              !secondValue.some((item2: any) => mergeKeys[key](item, item2))
            ) {
              keptFromFirst.push(item);
            }
          });
          copyOfFirst[key] = [...keptFromFirst, ...secondValue];
        } else {
          copyOfFirst[key] = [...firstValue, ...secondValue];
        }
      } else if (
        typeof secondValue === "object" &&
        typeof firstValue === "object"
      ) {
        // Object
        copyOfFirst[key] = mergeJson(firstValue, secondValue, mergeBehavior);
      } else {
        // Other (boolean, number, string)
        copyOfFirst[key] = secondValue;
      }
    }
    return copyOfFirst;
  } catch (e) {
    console.error("Error merging JSON", e, copyOfFirst, second);
    return {
      ...copyOfFirst,
      ...second,
    };
  }
}

function getExtensionUri(): vscode.Uri {
  return vscode.extensions.getExtension("valkyrlabsinc.valoride-dev")!
    .extensionUri;
}
