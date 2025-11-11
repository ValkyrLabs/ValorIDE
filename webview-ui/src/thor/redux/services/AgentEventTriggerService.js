import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const AgentEventTriggerService = createApi({
    reducerPath: 'AgentEventTrigger', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['AgentEventTrigger'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAgentEventTriggersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `AgentEventTrigger?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AgentEventTrigger', id })),
                    { type: 'AgentEventTrigger', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAgentEventTriggers: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `AgentEventTrigger?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `AgentEventTrigger`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AgentEventTrigger', id })),
                    { type: 'AgentEventTrigger', id: 'LIST' },
                ]
                : [{ type: 'AgentEventTrigger', id: 'LIST' }],
        }),
        // 3) Create
        addAgentEventTrigger: build.mutation({
            query: (body) => ({
                url: `AgentEventTrigger`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'AgentEventTrigger', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getAgentEventTrigger: build.query({
            query: (id) => `AgentEventTrigger/${id}`,
            providesTags: (result, error, id) => [{ type: 'AgentEventTrigger', id }],
        }),
        // 5) Update
        updateAgentEventTrigger: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `AgentEventTrigger/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AgentEventTriggerService.util.updateQueryData('getAgentEventTrigger', id, (draft) => {
                        Object.assign(draft, patch);
                    }));
                    try {
                        await queryFulfilled;
                    }
                    catch {
                        patchResult.undo();
                    }
                }
            },
            invalidatesTags: (result, error, { id }) => [
                { type: 'AgentEventTrigger', id },
                { type: 'AgentEventTrigger', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteAgentEventTrigger: build.mutation({
            query(id) {
                return {
                    url: `AgentEventTrigger/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'AgentEventTrigger', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAgentEventTriggersPagedQuery`
export const { useGetAgentEventTriggersPagedQuery, // immediate fetch
useLazyGetAgentEventTriggersPagedQuery, // lazy fetch
useGetAgentEventTriggerQuery, useGetAgentEventTriggersQuery, useAddAgentEventTriggerMutation, useUpdateAgentEventTriggerMutation, useDeleteAgentEventTriggerMutation, } = AgentEventTriggerService;
//# sourceMappingURL=AgentEventTriggerService.js.map