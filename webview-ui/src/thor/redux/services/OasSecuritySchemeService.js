import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasSecuritySchemeService = createApi({
    reducerPath: 'OasSecurityScheme', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasSecurityScheme'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasSecuritySchemesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasSecurityScheme?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasSecurityScheme', id })),
                    { type: 'OasSecurityScheme', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasSecuritySchemes: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasSecurityScheme?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasSecurityScheme`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasSecurityScheme', id })),
                    { type: 'OasSecurityScheme', id: 'LIST' },
                ]
                : [{ type: 'OasSecurityScheme', id: 'LIST' }],
        }),
        // 3) Create
        addOasSecurityScheme: build.mutation({
            query: (body) => ({
                url: `OasSecurityScheme`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasSecurityScheme', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasSecurityScheme: build.query({
            query: (id) => `OasSecurityScheme/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasSecurityScheme', id }],
        }),
        // 5) Update
        updateOasSecurityScheme: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasSecurityScheme/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasSecuritySchemeService.util.updateQueryData('getOasSecurityScheme', id, (draft) => {
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
                { type: 'OasSecurityScheme', id },
                { type: 'OasSecurityScheme', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasSecurityScheme: build.mutation({
            query(id) {
                return {
                    url: `OasSecurityScheme/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasSecurityScheme', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasSecuritySchemesPagedQuery`
export const { useGetOasSecuritySchemesPagedQuery, // immediate fetch
useLazyGetOasSecuritySchemesPagedQuery, // lazy fetch
useGetOasSecuritySchemeQuery, useGetOasSecuritySchemesQuery, useAddOasSecuritySchemeMutation, useUpdateOasSecuritySchemeMutation, useDeleteOasSecuritySchemeMutation, } = OasSecuritySchemeService;
//# sourceMappingURL=OasSecuritySchemeService.js.map