import TrackerErrorBoundary from "./TrackerErrorBoundary";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaRoute,
  FaTrash,
  FaMapMarkedAlt,
  FaSpinner,
  FaCheckCircle,
  FaPlay,
  FaEdit,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import routesService from "../services/routesService";
import ActiveTracking from "./ActiveTracking";
import { useToast } from "../contexts/ToastContext";
import { useSettings } from "../contexts/SettingsContext";
import {
  formatDistance,
  formatElevation,
  formatDurationMinutes,
  formatTimestamp,
} from "../utils/gpsUtils";
import ConfirmModal from "./ConfirmModal";
import logger from "../utils/logger";
import useConfirmModal from "../hooks/useConfirmModal";

const SavedRoutes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingNameId, setSavingNameId] = useState(null);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal({
    routeId: null,
    routeName: "",
    routeDistance: 0,
    routeDuration: 0,
  });

  const { toast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    if (user) {
      loadRoutes();
    }
  }, [user]);

  const loadRoutes = async () => {
    setLoading(true);
    const result = await routesService.getSavedRoutes(user.$id);
    if (result.success) {
      setRoutes(result.data);
    }
    setLoading(false);
  };

  const openDeleteConfirm = (route) => {
    openConfirm("delete", {
      routeId: route.$id,
      routeName: route.name,
      routeDistance: 0,
      routeDuration: 0,
    });
  };

  const openCompleteConfirm = (route) => {
    openConfirm("complete", {
      routeId: route.$id,
      routeName: route.name,
      routeDistance: route.distance,
      routeDuration: route.duration,
    });
  };

  const handleConfirm = async () => {
    if (confirmModal.type === "delete") {
      await executeDelete(confirmModal.routeId);
    } else if (confirmModal.type === "complete") {
      await executeComplete(confirmModal.routeId);
    }
    closeConfirm();
  };

  const executeDelete = async (routeId) => {
    setDeleting(routeId);
    const result = await routesService.deleteRoute(routeId);
    if (result.success) {
      setRoutes(routes.filter((r) => r.$id !== routeId));
      toast.success("Percorso eliminato");
    } else {
      toast.error("Errore durante l'eliminazione: " + result.error);
    }
    setDeleting(null);
  };

  const executeComplete = async (routeId) => {
    setCompleting(routeId);
    const result = await routesService.completeRoute(routeId);

    if (result.success) {
      setRoutes(routes.filter((r) => r.$id !== routeId));
      toast.success(
        "✅ Percorso segnato come completato! Controlla la Dashboard per le statistiche.",
      );

      try {
        const completedRoutes = await routesService.getCompletedRoutes(
          user.$id,
        );
        if (completedRoutes.success) {
          const stats = await import("../services/statsService").then((m) =>
            m.default.calculateStats(completedRoutes.data),
          );
          const achievementsService =
            await import("../services/achievementsService").then(
              (m) => m.default,
            );
          const achievementResult =
            await achievementsService.updateAchievements(
              user.$id,
              stats,
              completedRoutes.data,
            );

          if (
            achievementResult.success &&
            achievementResult.data.newBadges.length > 0
          ) {
            achievementResult.data.newBadges.forEach((badgeId) => {
              const badge = achievementsService.getBadgeInfo(badgeId);
              toast.success(`🏆 Badge sbloccato: ${badge.name}!`);
            });
          }

          if (achievementResult.success && achievementResult.data.leveledUp) {
            const levelInfo = achievementsService.getLevelInfo(
              achievementResult.data.currentLevel,
            );
            toast.success(
              `🎉 Sei salito al livello ${levelInfo.level}: ${levelInfo.name}!`,
            );
          }

          if (achievementResult.success) {
            if (achievementResult.data.streakLost) {
              toast.error("💔 Streak perso! Riparti da oggi!");
            } else if (achievementResult.data.newStreak > 1) {
              toast.success(
                `🔥 Streak: ${achievementResult.data.newStreak} giorni consecutivi!`,
              );
            }
          }

          if (
            achievementResult.success &&
            achievementResult.data.challengesCompleted?.length > 0
          ) {
            achievementResult.data.challengesCompleted.forEach(
              (challengeId) => {
                const challenges = achievementsService.getAllChallenges();
                const challenge = challenges.find((c) => c.id === challengeId);
                if (challenge) {
                  toast.success(`🎯 Sfida completata: ${challenge.name}!`);
                }
              },
            );
          }
        }
      } catch (error) {
        logger.error("Error updating achievements:", error);
      }
    } else {
      toast.error("Errore durante il completamento: " + result.error);
    }

    setCompleting(null);
  };

  const handleStartTracking = (route) => {
    setActiveRoute(route);
  };

  const startRename = (route) => {
    setEditingId(route.$id);
    setNameDraft(route.name || "");
  };

  const cancelRename = () => {
    setEditingId(null);
    setNameDraft("");
  };

  const saveRename = async (routeId) => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    setSavingNameId(routeId);
    const res = await routesService.updateRouteName(routeId, trimmed);
    if (res.success) {
      setRoutes((prev) =>
        prev.map((r) => (r.$id === routeId ? { ...r, name: trimmed } : r)),
      );
      toast.success("Nome aggiornato");
      setEditingId(null);
      setNameDraft("");
    } else {
      toast.error("Errore: " + res.error);
    }
    setSavingNameId(null);
  };

  const handleCloseTracking = () => {
    setActiveRoute(null);
    loadRoutes();
  };

  const handleTrackingComplete = () => {
    setActiveRoute(null);
    loadRoutes();
  };

  const getCompleteModalMessage = () => {
    const distanceFormatted = formatDistance(
      confirmModal.routeDistance,
      settings?.distanceUnit || "km",
    );
    const durationFormatted = formatDurationMinutes(
      confirmModal.routeDuration,
      settings?.durationFormat || "hms",
    );

    return (
      <div className="space-y-3">
        <p>
          Hai davvero percorso <strong>"{confirmModal.routeName}"</strong>?
        </p>

        <div
          className="rounded-lg p-3 text-sm"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-4">
            <span>📏 {distanceFormatted}</span>
            <span>⏱️ {durationFormatted}</span>
          </div>
        </div>

        <div
          className="rounded-lg p-3 text-sm"
          style={{
            backgroundColor: "rgba(255, 147, 79, 0.1)",
            border: "1px solid var(--color-orange)",
          }}
        >
          <p className="font-medium" style={{ color: "var(--color-orange)" }}>
            ⚠️ Attenzione
          </p>
          <p className="mt-1" style={{ color: "var(--text-primary)" }}>
            I <strong>{distanceFormatted}</strong> pianificati verranno aggiunti
            alle tue statistiche mensili. Senza tracking GPS non possiamo
            verificare la distanza reale.
          </p>
        </div>

        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          💡 Per statistiche più accurate, usa il tracking GPS con il pulsante
          ▶️
        </p>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="card-center card-lg">
        <p className="text-gray-600-custom">
          Effettua il login per vedere i tuoi percorsi salvati
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card-center card-lg">
        <FaSpinner className="spinner mx-auto" />
        <p className="mt-2 text-gray-600-custom">Caricamento percorsi...</p>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="card-center card-lg">
        <FaRoute className="text-4xl text-gray-300 mb-3 mx-auto" />
        <p className="text-gray-600-custom">
          Non hai ancora salvato nessun percorso
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-lg shadow-md p-4 w-full max-w-xl"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <h3
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          I tuoi percorsi salvati
        </h3>

        <div className="list-container">
          {routes.map((route) => (
            <div
              key={route.$id}
              className="rounded-lg p-3 transition"
              style={{
                border: "2px solid var(--border-color)",
                backgroundColor: "var(--bg-card)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-card)")
              }
            >
              <div className="flex-start">
                <div className="flex-1">
                  {editingId === route.$id ? (
                    <div className="space-x-2-items mb-2">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="input flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(route.$id);
                          if (e.key === "Escape") cancelRename();
                        }}
                      />
                      <button
                        onClick={() => saveRename(route.$id)}
                        disabled={savingNameId === route.$id}
                        className="btn-success btn-icon"
                        title="Salva"
                      >
                        {savingNameId === route.$id ? (
                          <FaSpinner className="spinner-sm" />
                        ) : (
                          <FaCheck />
                        )}
                      </button>
                      <button
                        onClick={cancelRename}
                        className="btn-ghost btn-icon"
                        title="Annulla"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-between mb-2">
                      <h4
                        className="font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {route.name}
                      </h4>
                      <button
                        onClick={() => startRename(route)}
                        className="icon-btn-gray"
                        title="Rinomina"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )}

                  <div
                    className="text-xs mt-1 space-y-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <p>📍 {route.startPoint.name?.substring(0, 50)}...</p>
                    <p>🏁 {route.endPoint.name?.substring(0, 50)}...</p>
                    <div className="space-x-2-items mt-2">
                      <span>
                        📏{" "}
                        {formatDistance(
                          route.distance,
                          settings?.distanceUnit || "km",
                        )}
                      </span>
                      <span>
                        ⏱️{" "}
                        {formatDurationMinutes(
                          route.duration,
                          settings?.durationFormat || "hms",
                        )}
                      </span>
                      <span>
                        ⛰️{" "}
                        {formatElevation(
                          route.ascent,
                          settings?.elevationUnit || "m",
                        )}
                      </span>
                    </div>
                    {route.createdAt && (
                      <p className="text-muted">
                        Salvato: {formatTimestamp(route.createdAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-3">
                  <button
                    onClick={() => handleStartTracking(route)}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                    title="Inizia percorso con tracking GPS"
                  >
                    <FaPlay className="text-lg" />
                  </button>

                  <button
                    onClick={() =>
                      navigate("/", { state: { preloadedRoute: route } })
                    }
                    className="text-indigo-600 hover:text-indigo-800 p-1 transition-colors"
                    title="Visualizza percorso sulla mappa"
                  >
                    <FaMapMarkedAlt className="text-lg" />
                  </button>

                  <button
                    onClick={() => openCompleteConfirm(route)}
                    disabled={completing === route.$id}
                    className="text-green-600 hover:text-green-800 disabled:text-gray-400 p-1 transition-colors"
                    title="Segna come completato (senza GPS)"
                  >
                    {completing === route.$id ? (
                      <FaSpinner className="spinner-sm" />
                    ) : (
                      <FaCheckCircle className="text-lg" />
                    )}
                  </button>

                  <button
                    onClick={() => openDeleteConfirm(route)}
                    disabled={deleting === route.$id}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400 p-1 transition-colors"
                    title="Elimina percorso"
                  >
                    {deleting === route.$id ? (
                      <FaSpinner className="spinner-sm" />
                    ) : (
                      <FaTrash className="text-lg" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeRoute && (
        <TrackerErrorBoundary
          user={user}
          route={activeRoute}
          onGoHome={() => {
            setActiveRoute(null);
            loadRoutes();
          }}
        >
          <ActiveTracking
            route={activeRoute}
            onClose={handleCloseTracking}
            onComplete={handleTrackingComplete}
          />
        </TrackerErrorBoundary>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === "delete"}
        title="Elimina percorso"
        message={`Sei sicuro di voler eliminare "${confirmModal.routeName}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        cancelText="Annulla"
        variant="danger"
        isLoading={deleting !== null}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === "complete"}
        title="Segna come completato"
        message={getCompleteModalMessage()}
        confirmText="Sì, l'ho completato"
        cancelText="Annulla"
        variant="warning"
        isLoading={completing !== null}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
};

export default SavedRoutes;
