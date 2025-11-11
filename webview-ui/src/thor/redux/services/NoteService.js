import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const NoteService = createApi({
    reducerPath: 'Note', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Note'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getNotesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Note?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Note', id })),
                    { type: 'Note', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getNotes: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Note?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Note`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Note', id })),
                    { type: 'Note', id: 'LIST' },
                ]
                : [{ type: 'Note', id: 'LIST' }],
        }),
        // 3) Create
        addNote: build.mutation({
            query: (body) => ({
                url: `Note`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Note', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getNote: build.query({
            query: (id) => `Note/${id}`,
            providesTags: (result, error, id) => [{ type: 'Note', id }],
        }),
        // 5) Update
        updateNote: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Note/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(NoteService.util.updateQueryData('getNote', id, (draft) => {
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
                { type: 'Note', id },
                { type: 'Note', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteNote: build.mutation({
            query(id) {
                return {
                    url: `Note/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Note', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetNotesPagedQuery`
export const { useGetNotesPagedQuery, // immediate fetch
useLazyGetNotesPagedQuery, // lazy fetch
useGetNoteQuery, useGetNotesQuery, useAddNoteMutation, useUpdateNoteMutation, useDeleteNoteMutation, } = NoteService;
//# sourceMappingURL=NoteService.js.map