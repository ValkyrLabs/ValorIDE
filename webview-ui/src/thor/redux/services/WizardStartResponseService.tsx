import { createApi } from '@reduxjs/toolkit/query/react'
import { WizardStartResponse } from '@thor/model/WizardStartResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WizardStartResponseResponse = WizardStartResponse[]

export const WizardStartResponseService = createApi({
  reducerPath: 'WizardStartResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['WizardStartResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getWizardStartResponsesPaged: build.query<WizardStartResponseResponse, { page: number; size?: number; example?: Partial<WizardStartResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `WizardStartResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WizardStartResponse' as const, id })),
              { type: 'WizardStartResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWizardStartResponses: build.query<WizardStartResponseResponse, { example?: Partial<WizardStartResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `WizardStartResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `WizardStartResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WizardStartResponse' as const, id })),
              { type: 'WizardStartResponse', id: 'LIST' },
            ]
          : [{ type: 'WizardStartResponse', id: 'LIST' }],
    }),

    // 3) Create
    addWizardStartResponse: build.mutation<WizardStartResponse, Partial<WizardStartResponse>>({
      query: (body) => ({
        url: `WizardStartResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WizardStartResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWizardStartResponse: build.query<WizardStartResponse, string>({
      query: (id) => `WizardStartResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'WizardStartResponse', id }],
    }),

    // 5) Update
    updateWizardStartResponse: build.mutation<void, Pick<WizardStartResponse, 'id'> & Partial<WizardStartResponse>>({
      query: ({ id, ...patch }) => ({
        url: `WizardStartResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WizardStartResponseService.util.updateQueryData('getWizardStartResponse', id, (draft) => {
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
        { type: 'WizardStartResponse', id },
        { type: 'WizardStartResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteWizardStartResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `WizardStartResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'WizardStartResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWizardStartResponsesPagedQuery`
export const {
  useGetWizardStartResponsesPagedQuery,     // immediate fetch
  useLazyGetWizardStartResponsesPagedQuery, // lazy fetch
  useGetWizardStartResponseQuery,
  useGetWizardStartResponsesQuery,
  useAddWizardStartResponseMutation,
  useUpdateWizardStartResponseMutation,
  useDeleteWizardStartResponseMutation,
} = WizardStartResponseService
