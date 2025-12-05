import { createApi } from "@reduxjs/toolkit/query/react";
import { AgentBillingCharge } from "@thor/model/AgentBillingCharge";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type AgentBillingChargeResponse = AgentBillingCharge[];

export const AgentBillingChargeService = createApi({
  reducerPath: "AgentBillingCharge", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["AgentBillingCharge"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAgentBillingChargesPaged: build.query<
      AgentBillingChargeResponse,
      { page: number; size?: number; example?: Partial<AgentBillingCharge> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AgentBillingCharge?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentBillingCharge" as const,
                id,
              })),
              { type: "AgentBillingCharge", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAgentBillingCharges: build.query<
      AgentBillingChargeResponse,
      { example?: Partial<AgentBillingCharge> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AgentBillingCharge?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AgentBillingCharge`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentBillingCharge" as const,
                id,
              })),
              { type: "AgentBillingCharge", id: "LIST" },
            ]
          : [{ type: "AgentBillingCharge", id: "LIST" }],
    }),

    // 3) Create
    addAgentBillingCharge: build.mutation<
      AgentBillingCharge,
      Partial<AgentBillingCharge>
    >({
      query: (body) => ({
        url: `AgentBillingCharge`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AgentBillingCharge", id: "LIST" }],
    }),

    // 4) Get single by ID
    getAgentBillingCharge: build.query<AgentBillingCharge, string>({
      query: (id) => `AgentBillingCharge/${id}`,
      providesTags: (result, error, id) => [{ type: "AgentBillingCharge", id }],
    }),

    // 5) Update
    updateAgentBillingCharge: build.mutation<
      void,
      Pick<AgentBillingCharge, "id"> & Partial<AgentBillingCharge>
    >({
      query: ({ id, ...patch }) => ({
        url: `AgentBillingCharge/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AgentBillingChargeService.util.updateQueryData(
              "getAgentBillingCharge",
              id,
              (draft) => {
                Object.assign(draft, patch);
              },
            ),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (
        result,
        error,
        { id }: Pick<AgentBillingCharge, "id">,
      ) => [
        { type: "AgentBillingCharge", id },
        { type: "AgentBillingCharge", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteAgentBillingCharge: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `AgentBillingCharge/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "AgentBillingCharge", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetAgentBillingChargesPagedQuery`
export const {
  useGetAgentBillingChargesPagedQuery, // immediate fetch
  useLazyGetAgentBillingChargesPagedQuery, // lazy fetch
  useGetAgentBillingChargeQuery,
  useGetAgentBillingChargesQuery,
  useAddAgentBillingChargeMutation,
  useUpdateAgentBillingChargeMutation,
  useDeleteAgentBillingChargeMutation,
} = AgentBillingChargeService;
