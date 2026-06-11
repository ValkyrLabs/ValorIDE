export type CreditIntent = {
  actionName: string;
  requiredCredits: number;
  currentBalance: number;
  originView?: string;
  resumeLabel?: string;
  resumeUrl?: string;
  messageTs?: number;
};

export const CREDIT_INTENT_EVENT = "valoride:credit-intent";
