import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const PromptRatingService = createApi({
    reducerPath: "PromptRating", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["PromptRating"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPromptRatingsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PromptRating?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "PromptRating",
                        id,
                    })),
                    { type: "PromptRating", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPromptRatings: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PromptRating?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PromptRating`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "PromptRating",
                        id,
                    })),
                    { type: "PromptRating", id: "LIST" },
                ]
                : [{ type: "PromptRating", id: "LIST" }],
        }),
        // 3) Create
        addPromptRating: build.mutation({
            query: (body) => ({
                url: `PromptRating`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "PromptRating", id: "LIST" }],
        }),
        // 4) Get single by ID
        getPromptRating: build.query({
            query: (id) => `PromptRating/${id}`,
            providesTags: (result, error, id) => [{ type: "PromptRating", id }],
        }),
        // 5) Update
        updatePromptRating: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PromptRating/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PromptRatingService.util.updateQueryData("getPromptRating", id, (draft) => {
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
                { type: "PromptRating", id },
                { type: "PromptRating", id: "LIST" },
            ],
        }),
        // 6) Delete
        deletePromptRating: build.mutation({
            query(id) {
                return {
                    url: `PromptRating/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "PromptRating", id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPromptRatingsPagedQuery`
export const { useGetPromptRatingsPagedQuery, // immediate fetch
useLazyGetPromptRatingsPagedQuery, // lazy fetch
useGetPromptRatingQuery, useGetPromptRatingsQuery, useAddPromptRatingMutation, useUpdatePromptRatingMutation, useDeletePromptRatingMutation, } = PromptRatingService;
//# sourceMappingURL=PromptRatingService.js.map