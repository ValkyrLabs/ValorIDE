import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
import { HostInstance, HostInstanceStatusEnum } from "@thor/model/HostInstance";

// Provision now accepts a HostInstance JSON payload
export type ProvisionArgs = Pick<HostInstance, "name" | "cpus" | "memory">;

export type ProvisionResponse = {
  status?: string;
  appName?: string;
  domain?: string; // for compatibility if backend returns 'domain'
  domainName?: string; // backend currently returns 'domainName'
  serviceArn?: string;
  targetGroupArn?: string;
  listenerRuleArn?: string;
  error?: string;
};

export const ThorHostingService = createApi({
  reducerPath: "ThorHostingAPI",
  baseQuery: customBaseQuery,
  tagTypes: ["HostInstance", "ThorHosting"],
  endpoints: (build) => ({
    // POST /v1/thorapi/host-instance (application/json)
    provisionHostInstance: build.mutation<ProvisionResponse, ProvisionArgs>({
      query: ({ name, cpus = 1024, memory = 2048 }) => ({
        url: `/thorapi/host-instance`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cpus, memory }),
      }),
      invalidatesTags: [{ type: "HostInstance", id: "LIST" }],
    }),

    // POST /v1/thorapi/host-instances => HostInstance[]
    listHostedInstances: build.query<HostInstance[], void>({
      query: () => ({
        url: `/thorapi/host-instances`,
        method: "POST",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "HostInstance" as const,
                id,
              })),
              { type: "HostInstance", id: "LIST" },
            ]
          : [{ type: "HostInstance", id: "LIST" }],
    }),

    // POST /v1/thorapi/host-instance/start|stop|restart
    startHostInstance: build.mutation<
      { status?: string; appName?: string },
      string
    >({
      query: (appName) => ({
        url: `/thorapi/host-instance/start`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: appName }),
      }),
      async onQueryStarted(appName, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          ThorHostingService.util.updateQueryData(
            "listHostedInstances",
            undefined,
            (draft) => {
              draft.forEach((d) => {
                if (d.name === appName)
                  d.status = HostInstanceStatusEnum.STARTING;
              });
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: "HostInstance", id: "LIST" }],
    }),
    stopHostInstance: build.mutation<
      { status?: string; appName?: string },
      string
    >({
      query: (appName) => ({
        url: `/thorapi/host-instance/stop`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: appName }),
      }),
      async onQueryStarted(appName, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          ThorHostingService.util.updateQueryData(
            "listHostedInstances",
            undefined,
            (draft) => {
              draft.forEach((d) => {
                if (d.name === appName)
                  d.status = HostInstanceStatusEnum.STOPPED;
              });
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: "HostInstance", id: "LIST" }],
    }),
    restartHostInstance: build.mutation<
      { status?: string; appName?: string },
      string
    >({
      query: (appName) => ({
        url: `/thorapi/host-instance/restart`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: appName }),
      }),
      async onQueryStarted(appName, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          ThorHostingService.util.updateQueryData(
            "listHostedInstances",
            undefined,
            (draft) => {
              draft.forEach((d) => {
                if (d.name === appName)
                  d.status = HostInstanceStatusEnum.STARTING;
              });
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: "HostInstance", id: "LIST" }],
    }),

    // POST /v1/thorapi/host-instance/metrics
    getHostInstanceMetrics: build.query<any, string>({
      query: (appName) => ({
        url: `/thorapi/host-instance/metrics`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: appName }),
      }),
      providesTags: [{ type: "ThorHosting", id: "METRICS" }],
    }),
  }),
});

export const {
  useProvisionHostInstanceMutation,
  useListHostedInstancesQuery,
  useStartHostInstanceMutation,
  useStopHostInstanceMutation,
  useRestartHostInstanceMutation,
  useLazyGetHostInstanceMetricsQuery,
} = ThorHostingService;
