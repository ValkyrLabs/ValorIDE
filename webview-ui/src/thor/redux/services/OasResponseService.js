import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasResponseService = createApi({
    reducerPath: 'OasResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasResponse', id })),
                    { type: 'OasResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasResponse', id })),
                    { type: 'OasResponse', id: 'LIST' },
                ]
                : [{ type: 'OasResponse', id: 'LIST' }],
        }),
        // 3) Create
        addOasResponse: build.mutation({
            query: (body) => ({
                url: `OasResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasResponse: build.query({
            query: (id) => `OasResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasResponse', id }],
        }),
        // 5) Update
        updateOasResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasResponseService.util.updateQueryData('getOasResponse', id, (draft) => {
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
                { type: 'OasResponse', id },
                { type: 'OasResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasResponse: build.mutation({
            query(id) {
                return {
                    url: `OasResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasResponsesPagedQuery`
export const { useGetOasResponsesPagedQuery, // immediate fetch
useLazyGetOasResponsesPagedQuery, // lazy fetch
useGetOasResponseQuery, useGetOasResponsesQuery, useAddOasResponseMutation, useUpdateOasResponseMutation, useDeleteOasResponseMutation, } = OasResponseService;
//# sourceMappingURL=OasResponseService.js.map