import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasOpenAPISpecService = createApi({
    reducerPath: 'OasOpenAPISpec', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasOpenAPISpec'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasOpenAPISpecsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasOpenAPISpec?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasOpenAPISpec', id })),
                    { type: 'OasOpenAPISpec', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasOpenAPISpecs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasOpenAPISpec?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasOpenAPISpec`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasOpenAPISpec', id })),
                    { type: 'OasOpenAPISpec', id: 'LIST' },
                ]
                : [{ type: 'OasOpenAPISpec', id: 'LIST' }],
        }),
        // 3) Create
        addOasOpenAPISpec: build.mutation({
            query: (body) => ({
                url: `OasOpenAPISpec`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasOpenAPISpec', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasOpenAPISpec: build.query({
            query: (id) => `OasOpenAPISpec/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasOpenAPISpec', id }],
        }),
        // 5) Update
        updateOasOpenAPISpec: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasOpenAPISpec/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasOpenAPISpecService.util.updateQueryData('getOasOpenAPISpec', id, (draft) => {
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
                { type: 'OasOpenAPISpec', id },
                { type: 'OasOpenAPISpec', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasOpenAPISpec: build.mutation({
            query(id) {
                return {
                    url: `OasOpenAPISpec/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasOpenAPISpec', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasOpenAPISpecsPagedQuery`
export const { useGetOasOpenAPISpecsPagedQuery, // immediate fetch
useLazyGetOasOpenAPISpecsPagedQuery, // lazy fetch
useGetOasOpenAPISpecQuery, useGetOasOpenAPISpecsQuery, useAddOasOpenAPISpecMutation, useUpdateOasOpenAPISpecMutation, useDeleteOasOpenAPISpecMutation, } = OasOpenAPISpecService;
//# sourceMappingURL=OasOpenAPISpecService.js.map