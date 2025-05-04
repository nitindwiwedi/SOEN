import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from '../Screens/Login'
import Register from '../Screens/Register'
import Home from '../Screens/Home'
import Project from '../Screens/Project'
import UserAuth from '../authentication/UserAuth'

const AppRoutes = () => {
  return (
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<UserAuth><Home/></UserAuth>}/>
            <Route path='/register' element={<Register/>}/>
            <Route path='/login' element={<Login/>}/>
            <Route path='/project' element={<Project/>}/>
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
