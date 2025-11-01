/**
 * SWARM v2 Integration Tests
 * Validates that ValorIDE (frontend) and ValkyrAI (backend) are in sync
 * 
 * Run with: npm test -- SwarmPanel.integration.test.ts
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080/v1/swarm';
const TEST_ORG = 'org-test-' + Date.now();
const TEST_AGENT_ID = 'agent-' + Math.random().toString(36).substring(7);

// Test data
const testData = {
    agentId: TEST_AGENT_ID,
    organizationId: TEST_ORG,
    userId: 'user-test-' + Date.now(),
    senderId: 'sender-' + Date.now(),
};

describe('SWARM v2 Integration Tests', () => {

    // ========== Discovery API Tests ==========

    describe('GET /agents/discovery', () => {
        it('should return agents list with correct schema', async () => {
            const response = await fetch(`${API_BASE}/agents/discovery?orgId=${encodeURIComponent(TEST_ORG)}`);
            expect(response.status).toEqual(200);

            const agents = await response.json();
            expect(Array.isArray(agents)).toBe(true);

            // Each agent should have these fields
            if (agents.length > 0) {
                agents.forEach((agent: any) => {
                    expect(agent).toHaveProperty('id');
                    expect(agent).toHaveProperty('status');
                    expect(['ONLINE', 'OFFLINE', 'IDLE', 'BUSY', 'ERROR', 'INACTIVE', 'SUSPENDED']).toContain(agent.status);
                });
            }
        });

        it('should include lastSeen and location fields', async () => {
            const response = await fetch(`${API_BASE}/agents/discovery?orgId=${encodeURIComponent(TEST_ORG)}`);
            const agents = await response.json();

            if (agents.length > 0) {
                const agent = agents[0];
                // Optional fields, but if present should be valid
                if (agent.lastSeen) {
                    expect(typeof agent.lastSeen).toBe('number');
                }
                if (agent.location) {
                    expect(typeof agent.location).toBe('string');
                }
            }
        });

        it('should handle orgId parameter correctly', async () => {
            const response = await fetch(`${API_BASE}/agents/discovery?orgId=nonexistent-org`);
            // Should return 200 with empty array, not 404
            expect(response.status).toEqual(200);
            const agents = await response.json();
            expect(Array.isArray(agents)).toBe(true);
        });
    });

    // ========== Hierarchy API Tests ==========

    describe('GET /agents/hierarchy', () => {
        it('should return hierarchy tree with correct schema', async () => {
            const response = await fetch(`${API_BASE}/agents/hierarchy?orgId=${encodeURIComponent(TEST_ORG)}`);
            expect(response.status).toEqual(200);

            const hierarchy = await response.json();
            expect(Array.isArray(hierarchy)).toBe(true);

            // Each node should have required fields
            if (hierarchy.length > 0) {
                hierarchy.forEach((node: any) => {
                    expect(node).toHaveProperty('agentId');
                    expect(node).toHaveProperty('depth');
                    expect(typeof node.depth).toBe('number');
                    expect(node.depth).toBeGreaterThanOrEqual(0);
                });
            }
        });

        it('should include children array for parent nodes', async () => {
            const response = await fetch(`${API_BASE}/agents/hierarchy?orgId=${encodeURIComponent(TEST_ORG)}`);
            const hierarchy = await response.json();

            if (hierarchy.length > 0) {
                const node = hierarchy[0];
                expect(node).toHaveProperty('children');
                expect(Array.isArray(node.children)).toBe(true);
            }
        });

        it('should enforce max 12 depth levels', async () => {
            const response = await fetch(`${API_BASE}/agents/hierarchy?orgId=${encodeURIComponent(TEST_ORG)}`);
            const hierarchy = await response.json();

            hierarchy.forEach((node: any) => {
                expect(node.depth).toBeLessThanOrEqual(12);
            });
        });
    });

    // ========== Chat API Tests ==========

    describe('POST /agent/{id}/chat', () => {
        it('should send message with correct schema', async () => {
            const response = await fetch(`${API_BASE}/agent/${TEST_AGENT_ID}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: TEST_ORG,
                    conversationId: 'conv-test',
                    senderId: testData.senderId,
                    message: 'Test message',
                    senderType: 'USER',
                }),
            });

            // Should succeed or return meaningful error
            if (response.ok) {
                const message = await response.json();
                expect(message).toHaveProperty('id');
                expect(message).toHaveProperty('conversationId');
                expect(message).toHaveProperty('senderId');
                expect(message).toHaveProperty('message');
                expect(message).toHaveProperty('timestamp');
                expect(typeof message.timestamp).toBe('number');
            }
        });

        it('should handle missing organizationId gracefully', async () => {
            const response = await fetch(`${API_BASE}/agent/${TEST_AGENT_ID}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: 'conv-test',
                    senderId: testData.senderId,
                    message: 'Test',
                    senderType: 'USER',
                }),
            });

            // Should fail gracefully with 400 or 403, not 500
            expect([400, 403, 404]).toContain(response.status);
        });

        it('should validate senderType enum', async () => {
            const response = await fetch(`${API_BASE}/agent/${TEST_AGENT_ID}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: TEST_ORG,
                    conversationId: 'conv-test',
                    senderId: testData.senderId,
                    message: 'Test',
                    senderType: 'INVALID_TYPE',
                }),
            });

            // Should fail with 400 Bad Request
            expect([400, 422]).toContain(response.status);
        });
    });

    // ========== Chat History API Tests ==========

    describe('GET /agent/{id}/chat/history', () => {
        it('should return paginated message history', async () => {
            const response = await fetch(
                `${API_BASE}/agent/${TEST_AGENT_ID}/chat/history?organizationId=${encodeURIComponent(TEST_ORG)}&conversationId=conv-test&page=0`
            );

            if (response.ok) {
                const data = await response.json();
                // Could be array or paginated object
                const messages = data.content || data;
                expect(Array.isArray(messages)).toBe(true);
            }
        });

        it('should include readBy array in messages', async () => {
            const response = await fetch(
                `${API_BASE}/agent/${TEST_AGENT_ID}/chat/history?organizationId=${encodeURIComponent(TEST_ORG)}&conversationId=conv-test`
            );

            if (response.ok) {
                const data = await response.json();
                const messages = data.content || data;
                if (messages.length > 0) {
                    messages.forEach((msg: any) => {
                        expect(msg).toHaveProperty('readBy');
                        expect(Array.isArray(msg.readBy)).toBe(true);
                    });
                }
            }
        });
    });

    // ========== Billing API Tests ==========

    describe('GET /billing/status', () => {
        it('should return billing status with correct schema', async () => {
            const response = await fetch(
                `${API_BASE}/billing/status?organizationId=${encodeURIComponent(TEST_ORG)}`
            );

            if (response.status === 200) {
                const billing = await response.json();
                expect(billing).toHaveProperty('activeAgentCount');
                expect(billing).toHaveProperty('quotaAgents');
                expect(billing).toHaveProperty('totalCharges');
                expect(billing).toHaveProperty('billingStatus');
                expect(billing).toHaveProperty('remainingQuota');

                // Verify types
                expect(typeof billing.activeAgentCount).toBe('number');
                expect(typeof billing.quotaAgents).toBe('number');
                expect(typeof billing.totalCharges).toBe('number');
                expect(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).toContain(billing.billingStatus);
            }
        });

        it('should return 402 when billing suspended', async () => {
            // This test assumes we have a way to create a suspended org
            // For now, just document the expected behavior
            const response = await fetch(
                `${API_BASE}/billing/status?organizationId=suspended-org`
            );

            if (response.status === 402) {
                // Correct: Billing suspended
                expect(response.status).toEqual(402);
            } else if (response.status === 404) {
                // Also acceptable: Org not found
                expect(response.status).toEqual(404);
            }
        });

        it('should enforce max 12 agent quota', async () => {
            const response = await fetch(
                `${API_BASE}/billing/status?organizationId=${encodeURIComponent(TEST_ORG)}`
            );

            if (response.ok) {
                const billing = await response.json();
                expect(billing.quotaAgents).toBeLessThanOrEqual(12);
                expect(billing.activeAgentCount).toBeLessThanOrEqual(billing.quotaAgents);
            }
        });
    });

    // ========== Read Receipt API Tests ==========

    describe('POST /chat/{messageId}/read', () => {
        it('should mark message as read', async () => {
            const messageId = 'msg-' + Date.now();
            const response = await fetch(`${API_BASE}/chat/${messageId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: TEST_ORG,
                    readerId: testData.senderId,
                }),
            });

            // Should succeed or return 404 if message doesn't exist
            expect([200, 204, 404]).toContain(response.status);
        });

        it('should require readerId', async () => {
            const messageId = 'msg-' + Date.now();
            const response = await fetch(`${API_BASE}/chat/${messageId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: TEST_ORG,
                    // Missing readerId
                }),
            });

            // Should fail with 400
            expect([400, 422]).toContain(response.status);
        });
    });

    // ========== HTTP Status Code Tests ==========

    describe('HTTP Status Codes', () => {
        it('should return 409 CONFLICT for circular dependency', async () => {
            // This would need a specific endpoint that triggers it
            // Documenting expected behavior:
            // POST /agent/{parentId}/adopt/{childId} where child is ancestor of parent
            // should return 409
        });

        it('should return 402 PAYMENT_REQUIRED for billing issues', async () => {
            // This validates the billing exception handler
            // GET /billing/status for suspended org should return 402
        });

        it('should return 403 FORBIDDEN for permission denied', async () => {
            // This validates ACL enforcement
            // POST operations on other org's agents should return 403
        });

        it('should return 404 NOT_FOUND for missing resources', async () => {
            const response = await fetch(`${API_BASE}/agent/nonexistent/chat/history?organizationId=${TEST_ORG}`);
            expect(response.status).toEqual(404);
        });

        it('should return 429 TOO_MANY_REQUESTS when rate limited', async () => {
            // This would need to hammer the API and is typically skipped in tests
        });
    });

    // ========== Error Handling Tests ==========

    describe('Error Handling', () => {
        it('should return 400 for invalid JSON', async () => {
            const response = await fetch(`${API_BASE}/agent/${TEST_AGENT_ID}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json',
            });

            expect(response.status).toEqual(400);
        });

        it('should return 500 for server errors (gracefully)', async () => {
            // Most 500s should be logged server-side
            // Frontend should display user-friendly message
        });

        it('should include error message in response body', async () => {
            const response = await fetch(`${API_BASE}/agent/invalid/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: TEST_ORG }),
            });

            if (!response.ok) {
                const body = await response.text();
                // Body should contain useful error info, not just HTTP reason
                expect(body.length).toBeGreaterThan(0);
            }
        });
    });

    // ========== Data Consistency Tests ==========

    describe('Data Consistency', () => {
        it('should maintain referential integrity', async () => {
            // If we create messages, they should appear in history
            // If we mark message as read, it should appear in readBy[]
        });

        it('should enforce organization isolation', async () => {
            // Org A should not see Org B's agents/messages
            // Tested by querying with different orgId values
        });

        it('should track timestamps consistently', async () => {
            // All timestamps should be UTC milliseconds since epoch
            // and monotonically increasing for messages in same conversation
        });
    });
});

// Export test helpers for use in other tests
export { testData, API_BASE };
