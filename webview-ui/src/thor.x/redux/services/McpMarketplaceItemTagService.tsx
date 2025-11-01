import { createApi } from '@reduxjs/toolkit/query/react'
import { McpMarketplaceItemTag } from '@thor/model/McpMarketplaceItemTag'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpMarketplaceItemTagResponse = McpMarketplaceItemTag[]

export const McpMarketplaceItemTagService = createApi({
  reducerPath: 'McpMarketplaceItemTag', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpMarketplaceItemTag'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpMarketplaceItemTagsPaged: build.query<McpMarketplaceItemTagResponse, { page: number; size?: number; example?: Partial<McpMarketplaceItemTag> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpMarketplaceItemTag?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpMarketplaceItemTag' as const, id })),
              { type: 'McpMarketplaceItemTag', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpMarketplaceItemTags: build.query<McpMarketplaceItemTagResponse, { example?: Partial<McpMarketplaceItemTag> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpMarketplaceItemTag?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpMarketplaceItemTag`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpMarketplaceItemTag' as const, id })),
              { type: 'McpMarketplaceItemTag', id: 'LIST' },
            ]
          : [{ type: 'McpMarketplaceItemTag', id: 'LIST' }],
    }),

    // 3) Create
    addMcpMarketplaceItemTag: build.mutation<McpMarketplaceItemTag, Partial<McpMarketplaceItemTag>>({
      query: (body) => ({
        url: `McpMarketplaceItemTag`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpMarketplaceItemTag', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpMarketplaceItemTag: build.query<McpMarketplaceItemTag, string>({
      query: (id) => `McpMarketplaceItemTag/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpMarketplaceItemTag', id }],
    }),

    // 5) Update
    updateMcpMarketplaceItemTag: build.mutation<void, Pick<McpMarketplaceItemTag, 'id'> & Partial<McpMarketplaceItemTag>>({
      query: ({ id, ...patch }) => ({
        url: `McpMarketplaceItemTag/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpMarketplaceItemTagService.util.updateQueryData('getMcpMarketplaceItemTag', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'McpMarketplaceItemTag', id },
        { type: 'McpMarketplaceItemTag', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcpMarketplaceItemTag: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpMarketplaceItemTag/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpMarketplaceItemTag', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpMarketplaceItemTagsPagedQuery`
export const {
  useGetMcpMarketplaceItemTagsPagedQuery,     // immediate fetch
  useLazyGetMcpMarketplaceItemTagsPagedQuery, // lazy fetch
  useGetMcpMarketplaceItemTagQuery,
  useGetMcpMarketplaceItemTagsQuery,
  useAddMcpMarketplaceItemTagMutation,
  useUpdateMcpMarketplaceItemTagMutation,
  useDeleteMcpMarketplaceItemTagMutation,
} = McpMarketplaceItemTagService
