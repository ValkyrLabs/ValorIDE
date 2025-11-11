import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ExecModuleService = createApi({
    reducerPath: 'ExecModule', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ExecModule'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getExecModulesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ExecModule?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ExecModule', id })),
                    { type: 'ExecModule', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getExecModules: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ExecModule?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ExecModule`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ExecModule', id })),
                    { type: 'ExecModule', id: 'LIST' },
                ]
                : [{ type: 'ExecModule', id: 'LIST' }],
        }),
        // 3) Create
        addExecModule: build.mutation({
            query: (body) => ({
                url: `ExecModule`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ExecModule', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getExecModule: build.query({
            query: (id) => `ExecModule/${id}`,
            providesTags: (result, error, id) => [{ type: 'ExecModule', id }],
        }),
        // 5) Update
        updateExecModule: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ExecModule/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ExecModuleService.util.updateQueryData('getExecModule', id, (draft) => {
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
                { type: 'ExecModule', id },
                { type: 'ExecModule', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteExecModule: build.mutation({
            query(id) {
                return {
                    url: `ExecModule/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ExecModule', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetExecModulesPagedQuery`
export const { useGetExecModulesPagedQuery, // immediate fetch
useLazyGetExecModulesPagedQuery, // lazy fetch
useGetExecModuleQuery, useGetExecModulesQuery, useAddExecModuleMutation, useUpdateExecModuleMutation, useDeleteExecModuleMutation, } = ExecModuleService;
//# sourceMappingURL=ExecModuleService.js.map