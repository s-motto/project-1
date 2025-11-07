import React from 'react'
import { FaSearch } from 'react-icons/fa'

// Componente Search per la barra di ricerca
const Search = ({searchTerm,setSearchTerm}) => {
  return (
    <div className="rounded-md bg-amber-100 text-black box-border p-1 mx-2 flex items-center h-8">
      <FaSearch className="mx-2 text-sm" />
      <input 
        type="text" 
        placeholder='Search'
        className="bg-transparent outline-none text-sm w-32"
        value={searchTerm}


        //setta il valore di searchTerm quando l'input cambia
        onChange={(e) => setSearchTerm(e.target.value)} 
        
        />
    </div>
  )
}

export default Search