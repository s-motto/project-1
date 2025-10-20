import React, { useState } from 'react'
import Search from './components/Search'
import Navbar from './components/Navbar'

// Configurazione Geoapify API 
const API_BASE_URL= 'https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?&apiKey=e6a5c6d10e194527a8e8783bee41290e';

// Chiave API caricata dalle variabili d'ambiente
const API_KEY= import.meta.env.VITE_GEOAPIFY_API_KEY;

// Opzioni della richiesta API 
const API_OPTIONS= {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const App= () => {

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <main>
      
        <div>
          
          <header className='background-gradient  tracking-wide font-bold font-display'>
            <Navbar/>
        
            <h1 className='text-5xl text-center'>Let's Walk!</h1>
            <h2 className='text-3xl text-center'>Trova il tuo percorso di trekking ideale </h2>
          </header>
          
        </div>

      
    </main>
  )
}

export default App
