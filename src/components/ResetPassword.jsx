import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaLock, FaSpinner, FaHiking } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Legge userId e secret dai parametri dell'URL
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  // Se i parametri mancano il link è invalido o scaduto
  const isValidLink = Boolean(userId && secret);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      return;
    }

    setLoading(true);
    const result = await confirmPasswordRecovery(userId, secret, password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(
        result.error ||
          "Errore durante il reset. Il link potrebbe essere scaduto.",
      );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header-primary">
            <div className="flex items-center justify-center mb-2">
              <FaHiking className="text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-center">
              {success ? "Password aggiornata!" : "Nuova Password"}
            </h2>
            <p className="text-center text-blue-100 text-sm mt-1">
              {success
                ? "Ora puoi accedere con la tua nuova password"
                : "Scegli una nuova password per il tuo account"}
            </p>
          </div>

          <div className="modal-body">
            {/* Link non valido */}
            {!isValidLink && (
              <div className="text-center space-y-4">
                <div className="text-5xl">⚠️</div>
                <p
                  style={{ color: "var(--text-primary)" }}
                  className="font-medium"
                >
                  Link non valido
                </p>
                <p
                  style={{ color: "var(--text-secondary)" }}
                  className="text-sm"
                >
                  Questo link di recupero non è valido o è già stato utilizzato.
                  Richiedi un nuovo link dalla pagina di login.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="btn-primary w-full"
                >
                  Torna alla home
                </button>
              </div>
            )}

            {/* Successo */}
            {isValidLink && success && (
              <div className="text-center space-y-4">
                <div className="text-5xl">✅</div>
                <p
                  style={{ color: "var(--text-secondary)" }}
                  className="text-sm"
                >
                  La tua password è stata aggiornata. Puoi ora accedere con le
                  nuove credenziali.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="btn-primary w-full"
                >
                  Vai al login
                </button>
              </div>
            )}

            {/* Form reset */}
            {isValidLink && !success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="label">Nuova password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      className="input-with-icon"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Conferma nuova password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      className="input-with-icon"
                    />
                  </div>
                </div>

                {error && <div className="alert-error">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner-sm" />
                      <span>Aggiornamento...</span>
                    </>
                  ) : (
                    <span>Aggiorna password</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-ghost w-full"
                >
                  Annulla
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
