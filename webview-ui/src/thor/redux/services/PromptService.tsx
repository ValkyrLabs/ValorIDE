import { createApi } from "@reduxjs/toolkit/query/react";
import { Prompt } from "@thor/model/Prompt";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PromptResponse = Prompt[];

export const PromptService = createApi({
  reducerPath: "Prompt", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Prompt"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPromptsPaged: build.query<
      PromptResponse,
      { page: number; size?: number; example?: Partial<Prompt> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Prompt?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Prompt" as const, id })),
              { type: "Prompt", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPrompts: build.query<
      PromptResponse,
      { example?: Partial<Prompt> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Prompt?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Prompt`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Prompt" as const, id })),
              { type: "Prompt", id: "LIST" },
            ]
          : [{ type: "Prompt", id: "LIST" }],
    }),

    // 3) Create
    addPrompt: build.mutation<Prompt, Partial<Prompt>>({
      query: (body) => ({
        url: `Prompt`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Prompt", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPrompt: build.query<Prompt, string>({
      query: (id) => `Prompt/${id}`,
      providesTags: (result, error, id) => [{ type: "Prompt", id }],
    }),

    // 5) Update
    updatePrompt: build.mutation<void, Pick<Prompt, "id"> & Partial<Prompt>>({
      query: ({ id, ...patch }) => ({
        url: `Prompt/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PromptService.util.updateQueryData("getPrompt", id, (draft) => {
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
      invalidatesTags: (result, error, { id }: Pick<Prompt, "id">) => [
        { type: "Prompt", id },
        { type: "Prompt", id: "LIST" },
      ],
    }),

    // 6) Delete
    deletePrompt: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Prompt/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Prompt", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPromptsPagedQuery`
export const {
  useGetPromptsPagedQuery, // immediate fetch
  useLazyGetPromptsPagedQuery, // lazy fetch
  useGetPromptQuery,
  useGetPromptsQuery,
  useAddPromptMutation,
  useUpdatePromptMutation,
  useDeletePromptMutation,
} = PromptService;
