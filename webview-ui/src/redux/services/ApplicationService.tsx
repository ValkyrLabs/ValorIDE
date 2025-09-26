import { createApi } from "@reduxjs/toolkit/query/react";
import { Application } from "../../thor/model";
import customBaseQuery from "../../thor/redux/customBaseQuery"; // Import the custom base query

type ApplicationResponse = Application[];

export const ApplicationService = createApi({
  reducerPath: "CustomApplication", // Unique path to avoid conflicts with ThorAPI ApplicationService
  baseQuery: customBaseQuery,
  tagTypes: ["Application"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getApplicationsPaged: build.query<
      ApplicationResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `Application?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "Application" as const, id })),
            { type: "Application", id: `PAGE_${page}` },
          ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getApplications: build.query<ApplicationResponse, void>({
      query: () => ({
        url: `Application`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "Application" as const, id })),
            { type: "Application", id: "LIST" },
          ]
          : [{ type: "Application", id: "LIST" }],
      // Keep data for 5 minutes to retain across tab switches
      keepUnusedDataFor: 300,
    }),

    // Generate Application Stack
    generateApplication: build.mutation<
      { blob: Blob; filename: string },
      string
    >({
      query: (applicationId) => ({
        url: `thorapi/generate/${applicationId}`,
        method: "POST",
        responseHandler: async (response) => {
          const blob = await response.blob();

          // Extract filename from Content-Disposition header
          const contentDisposition = response.headers.get(
            "content-disposition",
          );
          let filename = `${applicationId}.zip`; // fallback filename

          console.log("Content-Disposition header:", contentDisposition);

          if (contentDisposition) {
            // Try multiple patterns to extract filename
            let filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (!filenameMatch) {
              filenameMatch = contentDisposition.match(/filename=([^;\s]+)/);
            }

            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].trim();
              console.log("Extracted filename:", filename);
            } else {
              console.log("No filename match found in header");
            }
          } else {
            console.log("No Content-Disposition header found");
          }

          return { blob, filename };
        },
      }),
      invalidatesTags: (result, error, applicationId) => [
        { type: "Application", id: applicationId },
      ],
    }),

    // Deploy Application (stub for now)
    deployApplication: build.mutation<any, string>({
      query: (applicationId) => ({
        url: `thorapi/deploy/${applicationId}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, applicationId) => [
        { type: "Application", id: applicationId },
      ],
    }),

    // 3) Create
    addApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({
        url: `Application`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Application", id: "LIST" }],
    }),

    // 4) Get single by ID
    getApplication: build.query<Application, string>({
      query: (id) => `Application/${id}`,
      providesTags: (result, error, id) => [{ type: "Application", id }],
    }),

    // 5) Update
    updateApplication: build.mutation<
      void,
      Pick<Application, "id"> & Partial<Application>
    >({
      query: ({ id, ...patch }) => ({
        url: `Application/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ApplicationService.util.updateQueryData(
              "getApplication",
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
      invalidatesTags: (result, error, { id }) => [{ type: "Application", id }],
    }),

    // 6) Delete
    deleteApplication: build.mutation<{ success: boolean; id: string }, number>(
      {
        query(id) {
          return {
            url: `Application/${id}`,
            method: "DELETE",
          };
        },
        invalidatesTags: (result, error, id) => [{ type: "Application", id }],
      },
    ),
  }),
});

// Notice we now also export `useLazyGetApplicationsPagedQuery`
export const {
  useGetApplicationsPagedQuery, // immediate fetch
  useLazyGetApplicationsPagedQuery, // lazy fetch
  useGetApplicationQuery,
  useGetApplicationsQuery,
  useAddApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useGenerateApplicationMutation,
  useDeployApplicationMutation,
} = ApplicationService;
