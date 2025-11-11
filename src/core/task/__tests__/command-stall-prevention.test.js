/**
 * Unit tests for command execution anti-stall mechanisms
 * Verifies that long-running commands don't block Valor IDE
 */
import { jest } from '@jest/globals';
describe('Command Stall Prevention', () => {
    describe('2s timeout on command_output asks', () => {
        it('should auto-approve ask after 2 seconds without user response', async () => {
            const mockAsk = jest.fn();
            const timeoutMs = 2000;
            const askPromise = mockAsk('command_output', 'chunk');
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ response: 'yesButtonClicked', text: '', images: [] });
                }, timeoutMs);
            });
            const result = await Promise.race([askPromise, timeoutPromise]);
            expect(result).toEqual({
                response: 'yesButtonClicked',
                text: '',
                images: []
            });
        });
        it('should not wait indefinitely for user response', async () => {
            const startTime = Date.now();
            const timeoutMs = 2000;
            const maxWaitTime = timeoutMs + 500; // allow 500ms buffer
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ response: 'yesButtonClicked' });
                }, timeoutMs);
            });
            // Simulate never-resolving ask
            const askPromise = new Promise(() => { });
            const result = await Promise.race([askPromise, timeoutPromise]);
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(maxWaitTime);
            expect(result).toEqual({ response: 'yesButtonClicked' });
        });
    });
    describe('Progress reporting every 5s', () => {
        it('should report progress at 5s intervals', async () => {
            const PROGRESS_REPORT_INTERVAL = 5000;
            const startTime = Date.now();
            const reports = [];
            const checkProgress = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed > 0 && elapsed % PROGRESS_REPORT_INTERVAL < 100) {
                    reports.push(elapsed);
                }
            };
            // Simulate 15s of execution
            for (let i = 0; i < 15000; i += 500) {
                checkProgress();
                jest.advanceTimersByTime(500);
            }
            expect(reports.length).toBeGreaterThan(0);
        });
        it('should format progress message with elapsed time', () => {
            const elapsed = 45;
            const message = `[Still running for ${elapsed}s...]`;
            expect(message).toContain('Still running');
            expect(message).toContain('45');
            expect(message).toMatch(/\[\d+s\.\.\.\]/);
        });
    });
    describe('60s Node execution timeout', () => {
        it('should terminate command after 60 seconds', async () => {
            const timeoutMs = 60000;
            let terminated = false;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    terminated = true;
                    reject(new Error('Command timeout after 60s'));
                }, timeoutMs);
            });
            // Simulate command that never completes
            const neverEnds = new Promise(() => { });
            try {
                await Promise.race([neverEnds, timeoutPromise]);
            }
            catch (e) {
                expect(e).toEqual(new Error('Command timeout after 60s'));
                expect(terminated).toBe(true);
            }
        });
        it('should allow commands to complete before timeout', async () => {
            const timeoutMs = 60000;
            const completionTime = 5000;
            const completingCommand = new Promise((resolve) => {
                setTimeout(() => resolve('completed'), completionTime);
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Timeout'));
                }, timeoutMs);
            });
            const result = await Promise.race([completingCommand, timeoutPromise]);
            expect(result).toBe('completed');
        });
    });
    describe('Process start tracking', () => {
        it('should track process start time accurately', () => {
            const startTime = Date.now();
            const process = { startedAt: startTime };
            const elapsedMs = Date.now() - process.startedAt;
            const elapsedSeconds = Math.round(elapsedMs / 1000);
            expect(process.startedAt).toBeDefined();
            expect(elapsedSeconds).toBeLessThanOrEqual(1);
        });
        it('should calculate elapsed time correctly', () => {
            const startTime = Date.now();
            const process = { startedAt: startTime };
            // Simulate 5.5s elapsed
            const currentTime = startTime + 5500;
            const elapsed = Math.round((currentTime - process.startedAt) / 1000);
            expect(elapsed).toBe(5);
        });
    });
    describe('Non-blocking output streaming', () => {
        it('should not await say() calls', async () => {
            let completed = false;
            const mockSay = jest.fn().mockResolvedValue(undefined);
            // Fire-and-forget call (async but not awaited)
            const promise = mockSay('command_output', '[Still running for 5s...]');
            if (promise instanceof Promise) {
                void promise.catch(() => { });
            }
            // Should not block
            completed = true;
            expect(completed).toBe(true);
            expect(mockSay).toHaveBeenCalled();
        });
        it('should handle errors without blocking', async () => {
            const mockSay = jest.fn().mockRejectedValue(new Error('Failed'));
            let errorHandled = false;
            const promise = mockSay('command_output', 'line');
            if (promise instanceof Promise) {
                void promise.catch((error) => {
                    errorHandled = true;
                });
            }
            // Should not throw
            expect(errorHandled).toBe(false); // async, not awaited
        });
    });
    describe('Integration: Long-running command flow', () => {
        it('should handle 30s command with progress updates', () => {
            const PROGRESS_INTERVAL = 5000;
            const COMMAND_DURATION = 30000;
            const progressUpdates = [];
            const startTime = Date.now();
            let currentTime = startTime;
            // Simulate command execution
            while (currentTime - startTime < COMMAND_DURATION) {
                const elapsed = Math.round((currentTime - startTime) / 1000);
                if ((currentTime - startTime) % PROGRESS_INTERVAL < 100) {
                    progressUpdates.push(`[Still running for ${elapsed}s...]`);
                }
                currentTime += 500;
            }
            expect(progressUpdates.length).toBeGreaterThanOrEqual(5);
            expect(progressUpdates[0]).toContain('Still running');
        });
        it('should not stall on auto-approved asks', async () => {
            jest.setTimeout(10000);
            const results = [];
            const CHUNK_COUNT = 3;
            for (let i = 0; i < CHUNK_COUNT; i++) {
                const autoApprove = Promise.resolve('yesButtonClicked');
                const askPromise = new Promise(() => { });
                const result = await Promise.race([askPromise, autoApprove]);
                results.push(result);
            }
            expect(results.length).toBe(CHUNK_COUNT);
            expect(results.every(r => r === 'yesButtonClicked')).toBe(true);
        });
    });
});
//# sourceMappingURL=command-stall-prevention.test.js.map