
import React from 'react'
import roadSigns from '../assets/road-signs.svg'
import Search from './Search'

const Navbar = () => {
  return (
    <div className='flex flex-1 items-center justify-center sm:items-stretch sm:justify-start'>
      <img src={roadSigns} alt="road signs" className="navbar-logo" />
       <a href="#" className="navbar-style">Dashboard</a>
       <a href="#" className="navbar-style">Team</a>
       <a href="#" className="navbar-style">Projects</a>
       <a href="#" className="navbar-style">Calendar</a>
       <Search />
    </div>

  )
}

export default Navbar