import { createApi } from '@reduxjs/toolkit/query/react'
import { WizardStatusResponse } from '@thor/model/WizardStatusResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WizardStatusResponseResponse = WizardStatusResponse[]

export const WizardStatusResponseService = createApi({
  reducerPath: 'WizardStatusResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['WizardStatusResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getWizardStatusResponsesPaged: build.query<WizardStatusResponseResponse, { page: number; size?: number; example?: Partial<WizardStatusResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `WizardStatusResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WizardStatusResponse' as const, id })),
              { type: 'WizardStatusResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWizardStatusResponses: build.query<WizardStatusResponseResponse, { example?: Partial<WizardStatusResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `WizardStatusResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `WizardStatusResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WizardStatusResponse' as const, id })),
              { type: 'WizardStatusResponse', id: 'LIST' },
            ]
          : [{ type: 'WizardStatusResponse', id: 'LIST' }],
    }),

    // 3) Create
    addWizardStatusResponse: build.mutation<WizardStatusResponse, Partial<WizardStatusResponse>>({
      query: (body) => ({
        url: `WizardStatusResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WizardStatusResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWizardStatusResponse: build.query<WizardStatusResponse, string>({
      query: (id) => `WizardStatusResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'WizardStatusResponse', id }],
    }),

    // 5) Update
    updateWizardStatusResponse: build.mutation<void, Pick<WizardStatusResponse, 'id'> & Partial<WizardStatusResponse>>({
      query: ({ id, ...patch }) => ({
        url: `WizardStatusResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WizardStatusResponseService.util.updateQueryData('getWizardStatusResponse', id, (draft) => {
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
        { type: 'WizardStatusResponse', id },
        { type: 'WizardStatusResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteWizardStatusResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `WizardStatusResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'WizardStatusResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWizardStatusResponsesPagedQuery`
export const {
  useGetWizardStatusResponsesPagedQuery,     // immediate fetch
  useLazyGetWizardStatusResponsesPagedQuery, // lazy fetch
  useGetWizardStatusResponseQuery,
  useGetWizardStatusResponsesQuery,
  useAddWizardStatusResponseMutation,
  useUpdateWizardStatusResponseMutation,
  useDeleteWizardStatusResponseMutation,
} = WizardStatusResponseService
