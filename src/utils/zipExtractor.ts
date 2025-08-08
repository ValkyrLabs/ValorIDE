import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import fetch from "node-fetch"
import AdmZip from "adm-zip"

/**
 * Downloads a zip file from the given URL and extracts it to the target directory.
 * Uses VSCode's workspace.fs API for file operations.
 * @param url The download URL (signed or direct)
 * @param targetDir The absolute path to extract to
 * @param applicationName Optional application name to create a subfolder for extraction
 */
export async function downloadAndExtractZip(url: string, targetDir: string, applicationName?: string): Promise<void> {
	// Download zip to memory
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to download zip: ${res.statusText}`)
	const buffer = Buffer.from(await res.arrayBuffer())

	// If applicationName is provided, create a subfolder with that name
	const extractDir = applicationName ? path.join(targetDir, applicationName) : targetDir

	// Extract zip using adm-zip
	const zip = new AdmZip(buffer)
	const zipEntries = zip.getEntries()

	for (const entry of zipEntries) {
		const entryPath = path.join(extractDir, entry.entryName)
		if (entry.isDirectory) {
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(entryPath))
		} else {
			// Ensure parent directory exists
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(entryPath)))
			// Write file
			await vscode.workspace.fs.writeFile(vscode.Uri.file(entryPath), entry.getData())
		}
	}
}

/**
 * Extracts a local zip file to the target directory.
 * @param zipFilePath The absolute path to the zip file
 * @param targetDir The absolute path to extract to
 * @param applicationName Optional application name to create a subfolder for extraction
 */
export async function extractLocalZip(zipFilePath: string, targetDir: string, applicationName?: string): Promise<void> {
	// Read zip file from disk
	const buffer = await fs.promises.readFile(zipFilePath)

	// If applicationName is provided, create a subfolder with that name
	const extractDir = applicationName ? path.join(targetDir, applicationName) : targetDir

	// Extract zip using adm-zip
	const zip = new AdmZip(buffer)
	const zipEntries = zip.getEntries()

	for (const entry of zipEntries) {
		const entryPath = path.join(extractDir, entry.entryName)
		if (entry.isDirectory) {
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(entryPath))
		} else {
			// Ensure parent directory exists
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(entryPath)))
			// Write file
			await vscode.workspace.fs.writeFile(vscode.Uri.file(entryPath), entry.getData())
		}
	}
}
