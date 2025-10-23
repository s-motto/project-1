import React from 'react'
import BottomNav from './components/BottomNav'
import RouteSearchForm from './components/RouteSearchForm'
import Footer from './components/Footer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic } from '@fortawesome/free-solid-svg-icons'
import { useEffect } from "react";
import { account } from "./appwrite";

// Note: The API configuration is now handled directly in the RouteSearchForm component



const App = () => {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
  {/* Top navbar removed for a cleaner app-like layout */}
  <header id="top" className="header-bg tracking-wide font-bold font-display flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[50vh] relative">
        <div className="header-content w-full flex flex-col items-center justify-center px-4 py-6">
          <h1 className="text-4xl sm:text-6xl text-center pt-4 sm:pt-8 text-white drop-shadow-lg font-captivating">Let's Walk!</h1>
          <h2 className="text-xl sm:text-4xl text-center pb-4 sm:pb-8 text-white drop-shadow font-captivating font-bold">UserNAme dove vai? <FontAwesomeIcon icon={faMusic} />Quanti chilometri farai?<FontAwesomeIcon icon={faMusic} />
          </h2>
        </div>
      </header>

      {/* Main content section with the route search form */}
      <section className="flex-1 flex flex-col items-center justify-start w-full px-2 sm:px-0 py-4 sm:py-8 pb-24">
        <div className="w-full max-w-md sm:max-w-xl">
          <RouteSearchForm />
        </div>
      </section>
  <Footer/>
      <BottomNav />
    </main>
    
  )
}

export default App
