import { createApi } from "@reduxjs/toolkit/query/react";
import { JobApplicationRequest } from "@thor/model/JobApplicationRequest";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type JobApplicationRequestResponse = JobApplicationRequest[];

export const JobApplicationRequestService = createApi({
  reducerPath: "JobApplicationRequest", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["JobApplicationRequest"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getJobApplicationRequestsPaged: build.query<
      JobApplicationRequestResponse,
      { page: number; size?: number; example?: Partial<JobApplicationRequest> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `JobApplicationRequest?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "JobApplicationRequest" as const,
                id,
              })),
              { type: "JobApplicationRequest", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getJobApplicationRequests: build.query<
      JobApplicationRequestResponse,
      { example?: Partial<JobApplicationRequest> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `JobApplicationRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `JobApplicationRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "JobApplicationRequest" as const,
                id,
              })),
              { type: "JobApplicationRequest", id: "LIST" },
            ]
          : [{ type: "JobApplicationRequest", id: "LIST" }],
    }),

    // 3) Create
    addJobApplicationRequest: build.mutation<
      JobApplicationRequest,
      Partial<JobApplicationRequest>
    >({
      query: (body) => ({
        url: `JobApplicationRequest`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "JobApplicationRequest", id: "LIST" }],
    }),

    // 4) Get single by ID
    getJobApplicationRequest: build.query<JobApplicationRequest, string>({
      query: (id) => `JobApplicationRequest/${id}`,
      providesTags: (result, error, id) => [
        { type: "JobApplicationRequest", id },
      ],
    }),

    // 5) Update
    updateJobApplicationRequest: build.mutation<
      void,
      Pick<JobApplicationRequest, "id"> & Partial<JobApplicationRequest>
    >({
      query: ({ id, ...patch }) => ({
        url: `JobApplicationRequest/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            JobApplicationRequestService.util.updateQueryData(
              "getJobApplicationRequest",
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
        { id }: Pick<JobApplicationRequest, "id">,
      ) => [
        { type: "JobApplicationRequest", id },
        { type: "JobApplicationRequest", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteJobApplicationRequest: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `JobApplicationRequest/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "JobApplicationRequest", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetJobApplicationRequestsPagedQuery`
export const {
  useGetJobApplicationRequestsPagedQuery, // immediate fetch
  useLazyGetJobApplicationRequestsPagedQuery, // lazy fetch
  useGetJobApplicationRequestQuery,
  useGetJobApplicationRequestsQuery,
  useAddJobApplicationRequestMutation,
  useUpdateJobApplicationRequestMutation,
  useDeleteJobApplicationRequestMutation,
} = JobApplicationRequestService;
