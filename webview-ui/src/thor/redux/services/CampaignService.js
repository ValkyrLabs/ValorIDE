import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const CampaignService = createApi({
    reducerPath: 'Campaign', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Campaign'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getCampaignsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Campaign?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Campaign', id })),
                    { type: 'Campaign', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getCampaigns: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Campaign?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Campaign`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Campaign', id })),
                    { type: 'Campaign', id: 'LIST' },
                ]
                : [{ type: 'Campaign', id: 'LIST' }],
        }),
        // 3) Create
        addCampaign: build.mutation({
            query: (body) => ({
                url: `Campaign`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getCampaign: build.query({
            query: (id) => `Campaign/${id}`,
            providesTags: (result, error, id) => [{ type: 'Campaign', id }],
        }),
        // 5) Update
        updateCampaign: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Campaign/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(CampaignService.util.updateQueryData('getCampaign', id, (draft) => {
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
                { type: 'Campaign', id },
                { type: 'Campaign', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteCampaign: build.mutation({
            query(id) {
                return {
                    url: `Campaign/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Campaign', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetCampaignsPagedQuery`
export const { useGetCampaignsPagedQuery, // immediate fetch
useLazyGetCampaignsPagedQuery, // lazy fetch
useGetCampaignQuery, useGetCampaignsQuery, useAddCampaignMutation, useUpdateCampaignMutation, useDeleteCampaignMutation, } = CampaignService;
//# sourceMappingURL=CampaignService.js.map