import React from 'react'
import { FaHiking, FaTimes, FaMapMarkedAlt, FaRoute, FaBookmark, FaLocationArrow } from 'react-icons/fa'

const InfoModal = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header-primary sticky top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaHiking className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">Let's Walk!</h2>
                <p className="text-sm text-blue-100">Pianifica i tuoi percorsi a piedi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Chiudi"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Cos'è */}
          <section className="info-section">
            <h3 className="info-section-title">👋 Benvenuto!</h3>
            <p className="text-gray-600 leading-relaxed">
              Let's Walk è un'app che ti aiuta a pianificare percorsi a piedi personalizzati. 
              Calcola distanze, tempi, dislivelli e ti guida passo-passo verso la tua destinazione.
            </p>
          </section>

          {/* Come funziona */}
          <section className="info-section">
            <h3 className="info-section-title">🗺️ Come funziona</h3>
            <div className="space-y-3">
              <div className="info-step">
                <div className="info-step-icon">
                  <FaMapMarkedAlt />
                </div>
                <div>
                  <h4 className="info-step-title">1. Inserisci i punti</h4>
                  <p className="info-step-description">
                    Cerca il punto di partenza e quello di arrivo usando la barra di ricerca
                  </p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-icon">
                  <FaRoute />
                </div>
                <div>
                  <h4 className="info-step-title">2. Calcola il percorso</h4>
                  <p className="info-step-description">
                    L'app calcolerà il miglior percorso a piedi con tutte le informazioni utili
                  </p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-icon">
                  <FaBookmark />
                </div>
                <div>
                  <h4 className="info-step-title">3. Salva i preferiti</h4>
                  <p className="info-step-description">
                    Registrati per salvare i tuoi percorsi preferiti e riutilizzarli in futuro
                  </p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-icon">
                  <FaLocationArrow />
                </div>
                <div>
                  <h4 className="info-step-title">4. Naviga in tempo reale</h4>
                  <p className="info-step-description">
                    Attiva la navigazione GPS per ricevere indicazioni passo-passo durante il percorso
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tracking GPS */}
          <section className="info-section">
            <h3 className="info-section-title">📍 Tracking GPS in tempo reale</h3>
            <div className="space-y-2 text-gray-600">
              <p>
                Avvia il tracking per registrare il percorso effettivo. Puoi mettere in pausa e riprendere in qualsiasi momento.
              </p>
              <p>
                Durante il tracking vedrai: distanza, tempo, velocità media, dislivello e precisione del GPS.
              </p>
            </div>
          </section>

          {/* Esporta */}
          <section className="info-section">
            <h3 className="info-section-title">📤 Esporta</h3>
            <div className="space-y-2 text-gray-600">
              <p>
                Puoi esportare i percorsi completati in formato <strong>GPX</strong> oppure come <strong>immagine</strong> con la mappa di sfondo.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section className="info-section">
            <h3 className="info-section-title">🔐 Privacy</h3>
            <div className="space-y-2 text-gray-600">
              <p>
                I dati di posizione sono utilizzati solo per registrare i tuoi percorsi. Puoi interrompere il tracking in qualsiasi momento.
              </p>
            </div>
          </section>

          {/* Suggerimenti GPS/Batteria */}
          <section className="info-section">
            <h3 className="info-section-title">⚡ Suggerimenti GPS e batteria</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Consenti l'accesso alla posizione e attendi una buona precisione (idealmente &lt; 50 m).</li>
              <li>All'aperto il segnale è più stabile.</li>
              <li>Le modalità risparmio energetico possono rallentare gli aggiornamenti GPS.</li>
            </ul>
          </section>

          {/* Credits */}
          <section className="info-section border-t pt-6">
            <h3 className="info-section-title">🙏 Credits</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Questa app è stata realizzata utilizzando:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <a 
                    href="https://openrouteservice.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-link font-medium"
                  >
                    OpenRouteService
                  </a>
                  {' '}per il calcolo dei percorsi
                </li>
                <li>
                  <a 
                    href="https://www.openstreetmap.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-link font-medium"
                  >
                    OpenStreetMap
                  </a>
                  {' '}per le mappe
                </li>
                <li>
                  <a 
                    href="https://leafletjs.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-link font-medium"
                  >
                    Leaflet
                  </a>
                  {' '}per la visualizzazione interattiva
                </li>
                <li>
                  <a 
                    href="https://appwrite.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-link font-medium"
                  >
                    Appwrite
                  </a>
                  {' '}per l'autenticazione e il database
                </li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Realizzato con ❤️ per gli amanti delle passeggiate
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfoModal