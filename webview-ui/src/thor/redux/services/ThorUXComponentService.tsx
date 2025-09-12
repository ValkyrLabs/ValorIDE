import { createApi } from '@reduxjs/toolkit/query/react'
import { ThorUXComponent } from '@thor/model/ThorUXComponent'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ThorUXComponentResponse = ThorUXComponent[]

export const ThorUXComponentService = createApi({
  reducerPath: 'ThorUXComponent', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ThorUXComponent'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getThorUXComponentsPaged: build.query<ThorUXComponentResponse, { page: number; size?: number; example?: Partial<ThorUXComponent> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ThorUXComponent?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ThorUXComponent' as const, id })),
              { type: 'ThorUXComponent', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getThorUXComponents: build.query<ThorUXComponentResponse, { example?: Partial<ThorUXComponent> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ThorUXComponent?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ThorUXComponent`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ThorUXComponent' as const, id })),
              { type: 'ThorUXComponent', id: 'LIST' },
            ]
          : [{ type: 'ThorUXComponent', id: 'LIST' }],
    }),

    // 3) Create
    addThorUXComponent: build.mutation<ThorUXComponent, Partial<ThorUXComponent>>({
      query: (body) => ({
        url: `ThorUXComponent`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ThorUXComponent', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getThorUXComponent: build.query<ThorUXComponent, string>({
      query: (id) => `ThorUXComponent/${id}`,
      providesTags: (result, error, id) => [{ type: 'ThorUXComponent', id }],
    }),

    // 5) Update
    updateThorUXComponent: build.mutation<void, Pick<ThorUXComponent, 'id'> & Partial<ThorUXComponent>>({
      query: ({ id, ...patch }) => ({
        url: `ThorUXComponent/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ThorUXComponentService.util.updateQueryData('getThorUXComponent', id, (draft) => {
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
        { type: 'ThorUXComponent', id },
        { type: 'ThorUXComponent', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteThorUXComponent: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ThorUXComponent/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ThorUXComponent', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetThorUXComponentsPagedQuery`
export const {
  useGetThorUXComponentsPagedQuery,     // immediate fetch
  useLazyGetThorUXComponentsPagedQuery, // lazy fetch
  useGetThorUXComponentQuery,
  useGetThorUXComponentsQuery,
  useAddThorUXComponentMutation,
  useUpdateThorUXComponentMutation,
  useDeleteThorUXComponentMutation,
} = ThorUXComponentService
