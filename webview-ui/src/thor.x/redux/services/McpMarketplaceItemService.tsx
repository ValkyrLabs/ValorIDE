import { createApi } from '@reduxjs/toolkit/query/react'
import { McpMarketplaceItem } from '@thor/model/McpMarketplaceItem'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpMarketplaceItemResponse = McpMarketplaceItem[]

export const McpMarketplaceItemService = createApi({
  reducerPath: 'McpMarketplaceItem', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpMarketplaceItem'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpMarketplaceItemsPaged: build.query<McpMarketplaceItemResponse, { page: number; size?: number; example?: Partial<McpMarketplaceItem> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpMarketplaceItem?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpMarketplaceItem' as const, id })),
              { type: 'McpMarketplaceItem', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpMarketplaceItems: build.query<McpMarketplaceItemResponse, { example?: Partial<McpMarketplaceItem> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpMarketplaceItem?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpMarketplaceItem`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpMarketplaceItem' as const, id })),
              { type: 'McpMarketplaceItem', id: 'LIST' },
            ]
          : [{ type: 'McpMarketplaceItem', id: 'LIST' }],
    }),

    // 3) Create
    addMcpMarketplaceItem: build.mutation<McpMarketplaceItem, Partial<McpMarketplaceItem>>({
      query: (body) => ({
        url: `McpMarketplaceItem`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpMarketplaceItem', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpMarketplaceItem: build.query<McpMarketplaceItem, string>({
      query: (id) => `McpMarketplaceItem/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpMarketplaceItem', id }],
    }),

    // 5) Update
    updateMcpMarketplaceItem: build.mutation<void, Pick<McpMarketplaceItem, 'id'> & Partial<McpMarketplaceItem>>({
      query: ({ id, ...patch }) => ({
        url: `McpMarketplaceItem/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpMarketplaceItemService.util.updateQueryData('getMcpMarketplaceItem', id, (draft) => {
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
        { type: 'McpMarketplaceItem', id },
        { type: 'McpMarketplaceItem', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcpMarketplaceItem: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpMarketplaceItem/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpMarketplaceItem', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpMarketplaceItemsPagedQuery`
export const {
  useGetMcpMarketplaceItemsPagedQuery,     // immediate fetch
  useLazyGetMcpMarketplaceItemsPagedQuery, // lazy fetch
  useGetMcpMarketplaceItemQuery,
  useGetMcpMarketplaceItemsQuery,
  useAddMcpMarketplaceItemMutation,
  useUpdateMcpMarketplaceItemMutation,
  useDeleteMcpMarketplaceItemMutation,
} = McpMarketplaceItemService
