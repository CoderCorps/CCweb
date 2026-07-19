"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, setAccessToken, getAccessToken } from "./api";
import { useProjectStore, useNotificationStore, useDashboardStore, useProjectWorkspaceStore } from "@/stores";

interface Profile {
  bio: string;
  college: string;
  skills: string[];
  github_url: string;
  linkedin_url: string;
  resume_url: string;
  is_public: boolean;
  availability?: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  avatar_url: string | null;
  created_at: string;
  profile: Profile | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string, role: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Returns the current in-memory JWT access token — for WebSocket connections */
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check login status on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/auth/me");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (err) {
        // Ignored, user is just guest
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", pass);

      const res = await api.post("/auth/login", formData, { skipAuth: true });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      return false;
    }
  };

  const signup = async (
    name: string,
    email: string,
    pass: string,
    role: string
  ): Promise<boolean> => {
    try {
      const res = await api.post(
        "/auth/signup",
        { name, email, password: pass, role },
        { skipAuth: true }
      );

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (err) {
      // Ignored
    } finally {
      setAccessToken(null);
      setUser(null);
      // Reset all Zustand stores on logout so data doesn't leak to next session
      useProjectStore.getState().reset();
      useNotificationStore.getState().reset();
      useDashboardStore.getState().reset();
      useProjectWorkspaceStore.getState().reset();
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (err) {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, getToken: getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
