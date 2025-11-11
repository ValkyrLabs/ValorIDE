import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasObjectSchemaService = createApi({
    reducerPath: 'OasObjectSchema', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasObjectSchema'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasObjectSchemasPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasObjectSchema?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasObjectSchema', id })),
                    { type: 'OasObjectSchema', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasObjectSchemas: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasObjectSchema?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasObjectSchema`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasObjectSchema', id })),
                    { type: 'OasObjectSchema', id: 'LIST' },
                ]
                : [{ type: 'OasObjectSchema', id: 'LIST' }],
        }),
        // 3) Create
        addOasObjectSchema: build.mutation({
            query: (body) => ({
                url: `OasObjectSchema`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasObjectSchema', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasObjectSchema: build.query({
            query: (id) => `OasObjectSchema/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasObjectSchema', id }],
        }),
        // 5) Update
        updateOasObjectSchema: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasObjectSchema/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasObjectSchemaService.util.updateQueryData('getOasObjectSchema', id, (draft) => {
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
                { type: 'OasObjectSchema', id },
                { type: 'OasObjectSchema', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasObjectSchema: build.mutation({
            query(id) {
                return {
                    url: `OasObjectSchema/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasObjectSchema', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasObjectSchemasPagedQuery`
export const { useGetOasObjectSchemasPagedQuery, // immediate fetch
useLazyGetOasObjectSchemasPagedQuery, // lazy fetch
useGetOasObjectSchemaQuery, useGetOasObjectSchemasQuery, useAddOasObjectSchemaMutation, useUpdateOasObjectSchemaMutation, useDeleteOasObjectSchemaMutation, } = OasObjectSchemaService;
//# sourceMappingURL=OasObjectSchemaService.js.map