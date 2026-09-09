import { createApi } from "@reduxjs/toolkit/query/react";
import { Application } from "@thorapi/model";
import customBaseQuery from "../..//redux/customBaseQuery"; // Import the custom base query
import {
  applicationTagsFor,
  normalizeApplicationResponse,
} from "./applicationResponse";

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
      transformResponse: normalizeApplicationResponse,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...applicationTagsFor(result),
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
      transformResponse: normalizeApplicationResponse,
      providesTags: (result) =>
        result
          ? [...applicationTagsFor(result), { type: "Application", id: "LIST" }]
          : [{ type: "Application", id: "LIST" }],
      // Keep data for 5 minutes to retain across tab switches
      keepUnusedDataFor: 300,
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
  useDeployApplicationMutation,
} = ApplicationService;
