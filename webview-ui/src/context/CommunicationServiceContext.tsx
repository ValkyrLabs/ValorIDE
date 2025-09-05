import React, { createContext, useContext, useEffect, useState } from "react";
import { CommunicationService, CommunicationRole } from "../../../src/services/communication/CommunicationService";

const CommunicationServiceContext = createContext<CommunicationService | null>(null);

export const CommunicationServiceProvider: React.FC<{ role: CommunicationRole; children: React.ReactNode }> = ({ role, children }) => {
  const [communicationService] = useState(() => new CommunicationService({ role }));

  useEffect(() => {
    communicationService.connect();
    return () => {
      communicationService.disconnect();
    };
  }, [communicationService]);

  return (
    <CommunicationServiceContext.Provider value={communicationService}>
      {children}
    </CommunicationServiceContext.Provider>
  );
};

export const useCommunicationService = (): CommunicationService => {
  const context = useContext(CommunicationServiceContext);
  if (!context) {
    throw new Error("useCommunicationService must be used within a CommunicationServiceProvider");
  }
  return context;
};
