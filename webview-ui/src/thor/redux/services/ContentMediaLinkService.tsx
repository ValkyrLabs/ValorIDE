import { createApi } from "@reduxjs/toolkit/query/react";
import { ContentMediaLink } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ContentMediaLinkResponse = ContentMediaLink[];

export const ContentMediaLinkService = createApi({
  reducerPath: "ContentMediaLink", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ContentMediaLink"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getContentMediaLinksPaged: build.query<
      ContentMediaLinkResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `ContentMediaLink?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ContentMediaLink" as const,
                id,
              })),
              { type: "ContentMediaLink", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getContentMediaLinks: build.query<ContentMediaLinkResponse, void>({
      query: () => `ContentMediaLink`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ContentMediaLink" as const,
                id,
              })),
              { type: "ContentMediaLink", id: "LIST" },
            ]
          : [{ type: "ContentMediaLink", id: "LIST" }],
    }),

    // 3) Create
    addContentMediaLink: build.mutation<
      ContentMediaLink,
      Partial<ContentMediaLink>
    >({
      query: (body) => ({
        url: `ContentMediaLink`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ContentMediaLink", id: "LIST" }],
    }),

    // 4) Get single by ID
    getContentMediaLink: build.query<ContentMediaLink, string>({
      query: (id) => `ContentMediaLink/${id}`,
      providesTags: (result, error, id) => [{ type: "ContentMediaLink", id }],
    }),

    // 5) Update
    updateContentMediaLink: build.mutation<
      void,
      Pick<ContentMediaLink, "id"> & Partial<ContentMediaLink>
    >({
      query: ({ id, ...patch }) => ({
        url: `ContentMediaLink/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ContentMediaLinkService.util.updateQueryData(
              "getContentMediaLink",
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
      invalidatesTags: (result, error, { id }) => [
        { type: "ContentMediaLink", id },
      ],
    }),

    // 6) Delete
    deleteContentMediaLink: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `ContentMediaLink/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "ContentMediaLink", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetContentMediaLinksPagedQuery`
export const {
  useGetContentMediaLinksPagedQuery, // immediate fetch
  useLazyGetContentMediaLinksPagedQuery, // lazy fetch
  useGetContentMediaLinkQuery,
  useGetContentMediaLinksQuery,
  useAddContentMediaLinkMutation,
  useUpdateContentMediaLinkMutation,
  useDeleteContentMediaLinkMutation,
} = ContentMediaLinkService;
