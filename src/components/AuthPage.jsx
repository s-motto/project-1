import React, { useState } from "react";
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaSpinner,
  FaHiking,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import useModalBodyClass from "../hooks/useModalBodyClass";

const AuthPage = ({ onClose }) => {
  const { login, register, requestPasswordRecovery } = useAuth();

  // 'login' | 'register' | 'recovery'
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useModalBodyClass();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setRecoverySuccess(false);
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  const validateForm = () => {
    if (mode === "recovery") {
      if (!formData.email) {
        setError("Inserisci la tua email");
        return false;
      }
      return true;
    }
    if (!formData.email || !formData.password) {
      setError("Email e password sono obbligatori");
      return false;
    }
    if (mode === "register") {
      if (!formData.name) {
        setError("Il nome è obbligatorio");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Le password non corrispondono");
        return false;
      }
      if (formData.password.length < 8) {
        setError("La password deve essere di almeno 8 caratteri");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      if (mode === "recovery") {
        const result = await requestPasswordRecovery(formData.email);
        if (result.success) {
          setRecoverySuccess(true);
        } else {
          setError(result.error || "Errore durante l'invio dell'email");
        }
      } else if (mode === "login") {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          if (onClose) onClose();
        } else {
          setError(result.error || "Errore durante l'accesso");
        }
      } else {
        const result = await register(
          formData.email,
          formData.password,
          formData.name,
        );
        if (result.success) {
          if (onClose) onClose();
        } else {
          setError(result.error || "Errore durante la registrazione");
        }
      }
    } catch {
      setError("Si è verificato un errore imprevisto");
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" style={{ isolation: "isolate" }}>
      <div className="modal-content max-w-md">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-center mb-2">
            <FaHiking className="text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-center">
            {mode === "login" && "Bentornato!"}
            {mode === "register" && "Crea Account"}
            {mode === "recovery" && "Recupera Password"}
          </h2>
          <p className="text-center text-blue-100 text-sm mt-1">
            {mode === "login" && "Accedi per salvare i tuoi percorsi"}
            {mode === "register" && "Registrati per iniziare"}
            {mode === "recovery" &&
              "Ti invieremo un link per reimpostare la password"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Schermata di successo recupero password */}
          {mode === "recovery" && recoverySuccess ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📬</div>
              <p
                style={{ color: "var(--text-primary)" }}
                className="font-medium"
              >
                Email inviata!
              </p>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                Controlla la tua casella di posta e clicca il link per
                reimpostare la password. Potrebbe impiegare qualche minuto.
              </p>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="btn-primary w-full mt-4"
              >
                Torna al login
              </button>
            </div>
          ) : (
            <>
              {/* Campo nome (solo registrazione) */}
              {mode === "register" && (
                <div className="form-group">
                  <label className="label">Nome</label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Il tuo nome"
                      className="input-with-icon"
                    />
                  </div>
                </div>
              )}

              {/* Campo email */}
              <div className="form-group">
                <label className="label">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@esempio.com"
                    className="input-with-icon"
                  />
                </div>
              </div>

              {/* Campo password (non in recovery) */}
              {mode !== "recovery" && (
                <div className="form-group">
                  <label className="label">Password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input-with-icon"
                    />
                  </div>
                  {/* Link password dimenticata — solo in modalità login */}
                  {mode === "login" && (
                    <div className="text-right mt-1">
                      <button
                        type="button"
                        onClick={() => switchMode("recovery")}
                        className="text-xs text-link"
                      >
                        Password dimenticata?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Conferma password (solo registrazione) */}
              {mode === "register" && (
                <div className="form-group">
                  <label className="label">Conferma Password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input-with-icon"
                    />
                  </div>
                </div>
              )}

              {/* Messaggio di errore */}
              {error && <div className="alert-error">{error}</div>}

              {/* Button submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinner-sm" />
                    <span>Caricamento...</span>
                  </>
                ) : (
                  <span>
                    {mode === "login" && "Accedi"}
                    {mode === "register" && "Registrati"}
                    {mode === "recovery" && "Invia email di recupero"}
                  </span>
                )}
              </button>

              {/* Link navigazione tra modalità */}
              <div className="text-center space-y-2">
                {mode === "recovery" ? (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-link flex items-center justify-center gap-1 mx-auto"
                  >
                    <FaArrowLeft className="text-xs" />
                    Torna al login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      switchMode(mode === "login" ? "register" : "login")
                    }
                    className="text-link"
                  >
                    {mode === "login"
                      ? "Non hai un account? Registrati"
                      : "Hai già un account? Accedi"}
                  </button>
                )}
              </div>

              {/* Button chiudi */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost w-full"
                >
                  Chiudi
                </button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
