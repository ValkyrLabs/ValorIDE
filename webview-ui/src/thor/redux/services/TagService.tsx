import { createApi } from "@reduxjs/toolkit/query/react";
import { Tag } from "@thor/model/Tag";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type TagResponse = Tag[];

export const TagService = createApi({
  reducerPath: "Tag", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Tag"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getTagsPaged: build.query<
      TagResponse,
      { page: number; size?: number; example?: Partial<Tag> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Tag?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Tag" as const, id })),
              { type: "Tag", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getTags: build.query<TagResponse, { example?: Partial<Tag> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Tag?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Tag`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Tag" as const, id })),
              { type: "Tag", id: "LIST" },
            ]
          : [{ type: "Tag", id: "LIST" }],
    }),

    // 3) Create
    addTag: build.mutation<Tag, Partial<Tag>>({
      query: (body) => ({
        url: `Tag`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Tag", id: "LIST" }],
    }),

    // 4) Get single by ID
    getTag: build.query<Tag, string>({
      query: (id) => `Tag/${id}`,
      providesTags: (result, error, id) => [{ type: "Tag", id }],
    }),

    // 5) Update
    updateTag: build.mutation<void, Pick<Tag, "id"> & Partial<Tag>>({
      query: ({ id, ...patch }) => ({
        url: `Tag/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            TagService.util.updateQueryData("getTag", id, (draft) => {
              Object.assign(draft, patch);
            }),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }: Pick<Tag, "id">) => [
        { type: "Tag", id },
        { type: "Tag", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteTag: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Tag/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Tag", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetTagsPagedQuery`
export const {
  useGetTagsPagedQuery, // immediate fetch
  useLazyGetTagsPagedQuery, // lazy fetch
  useGetTagQuery,
  useGetTagsQuery,
  useAddTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} = TagService;
