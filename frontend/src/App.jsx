import React from 'react'
import AppRoutes from './Routes/AppRoutes'
import { UserProvider } from './context/user.context'
function App() {


  return (
    <>
    <UserProvider>
      <AppRoutes/>
    </UserProvider>
    </>
  )
}

export default App
