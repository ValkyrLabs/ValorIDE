import { createApi } from "@reduxjs/toolkit/query/react";
import { ConsultingProfile } from "@thor/model/ConsultingProfile";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ConsultingProfileResponse = ConsultingProfile[];

export const ConsultingProfileService = createApi({
  reducerPath: "ConsultingProfile", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ConsultingProfile"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getConsultingProfilesPaged: build.query<
      ConsultingProfileResponse,
      { page: number; size?: number; example?: Partial<ConsultingProfile> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ConsultingProfile?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ConsultingProfile" as const,
                id,
              })),
              { type: "ConsultingProfile", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getConsultingProfiles: build.query<
      ConsultingProfileResponse,
      { example?: Partial<ConsultingProfile> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ConsultingProfile?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ConsultingProfile`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ConsultingProfile" as const,
                id,
              })),
              { type: "ConsultingProfile", id: "LIST" },
            ]
          : [{ type: "ConsultingProfile", id: "LIST" }],
    }),

    // 3) Create
    addConsultingProfile: build.mutation<
      ConsultingProfile,
      Partial<ConsultingProfile>
    >({
      query: (body) => ({
        url: `ConsultingProfile`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ConsultingProfile", id: "LIST" }],
    }),

    // 4) Get single by ID
    getConsultingProfile: build.query<ConsultingProfile, string>({
      query: (id) => `ConsultingProfile/${id}`,
      providesTags: (result, error, id) => [{ type: "ConsultingProfile", id }],
    }),

    // 5) Update
    updateConsultingProfile: build.mutation<
      void,
      Pick<ConsultingProfile, "id"> & Partial<ConsultingProfile>
    >({
      query: ({ id, ...patch }) => ({
        url: `ConsultingProfile/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ConsultingProfileService.util.updateQueryData(
              "getConsultingProfile",
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
        { id }: Pick<ConsultingProfile, "id">,
      ) => [
        { type: "ConsultingProfile", id },
        { type: "ConsultingProfile", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteConsultingProfile: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `ConsultingProfile/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "ConsultingProfile", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetConsultingProfilesPagedQuery`
export const {
  useGetConsultingProfilesPagedQuery, // immediate fetch
  useLazyGetConsultingProfilesPagedQuery, // lazy fetch
  useGetConsultingProfileQuery,
  useGetConsultingProfilesQuery,
  useAddConsultingProfileMutation,
  useUpdateConsultingProfileMutation,
  useDeleteConsultingProfileMutation,
} = ConsultingProfileService;
