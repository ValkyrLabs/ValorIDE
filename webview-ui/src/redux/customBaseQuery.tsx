// customBaseQuery.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { getValkyraiHost } from "@/utils/valkyraiHost";

const buildBaseQuery = () =>
  fetchBaseQuery({
    baseUrl: getValkyraiHost(),
    prepareHeaders: (headers) => {
      const token = sessionStorage.getItem("jwtToken");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  });

const customBaseQuery: BaseQueryFn = (args, api, extraOptions) => {
  const baseQuery = buildBaseQuery();
  return baseQuery(args, api, extraOptions);
};

export default customBaseQuery;
