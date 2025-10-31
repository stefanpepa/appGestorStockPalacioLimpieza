import React, { useState } from "react"
import Dashboard from "./components/Dashboard"
import Productos from "./pages/Productos"
import Ventas from "./pages/Ventas"
import Facturacion from "./pages/Facturacion"
import Cotizacion from "./pages/Cotizacion"
import Login from "./pages/login"

function App() {
  const [view, setView] = useState("login")

  const handleNavigate = (nextView) => setView(nextView)
  const handleLogin = () => setView("dashboard")
  const handleLogout = () => setView("login")

  return (
    <>
      {view === "login" && <Login onLogin={handleLogin} />}
      {view === "dashboard" && (
        <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {view === "productos" && (
        <Productos onBack={() => setView("dashboard")} />
      )}
      {view === "ventas" && (
        <Ventas onBack={() => setView("dashboard")} />
      )}
      {view === "facturar" && (
        <Facturacion onBack={() => setView("dashboard")} />
      )}
      {view === "cotizar" && (
        <Cotizacion onBack={() => setView("dashboard")} />
      )}
    </>
  )
}

export default App
