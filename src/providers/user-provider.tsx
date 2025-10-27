"use client";

import { createContext, useContext, ReactNode, useState } from "react";

interface UserContextType {
  isHost: boolean;
  toggleRole: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [isHost, setIsHost] = useState(false);

  const toggleRole = () => setIsHost(prev => !prev);

  return (
    <UserContext.Provider value={{ isHost, toggleRole }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}