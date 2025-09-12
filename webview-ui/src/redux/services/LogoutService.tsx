import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Logout } from "@thor/model";
import { BASE_PATH } from "../../thor/src";

type LogoutResponse = Logout[];

export const LogoutService = createApi({
  reducerPath: "LogoutCustom", // make unique to avoid collisions with generated slice
  baseQuery: fetchBaseQuery({ baseUrl: BASE_PATH }),
  tagTypes: ["Logout"],
  endpoints: (build) => ({
    getLogouts: build.query<LogoutResponse, void>({
      query: () => "Logout",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Logout" as const, id })),
              { type: "Logout", id: "LIST" },
            ]
          : [{ type: "Logout", id: "LIST" }],
    }),
    addLogout: build.mutation<Logout, Partial<Logout>>({
      query: (body) => ({
        url: `Logout`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Logout", id: "LIST" }],
    }),
    getLogout: build.query<Logout, string>({
      query: (id) => `Logout/${id}`,
      providesTags: (result, error, id) => [{ type: "Logout", id }],
    }),
    updateLogout: build.mutation<void, Pick<Logout, "id"> & Partial<Logout>>({
      query: ({ id, ...patch }) => ({
        url: `Logout/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          LogoutService.util.updateQueryData("getLogout", id, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Logout", id }],
    }),
    deleteLogout: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `Logout/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Logout", id }],
    }),
  }),
});

export const {
  useGetLogoutQuery,
  useGetLogoutsQuery,
  useAddLogoutMutation,
  useUpdateLogoutMutation,
  useDeleteLogoutMutation,
} = LogoutService;
