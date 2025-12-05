import { createApi } from "@reduxjs/toolkit/query/react";
import { JobApplication } from "@thor/model/JobApplication";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type JobApplicationResponse = JobApplication[];

export const JobApplicationService = createApi({
  reducerPath: "JobApplication", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["JobApplication"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getJobApplicationsPaged: build.query<
      JobApplicationResponse,
      { page: number; size?: number; example?: Partial<JobApplication> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `JobApplication?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "JobApplication" as const,
                id,
              })),
              { type: "JobApplication", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getJobApplications: build.query<
      JobApplicationResponse,
      { example?: Partial<JobApplication> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `JobApplication?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `JobApplication`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "JobApplication" as const,
                id,
              })),
              { type: "JobApplication", id: "LIST" },
            ]
          : [{ type: "JobApplication", id: "LIST" }],
    }),

    // 3) Create
    addJobApplication: build.mutation<JobApplication, Partial<JobApplication>>({
      query: (body) => ({
        url: `JobApplication`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "JobApplication", id: "LIST" }],
    }),

    // 4) Get single by ID
    getJobApplication: build.query<JobApplication, string>({
      query: (id) => `JobApplication/${id}`,
      providesTags: (result, error, id) => [{ type: "JobApplication", id }],
    }),

    // 5) Update
    updateJobApplication: build.mutation<
      void,
      Pick<JobApplication, "id"> & Partial<JobApplication>
    >({
      query: ({ id, ...patch }) => ({
        url: `JobApplication/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            JobApplicationService.util.updateQueryData(
              "getJobApplication",
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
      invalidatesTags: (result, error, { id }: Pick<JobApplication, "id">) => [
        { type: "JobApplication", id },
        { type: "JobApplication", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteJobApplication: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `JobApplication/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "JobApplication", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetJobApplicationsPagedQuery`
export const {
  useGetJobApplicationsPagedQuery, // immediate fetch
  useLazyGetJobApplicationsPagedQuery, // lazy fetch
  useGetJobApplicationQuery,
  useGetJobApplicationsQuery,
  useAddJobApplicationMutation,
  useUpdateJobApplicationMutation,
  useDeleteJobApplicationMutation,
} = JobApplicationService;
