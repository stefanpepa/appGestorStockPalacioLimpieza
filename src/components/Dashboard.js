import React, { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import "../styles/main.css";

export default function Dashboard({ onNavigate, onLogout }) {
    const [clicks, setClicks] = useState(0);
    const TRIGGER = 7; // número de clics para activar el easter egg

    const sections = [
        { title: "Productos", icon: "pi pi-box", color: "#22C55E", view: "productos" },
        { title: "Ventas", icon: "pi pi-shopping-cart", color: "#16A34A", view: "ventas" },
        { title: "Facturar", icon: "pi pi-file", color: "#15803D", view: "facturar" },
        { title: "Cotizar", icon: "pi pi-dollar", color: "#10B981", view: "cotizar" },
    ];

    const spawnBubbles = (n = 60) => {
        const w = window.innerWidth;
        for (let i = 0; i < n; i++) {
            const b = document.createElement("div");
            const size = 6 + Math.random() * 26;
            const left = Math.random() * w;
            const dur = 3000 + Math.random() * 2500;
            b.className = "bubble-anim";
            b.style.width = size + "px";
            b.style.height = size + "px";
            b.style.left = left + "px";
            b.style.setProperty("--scale", 1 + Math.random() * 0.8);
            b.style.setProperty("--dur", dur + "ms");
            document.body.appendChild(b);
            setTimeout(() => b.remove(), dur + 200);
        }
    };

    const handleBubbleClick = () => {
        const newCount = clicks + 1;
        setClicks(newCount);
        if (newCount >= TRIGGER) {
            setClicks(0);
            spawnBubbles(120);
        }
    };

    return (
        <main className="dashboard-container">
            <div className="dashboard-header">

                <Button
                    label="Cerrar sesión"
                    icon="pi pi-sign-out"
                    className="p-button-danger p-button-sm"
                    onClick={onLogout}
                />

                <h1 className="dashboard-title">Gestión del Palacio de la Limpieza</h1>
                <div id="bubbleEgg" title="🫧" onClick={handleBubbleClick}></div>
            </div>

            <div className="dashboard-grid">
                {sections.map((s, i) => (
                    <Card
                        key={s.title}
                        className="dashboard-card fade-in"
                        title={s.title}
                        style={{
                            borderTop: `6px solid ${s.color}`,
                            cursor: "pointer",
                            animationDelay: `${i * 0.1}s`,
                        }}
                        onClick={() => onNavigate(s.view)}
                    >
                        <div className="dashboard-content">
                            <i
                                className={`pi ${s.icon}`}
                                style={{ fontSize: "3rem", color: s.color }}
                            ></i>
                            <Button
                                label={`Ir a ${s.title}`}
                                className="p-button-sm p-button-outlined"
                                style={{ borderColor: s.color, color: s.color }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate(s.view);
                                }}
                            />
                        </div>
                    </Card>
                ))}
            </div>

            <footer className="footer">
                <p>© 2025 El Palacio de la Limpieza — Sistema de Gestión de Stock y Ventas</p>
                <p className="muted">Desarrollado por Fausto Zaccanti</p>
            </footer>
        </main>
    );
}
