import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const JobSeekerService = createApi({
    reducerPath: "JobSeeker", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["JobSeeker"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getJobSeekersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `JobSeeker?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: "JobSeeker", id })),
                    { type: "JobSeeker", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getJobSeekers: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `JobSeeker?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `JobSeeker`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "JobSeeker", id })),
                    { type: "JobSeeker", id: "LIST" },
                ]
                : [{ type: "JobSeeker", id: "LIST" }],
        }),
        // 3) Create
        addJobSeeker: build.mutation({
            query: (body) => ({
                url: `JobSeeker`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "JobSeeker", id: "LIST" }],
        }),
        // 4) Get single by ID
        getJobSeeker: build.query({
            query: (id) => `JobSeeker/${id}`,
            providesTags: (result, error, id) => [{ type: "JobSeeker", id }],
        }),
        // 5) Update
        updateJobSeeker: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `JobSeeker/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(JobSeekerService.util.updateQueryData("getJobSeeker", id, (draft) => {
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
                { type: "JobSeeker", id },
                { type: "JobSeeker", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteJobSeeker: build.mutation({
            query(id) {
                return {
                    url: `JobSeeker/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "JobSeeker", id }],
        }),
    }),
});
// Notice we now also export `useLazyGetJobSeekersPagedQuery`
export const { useGetJobSeekersPagedQuery, // immediate fetch
useLazyGetJobSeekersPagedQuery, // lazy fetch
useGetJobSeekerQuery, useGetJobSeekersQuery, useAddJobSeekerMutation, useUpdateJobSeekerMutation, useDeleteJobSeekerMutation, } = JobSeekerService;
//# sourceMappingURL=JobSeekerService.js.map