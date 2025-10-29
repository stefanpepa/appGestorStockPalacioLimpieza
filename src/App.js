import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./pages/login";
import "./styles/main.css";

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const guardado = localStorage.getItem("usuario_logueado");
    if (guardado) setUsuario(guardado);
  }, []);

  const handleLogin = (user) => setUsuario(user);
  const handleLogout = () => {
    localStorage.removeItem("usuario_logueado");
    setUsuario(null);
  };

  return usuario ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default App;
