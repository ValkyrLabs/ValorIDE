import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const JobApplicationResponseService = createApi({
    reducerPath: "JobApplicationResponse", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["JobApplicationResponse"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getJobApplicationResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `JobApplicationResponse?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "JobApplicationResponse",
                        id,
                    })),
                    { type: "JobApplicationResponse", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getJobApplicationResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `JobApplicationResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `JobApplicationResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "JobApplicationResponse",
                        id,
                    })),
                    { type: "JobApplicationResponse", id: "LIST" },
                ]
                : [{ type: "JobApplicationResponse", id: "LIST" }],
        }),
        // 3) Create
        addJobApplicationResponse: build.mutation({
            query: (body) => ({
                url: `JobApplicationResponse`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "JobApplicationResponse", id: "LIST" }],
        }),
        // 4) Get single by ID
        getJobApplicationResponse: build.query({
            query: (id) => `JobApplicationResponse/${id}`,
            providesTags: (result, error, id) => [
                { type: "JobApplicationResponse", id },
            ],
        }),
        // 5) Update
        updateJobApplicationResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `JobApplicationResponse/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(JobApplicationResponseService.util.updateQueryData("getJobApplicationResponse", id, (draft) => {
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
                { type: "JobApplicationResponse", id },
                { type: "JobApplicationResponse", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteJobApplicationResponse: build.mutation({
            query(id) {
                return {
                    url: `JobApplicationResponse/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "JobApplicationResponse", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetJobApplicationResponsesPagedQuery`
export const { useGetJobApplicationResponsesPagedQuery, // immediate fetch
useLazyGetJobApplicationResponsesPagedQuery, // lazy fetch
useGetJobApplicationResponseQuery, useGetJobApplicationResponsesQuery, useAddJobApplicationResponseMutation, useUpdateJobApplicationResponseMutation, useDeleteJobApplicationResponseMutation, } = JobApplicationResponseService;
//# sourceMappingURL=JobApplicationResponseService.js.map