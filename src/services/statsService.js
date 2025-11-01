/**
 * Service per calcolare statistiche dai percorsi salvati
 */

class StatsService {
  /**
   * Calcola tutte le statistiche dai percorsi dell'utente
   * @param {Array} routes - Array di percorsi salvati
   * @returns {Object} Oggetto con tutte le statistiche
   */
  calculateStats(routes) {
    if (!routes || routes.length === 0) {
      return {
        totalRoutes: 0,
        totalKm: 0,
        totalTime: 0,
        totalAscent: 0,
        monthlyKm: []
      }
    }

    // Filtra solo i percorsi con dati reali (actualDistance non NULL)
    const validRoutes = routes.filter(route => 
      route.actualDistance != null && route.actualDistance > 0
    )

     // Calcola totali 
    const totalRoutes = validRoutes.length
    const totalKm = validRoutes.reduce((sum, route) => sum + (route.actualDistance || 0), 0)
    const totalTime = validRoutes.reduce((sum, route) => sum + (route.actualDuration || 0), 0)
    const totalAscent = validRoutes.reduce((sum, route) => sum + (route.actualAscent || 0), 0)

    // Calcola km per mese
    const monthlyKm = this.calculateMonthlyKm(validRoutes)

    return {
      totalRoutes,
      totalKm: parseFloat(totalKm.toFixed(2)),
      totalTime: Math.round(totalTime),
      totalAscent: Math.round(totalAscent),
      monthlyKm
    }
  }

  /**
   * Calcola i km percorsi per mese negli ultimi 6 mesi
   * @param {Array} routes - Array di percorsi salvati
   * @returns {Array} Array di oggetti {month: string, km: number}
   */
  calculateMonthlyKm(routes) {
    // Crea array degli ultimi 6 mesi
    const months = []
    const today = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({
        date: date,
        month: date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        km: 0
      })
    }

    // Aggrega km per mese usando la data di completamento
    routes.forEach(route => {
      // Usa completedAt invece di createdAt per i percorsi completati
      const dateField = route.completedAt || route.createdAt
      if (!dateField) return
      
      const routeDate = new Date(dateField)
      const routeMonth = new Date(routeDate.getFullYear(), routeDate.getMonth(), 1)
      
      months.forEach(monthData => {
        if (monthData.date.getTime() === routeMonth.getTime()) {
          // Usa actualDistance invece di distance
          monthData.km += route.actualDistance || 0
        }
      })
    })

    // Arrotonda i km
    return months.map(m => ({
      month: m.month,
      km: parseFloat(m.km.toFixed(1))
    }))
  }

  /**
   * Formatta i minuti in formato leggibile 
   * @param {number} minutes - Minuti totali
   * @returns {string} Stringa formattata
   */
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

  /**
   * Formatta i km in formato leggibile
   * @param {number} km - Chilometri
   * @returns {string} Stringa formattata
   */
  formatKm(km) {
    if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}k km`
    }
    return `${km.toFixed(1)} km`
  }

  /**
   * Formatta i metri in formato leggibile
   * @param {number} meters - Metri
   * @returns {string} Stringa formattata
   */
  formatMeters(meters) {
    if (meters >= 10000) {
      return `${(meters / 1000).toFixed(1)}k m`
    }
    return `${meters.toLocaleString('it-IT')} m`
  }
}

export default new StatsService()