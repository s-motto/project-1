import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { account } from "../appwrite";
import { ID } from "appwrite";
import logger from "../utils/logger";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return { success: true };
    } catch (error) {
      logger.error("Login error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const register = useCallback(
    async (email, password, name) => {
      try {
        await account.create(ID.unique(), email, password, name);
        await login(email, password);
        return { success: true };
      } catch (error) {
        logger.error("Registration error:", error);
        return { success: false, error: error.message };
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      return { success: true };
    } catch (error) {
      logger.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  // Invia l'email di recupero password con il link per il reset
  const requestPasswordRecovery = useCallback(async (email) => {
    try {
      await account.createRecovery(
        email,
        "https://lets-walk-hiking-app.vercel.app/reset-password",
      );
      return { success: true };
    } catch (error) {
      logger.error("Password recovery error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  // Conferma il reset della password usando userId e secret ricevuti via email
  const confirmPasswordRecovery = useCallback(
    async (userId, secret, newPassword) => {
      try {
        await account.updateRecovery(userId, secret, newPassword);
        return { success: true };
      } catch (error) {
        logger.error("Password recovery confirm error:", error);
        return { success: false, error: error.message };
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      checkUser,
      requestPasswordRecovery,
      confirmPasswordRecovery,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      checkUser,
      requestPasswordRecovery,
      confirmPasswordRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
