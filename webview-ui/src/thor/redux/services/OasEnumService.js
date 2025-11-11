import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasEnumService = createApi({
    reducerPath: 'OasEnum', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasEnum'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasEnumsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasEnum?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasEnum', id })),
                    { type: 'OasEnum', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasEnums: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasEnum?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasEnum`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasEnum', id })),
                    { type: 'OasEnum', id: 'LIST' },
                ]
                : [{ type: 'OasEnum', id: 'LIST' }],
        }),
        // 3) Create
        addOasEnum: build.mutation({
            query: (body) => ({
                url: `OasEnum`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasEnum', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasEnum: build.query({
            query: (id) => `OasEnum/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasEnum', id }],
        }),
        // 5) Update
        updateOasEnum: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasEnum/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasEnumService.util.updateQueryData('getOasEnum', id, (draft) => {
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
                { type: 'OasEnum', id },
                { type: 'OasEnum', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasEnum: build.mutation({
            query(id) {
                return {
                    url: `OasEnum/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasEnum', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasEnumsPagedQuery`
export const { useGetOasEnumsPagedQuery, // immediate fetch
useLazyGetOasEnumsPagedQuery, // lazy fetch
useGetOasEnumQuery, useGetOasEnumsQuery, useAddOasEnumMutation, useUpdateOasEnumMutation, useDeleteOasEnumMutation, } = OasEnumService;
//# sourceMappingURL=OasEnumService.js.map