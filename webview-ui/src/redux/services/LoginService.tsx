import { createApi } from "@reduxjs/toolkit/query/react";
import { Login } from "@thor/model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type LoginResponse = Login[];

export const LoginService = createApi({
  reducerPath: "LoginCustom", // make unique to avoid collisions with generated slice
  baseQuery: customBaseQuery,
  tagTypes: ["Login"],
  endpoints: (build) => ({
    getLogins: build.query<LoginResponse, void>({
      query: () => "Login",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Login" as const, id })),
              { type: "Login", id: "LIST" },
            ]
          : [{ type: "Login", id: "LIST" }],
    }),

    addLogin: build.mutation<Login, Partial<Login>>({
      query: (body) => ({
        url: `Login`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Login", id: "LIST" }],
    }),

    loginUser: build.mutation<Login, Partial<Login>>({
      query: (body) => ({
        url: `/auth/login`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Login", id: "LIST" }],
    }),
    getLogin: build.query<Login, string>({
      query: (id) => `Login/${id}`,
      providesTags: (result, error, id) => [{ type: "Login", id }],
    }),
    updateLogin: build.mutation<void, Pick<Login, "id"> & Partial<Login>>({
      query: ({ id, ...patch }) => ({
        url: `Login/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          LoginService.util.updateQueryData("getLogin", id, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Login", id }],
    }),
    deleteLogin: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `Login/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Login", id }],
    }),
    // Initiate password reset via email or phone
    passwordResetRequest: build.mutation<
      { status?: string; error?: string },
      { email?: string; phoneNumber?: string }
    >({
      query: (body) => ({
        url: `/auth/password-reset`,
        method: "POST",
        body,
      }),
    }),
    // Confirm password reset with token and new password
    passwordResetConfirm: build.mutation<
      { status?: string; error?: string },
      { token: string; newPassword: string }
    >({
      query: (body) => ({
        url: `/auth/password-reset-confirm`,
        method: "POST",
        body,
      }),
    }),
    // Optional helper: lookup username by email or phone
    lookupUsername: build.mutation<
      { username?: string; error?: string },
      { email?: string; phoneNumber?: string }
    >({
      query: (body) => ({
        url: `/auth/lookup-username`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetLoginQuery,
  useGetLoginsQuery,
  useLoginUserMutation,
  useAddLoginMutation,
  useUpdateLoginMutation,
  useDeleteLoginMutation,
  usePasswordResetRequestMutation,
  usePasswordResetConfirmMutation,
  useLookupUsernameMutation,
} = LoginService;
