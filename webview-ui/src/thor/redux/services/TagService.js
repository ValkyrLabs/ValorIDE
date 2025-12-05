import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const TagService = createApi({
    reducerPath: "Tag", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["Tag"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getTagsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Tag?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Tag", id })),
                    { type: "Tag", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getTags: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Tag?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Tag`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Tag", id })),
                    { type: "Tag", id: "LIST" },
                ]
                : [{ type: "Tag", id: "LIST" }],
        }),
        // 3) Create
        addTag: build.mutation({
            query: (body) => ({
                url: `Tag`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Tag", id: "LIST" }],
        }),
        // 4) Get single by ID
        getTag: build.query({
            query: (id) => `Tag/${id}`,
            providesTags: (result, error, id) => [{ type: "Tag", id }],
        }),
        // 5) Update
        updateTag: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Tag/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(TagService.util.updateQueryData("getTag", id, (draft) => {
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
                { type: "Tag", id },
                { type: "Tag", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteTag: build.mutation({
            query(id) {
                return {
                    url: `Tag/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "Tag", id }],
        }),
    }),
});
// Notice we now also export `useLazyGetTagsPagedQuery`
export const { useGetTagsPagedQuery, // immediate fetch
useLazyGetTagsPagedQuery, // lazy fetch
useGetTagQuery, useGetTagsQuery, useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation, } = TagService;
//# sourceMappingURL=TagService.js.map