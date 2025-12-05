import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const InitUploadRequestService = createApi({
    reducerPath: "InitUploadRequest", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["InitUploadRequest"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getInitUploadRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `InitUploadRequest?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "InitUploadRequest",
                        id,
                    })),
                    { type: "InitUploadRequest", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getInitUploadRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `InitUploadRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `InitUploadRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "InitUploadRequest",
                        id,
                    })),
                    { type: "InitUploadRequest", id: "LIST" },
                ]
                : [{ type: "InitUploadRequest", id: "LIST" }],
        }),
        // 3) Create
        addInitUploadRequest: build.mutation({
            query: (body) => ({
                url: `InitUploadRequest`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "InitUploadRequest", id: "LIST" }],
        }),
        // 4) Get single by ID
        getInitUploadRequest: build.query({
            query: (id) => `InitUploadRequest/${id}`,
            providesTags: (result, error, id) => [{ type: "InitUploadRequest", id }],
        }),
        // 5) Update
        updateInitUploadRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `InitUploadRequest/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(InitUploadRequestService.util.updateQueryData("getInitUploadRequest", id, (draft) => {
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
                { type: "InitUploadRequest", id },
                { type: "InitUploadRequest", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteInitUploadRequest: build.mutation({
            query(id) {
                return {
                    url: `InitUploadRequest/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "InitUploadRequest", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetInitUploadRequestsPagedQuery`
export const { useGetInitUploadRequestsPagedQuery, // immediate fetch
useLazyGetInitUploadRequestsPagedQuery, // lazy fetch
useGetInitUploadRequestQuery, useGetInitUploadRequestsQuery, useAddInitUploadRequestMutation, useUpdateInitUploadRequestMutation, useDeleteInitUploadRequestMutation, } = InitUploadRequestService;
//# sourceMappingURL=InitUploadRequestService.js.map