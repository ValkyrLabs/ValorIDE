import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const EventLogService = createApi({
    reducerPath: 'EventLog', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['EventLog'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getEventLogsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `EventLog?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'EventLog', id })),
                    { type: 'EventLog', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getEventLogs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `EventLog?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `EventLog`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'EventLog', id })),
                    { type: 'EventLog', id: 'LIST' },
                ]
                : [{ type: 'EventLog', id: 'LIST' }],
        }),
        // 3) Create
        addEventLog: build.mutation({
            query: (body) => ({
                url: `EventLog`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'EventLog', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getEventLog: build.query({
            query: (id) => `EventLog/${id}`,
            providesTags: (result, error, id) => [{ type: 'EventLog', id }],
        }),
        // 5) Update
        updateEventLog: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `EventLog/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(EventLogService.util.updateQueryData('getEventLog', id, (draft) => {
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
                { type: 'EventLog', id },
                { type: 'EventLog', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteEventLog: build.mutation({
            query(id) {
                return {
                    url: `EventLog/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'EventLog', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetEventLogsPagedQuery`
export const { useGetEventLogsPagedQuery, // immediate fetch
useLazyGetEventLogsPagedQuery, // lazy fetch
useGetEventLogQuery, useGetEventLogsQuery, useAddEventLogMutation, useUpdateEventLogMutation, useDeleteEventLogMutation, } = EventLogService;
//# sourceMappingURL=EventLogService.js.map