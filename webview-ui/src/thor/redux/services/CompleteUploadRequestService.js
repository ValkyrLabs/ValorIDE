import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const CompleteUploadRequestService = createApi({
    reducerPath: "CompleteUploadRequest", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["CompleteUploadRequest"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getCompleteUploadRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `CompleteUploadRequest?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "CompleteUploadRequest",
                        id,
                    })),
                    { type: "CompleteUploadRequest", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getCompleteUploadRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `CompleteUploadRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `CompleteUploadRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "CompleteUploadRequest",
                        id,
                    })),
                    { type: "CompleteUploadRequest", id: "LIST" },
                ]
                : [{ type: "CompleteUploadRequest", id: "LIST" }],
        }),
        // 3) Create
        addCompleteUploadRequest: build.mutation({
            query: (body) => ({
                url: `CompleteUploadRequest`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "CompleteUploadRequest", id: "LIST" }],
        }),
        // 4) Get single by ID
        getCompleteUploadRequest: build.query({
            query: (id) => `CompleteUploadRequest/${id}`,
            providesTags: (result, error, id) => [
                { type: "CompleteUploadRequest", id },
            ],
        }),
        // 5) Update
        updateCompleteUploadRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `CompleteUploadRequest/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(CompleteUploadRequestService.util.updateQueryData("getCompleteUploadRequest", id, (draft) => {
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
                { type: "CompleteUploadRequest", id },
                { type: "CompleteUploadRequest", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteCompleteUploadRequest: build.mutation({
            query(id) {
                return {
                    url: `CompleteUploadRequest/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "CompleteUploadRequest", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetCompleteUploadRequestsPagedQuery`
export const { useGetCompleteUploadRequestsPagedQuery, // immediate fetch
useLazyGetCompleteUploadRequestsPagedQuery, // lazy fetch
useGetCompleteUploadRequestQuery, useGetCompleteUploadRequestsQuery, useAddCompleteUploadRequestMutation, useUpdateCompleteUploadRequestMutation, useDeleteCompleteUploadRequestMutation, } = CompleteUploadRequestService;
//# sourceMappingURL=CompleteUploadRequestService.js.map