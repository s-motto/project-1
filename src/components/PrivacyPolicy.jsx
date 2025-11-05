import React from 'react'
import { FaTimes } from 'react-icons/fa'

const PrivacyPolicy = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        <div className="modal-header-primary sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Privacy Policy</h2>
            <button onClick={onClose} className="modal-close-btn" aria-label="Chiudi">
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <div className="modal-body space-y-6 text-gray-700 text-sm">
          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Dati che raccogliamo</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Account: dati dell'account necessari all'autenticazione.</li>
              <li>Percorsi: punti GPS, tempo, distanza, dislivello registrati durante il tracking.</li>
              <li>Metadati tecnici: errori e log minimi per il funzionamento dell'app.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Come usiamo i dati</h3>
            <p>
              I dati sono utilizzati per fornire le funzionalità dell'app: tracking GPS in tempo reale, statistiche,
              salvataggio percorsi e funzioni di esportazione (GPX/immagine).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Dove conserviamo i dati</h3>
            <p>
              I dati dell'utente sono archiviati su Appwrite (autenticazione e database). Le mappe provengono da
              OpenStreetMap; il routing è fornito da OpenRouteService. Quando esporti immagini o GPX, i file sono
              generati localmente sul tuo dispositivo.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Condivisione con terze parti</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>OpenStreetMap: dati cartografici.</li>
              <li>OpenRouteService: calcolo percorsi.</li>
              <li>Altri servizi saranno indicati con relativa attribuzione ove presenti.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Conservazione e controllo</h3>
            <p>
              Conserviamo i dati finché mantieni l'account o i percorsi salvati. Puoi eliminare i percorsi o chiedere
              la cancellazione dell'account per rimuovere i dati associati.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Consenso e permessi</h3>
            <p>
              L'accesso alla posizione viene richiesto quando avvii il tracking e puoi revocarlo o interrompere la
              registrazione in qualsiasi momento. L'accuratezza della traccia dipende dalla qualità del segnale GPS.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Sicurezza</h3>
            <p>
              Adottiamo misure ragionevoli per proteggere i dati (autenticazione, controllo accessi). Tuttavia nessun
              sistema è completamente sicuro: usa l'app con buon senso e non condividere dati sensibili.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Contatti</h3>
            <p>
              Per richieste sulla privacy o per esercitare i tuoi diritti, contattaci all'indirizzo indicato nella
              documentazione del progetto.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
