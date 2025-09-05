import { createApi } from "@reduxjs/toolkit/query/react";
import { Login, Principal } from "../../thor/model";
import customBaseQuery from "../customBaseQuery";

type NormalizedLoginResponse = { token: string; user?: Principal };

type LoginListResponse = Login[];

// This API slice is dedicated to auth to avoid name/reducerPath collisions
export const AuthService = createApi({
  reducerPath: "Auth", // unique reducer path (previously collided with thor Login)
  baseQuery: customBaseQuery,
  tagTypes: ["Auth"],
  endpoints: (build) => ({
    getLogins: build.query<LoginListResponse, void>({
      query: () => "Login",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Auth" as const, id })),
              { type: "Auth", id: "LIST" },
            ]
          : [{ type: "Auth", id: "LIST" }],
    }),

    // Generic create login (not used for auth flow but kept for parity)
    addLogin: build.mutation<Login, Partial<Login>>({
      query: (body) => ({
        url: `Login`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Auth", id: "LIST" }],
    }),

    // Login call to backend. Normalizes response into { token, user }
    loginUser: build.mutation<NormalizedLoginResponse, Partial<Login>>({
      query: (body) => ({
        url: `${import.meta.env.VITE_basePath || "http://localhost:8080/v1"}/auth/login`,
        method: "POST",
        body,
      }),
      transformResponse: (response: any): NormalizedLoginResponse => {
        // Backend returns { token, authenticatedPrincipal } where authenticatedPrincipal can be
        // an object or a JSON string. Normalize to { token, user?: Principal }.
        const token: string | undefined = response?.token;
        let user: Principal | undefined;
        const ap = response?.authenticatedPrincipal;
        if (ap) {
          try {
            user = typeof ap === "string" ? JSON.parse(ap) : ap;
          } catch {
            // leave user undefined if parsing fails
          }
        }
        return { token: token ?? "", user };
      },
      invalidatesTags: [{ type: "Auth", id: "LIST" }],
    }),

    getLogin: build.query<Login, string>({
      query: (id) => `Login/${id}`,
      providesTags: (result, error, id) => [{ type: "Auth", id }],
    }),
    updateLogin: build.mutation<void, Pick<Login, "id"> & Partial<Login>>({
      query: ({ id, ...patch }) => ({
        url: `Login/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (!id) return;
        const patchResult = dispatch(
          AuthService.util.updateQueryData("getLogin", id, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Auth", id }],
    }),
    deleteLogin: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `Login/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Auth", id }],
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
} = AuthService;

