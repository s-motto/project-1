import { useState, useEffect } from 'react'

 

/**

 * Custom hook per debounce di valori

 * Ritarda l'aggiornamento del valore fino a quando l'utente smette di digitare

 *

 * @param {any} value - Il valore da debounciare

 * @param {number} delay - Ritardo in millisecondi (default 300ms)

 * @returns {any} Il valore debounciato

 *

 * @example

 * const [searchText, setSearchText] = useState('')

 * const debouncedSearch = useDebounce(searchText, 500)

 *

 * useEffect(() => {

 *   // Questa chiamata API avviene solo 500ms dopo che l'utente smette di digitare

 *   if (debouncedSearch) {

 *     fetchResults(debouncedSearch)

 *   }

 * }, [debouncedSearch])

 */

export function useDebounce(value, delay = 300) {

  const [debouncedValue, setDebouncedValue] = useState(value)

 

  useEffect(() => {

    // Imposta un timer per aggiornare il valore debounciato dopo il delay

    const handler = setTimeout(() => {

      setDebouncedValue(value)

    }, delay)

 

    // Cleanup: cancella il timer se value cambia prima che il delay sia trascorso

    return () => {

      clearTimeout(handler)

    }

  }, [value, delay])

 

  return debouncedValue

}

 

export default useDebounce