export type HistoryItem = {
  governedCodingInference?: import("../services/swarm/SwarmCodingInference").GovernedCodingTaskBinding;
  id: string;
  ts: number;
  task: string;
  tokensIn: number;
  tokensOut: number;
  cacheWrites?: number;
  cacheReads?: number;
  totalCost: number;

  size?: number;
  shadowGitConfigWorkTree?: string;
  conversationHistoryDeletedRange?: [number, number];
};
