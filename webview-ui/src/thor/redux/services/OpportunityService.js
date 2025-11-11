import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OpportunityService = createApi({
    reducerPath: 'Opportunity', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Opportunity'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOpportunitysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Opportunity?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Opportunity', id })),
                    { type: 'Opportunity', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOpportunitys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Opportunity?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Opportunity`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Opportunity', id })),
                    { type: 'Opportunity', id: 'LIST' },
                ]
                : [{ type: 'Opportunity', id: 'LIST' }],
        }),
        // 3) Create
        addOpportunity: build.mutation({
            query: (body) => ({
                url: `Opportunity`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Opportunity', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOpportunity: build.query({
            query: (id) => `Opportunity/${id}`,
            providesTags: (result, error, id) => [{ type: 'Opportunity', id }],
        }),
        // 5) Update
        updateOpportunity: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Opportunity/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OpportunityService.util.updateQueryData('getOpportunity', id, (draft) => {
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
                { type: 'Opportunity', id },
                { type: 'Opportunity', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOpportunity: build.mutation({
            query(id) {
                return {
                    url: `Opportunity/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Opportunity', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOpportunitysPagedQuery`
export const { useGetOpportunitysPagedQuery, // immediate fetch
useLazyGetOpportunitysPagedQuery, // lazy fetch
useGetOpportunityQuery, useGetOpportunitysQuery, useAddOpportunityMutation, useUpdateOpportunityMutation, useDeleteOpportunityMutation, } = OpportunityService;
//# sourceMappingURL=OpportunityService.js.map