import { createApi } from "@reduxjs/toolkit/query/react";
import { Note } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type NoteResponse = Note[];

export const NoteService = createApi({
  reducerPath: "Note", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Note"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getNotesPaged: build.query<NoteResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Note?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Note" as const, id })),
              { type: "Note", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getNotes: build.query<NoteResponse, void>({
      query: () => `Note`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Note" as const, id })),
              { type: "Note", id: "LIST" },
            ]
          : [{ type: "Note", id: "LIST" }],
    }),

    // 3) Create
    addNote: build.mutation<Note, Partial<Note>>({
      query: (body) => ({
        url: `Note`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Note", id: "LIST" }],
    }),

    // 4) Get single by ID
    getNote: build.query<Note, string>({
      query: (id) => `Note/${id}`,
      providesTags: (result, error, id) => [{ type: "Note", id }],
    }),

    // 5) Update
    updateNote: build.mutation<void, Pick<Note, "id"> & Partial<Note>>({
      query: ({ id, ...patch }) => ({
        url: `Note/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            NoteService.util.updateQueryData("getNote", id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: "Note", id }],
    }),

    // 6) Delete
    deleteNote: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Note/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Note", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetNotesPagedQuery`
export const {
  useGetNotesPagedQuery, // immediate fetch
  useLazyGetNotesPagedQuery, // lazy fetch
  useGetNoteQuery,
  useGetNotesQuery,
  useAddNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = NoteService;
