import { createApi } from "@reduxjs/toolkit/query/react";
import { SkillProfile } from "@thor/model/SkillProfile";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type SkillProfileResponse = SkillProfile[];

export const SkillProfileService = createApi({
  reducerPath: "SkillProfile", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["SkillProfile"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSkillProfilesPaged: build.query<
      SkillProfileResponse,
      { page: number; size?: number; example?: Partial<SkillProfile> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SkillProfile?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SkillProfile" as const,
                id,
              })),
              { type: "SkillProfile", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSkillProfiles: build.query<
      SkillProfileResponse,
      { example?: Partial<SkillProfile> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SkillProfile?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SkillProfile`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SkillProfile" as const,
                id,
              })),
              { type: "SkillProfile", id: "LIST" },
            ]
          : [{ type: "SkillProfile", id: "LIST" }],
    }),

    // 3) Create
    addSkillProfile: build.mutation<SkillProfile, Partial<SkillProfile>>({
      query: (body) => ({
        url: `SkillProfile`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SkillProfile", id: "LIST" }],
    }),

    // 4) Get single by ID
    getSkillProfile: build.query<SkillProfile, string>({
      query: (id) => `SkillProfile/${id}`,
      providesTags: (result, error, id) => [{ type: "SkillProfile", id }],
    }),

    // 5) Update
    updateSkillProfile: build.mutation<
      void,
      Pick<SkillProfile, "id"> & Partial<SkillProfile>
    >({
      query: ({ id, ...patch }) => ({
        url: `SkillProfile/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SkillProfileService.util.updateQueryData(
              "getSkillProfile",
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
      invalidatesTags: (result, error, { id }: Pick<SkillProfile, "id">) => [
        { type: "SkillProfile", id },
        { type: "SkillProfile", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteSkillProfile: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `SkillProfile/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "SkillProfile", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetSkillProfilesPagedQuery`
export const {
  useGetSkillProfilesPagedQuery, // immediate fetch
  useLazyGetSkillProfilesPagedQuery, // lazy fetch
  useGetSkillProfileQuery,
  useGetSkillProfilesQuery,
  useAddSkillProfileMutation,
  useUpdateSkillProfileMutation,
  useDeleteSkillProfileMutation,
} = SkillProfileService;
