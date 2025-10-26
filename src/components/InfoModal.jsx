import React from 'react'
import { FaHiking, FaTimes, FaMapMarkedAlt, FaRoute, FaBookmark, FaLocationArrow } from 'react-icons/fa'

//Modale informativa sull'app
const InfoModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6 text-white sticky top-0">
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
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Chiudi"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cos'è */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-2">👋 Benvenuto!</h3>
            <p className="text-gray-600 leading-relaxed">
              Let's Walk è un'app che ti aiuta a pianificare percorsi a piedi personalizzati. 
              Calcola distanze, tempi, dislivelli e ti guida passo-passo verso la tua destinazione.
            </p>
          </section>

          {/* Come funziona */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3">🗺️ Come funziona</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <FaMapMarkedAlt />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">1. Inserisci i punti</h4>
                  <p className="text-sm text-gray-600">Cerca il punto di partenza e quello di arrivo usando la barra di ricerca</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <FaRoute />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">2. Calcola il percorso</h4>
                  <p className="text-sm text-gray-600">L'app calcolerà il miglior percorso a piedi con tutte le informazioni utili</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <FaBookmark />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">3. Salva i preferiti</h4>
                  <p className="text-sm text-gray-600">Registrati per salvare i tuoi percorsi preferiti e riutilizzarli in futuro</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <FaLocationArrow />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">4. Naviga in tempo reale</h4>
                  <p className="text-sm text-gray-600">Attiva la navigazione GPS per ricevere indicazioni passo-passo durante il percorso</p>
                </div>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">🙏 Credits</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Questa app è stata realizzata utilizzando:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <a 
                    href="https://openrouteservice.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
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
                    className="text-blue-600 hover:underline font-medium"
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
                    className="text-blue-600 hover:underline font-medium"
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
                    className="text-blue-600 hover:underline font-medium"
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