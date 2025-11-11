import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRelayService } from './ToolRelayService';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
describe('ToolRelayService', () => {
    let toolRelayService;
    let mockCommunicationService;
    let mockController;
    let testDir;
    beforeEach(async () => {
        // Create a temporary test directory
        testDir = path.join(tmpdir(), `valor-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        mockCommunicationService = {
            on: vi.fn(),
            sendMessage: vi.fn(),
            ready: true
        };
        mockController = {};
        toolRelayService = new ToolRelayService(mockCommunicationService, mockController);
    });
    describe('executeReadFile', () => {
        it('should throw error when trying to read a directory', async () => {
            // Create a test directory
            const dirPath = path.join(testDir, 'test-directory');
            await fs.mkdir(dirPath);
            // Access private method via reflection
            const executeReadFile = toolRelayService.executeReadFile.bind(toolRelayService);
            await expect(executeReadFile({ path: dirPath })).rejects.toThrow(/is a directory.*Use list_files/);
        });
        it('should successfully read a file', async () => {
            // Create a test file
            const filePath = path.join(testDir, 'test-file.txt');
            const fileContent = 'Hello, ValorIDE!';
            await fs.writeFile(filePath, fileContent);
            // Access private method via reflection
            const executeReadFile = toolRelayService.executeReadFile.bind(toolRelayService);
            const result = await executeReadFile({ path: filePath });
            expect(result).toBe(fileContent);
        });
        it('should throw error when file does not exist', async () => {
            const nonExistentPath = path.join(testDir, 'non-existent.txt');
            // Access private method via reflection
            const executeReadFile = toolRelayService.executeReadFile.bind(toolRelayService);
            await expect(executeReadFile({ path: nonExistentPath })).rejects.toThrow(/File not found/);
        });
    });
});
//# sourceMappingURL=ToolRelayService.test.js.map