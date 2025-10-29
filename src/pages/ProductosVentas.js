import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import "../styles/main.css"; // ✅ importante que sea ../ ahora

const API_URL = "http://localhost:3001";

export default function ProductosVentas({ onBack }) {
    const [productos, setProductos] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [nuevo, setNuevo] = useState({
        codigo_interno: "",
        objeto: "",
        descripcion: "",
        cantidad: "",
        precio: "",
    });
    const [venta, setVenta] = useState({
        producto_id: "",
        cantidad: "",
        fecha: new Date().toISOString().slice(0, 10),
    });

    const toast = useRef(null);

    useEffect(() => {
        cargarProductos();
        cargarVentas();
    }, []);

    const cargarProductos = async () => {
        const res = await axios.get(`${API_URL}/productos`);
        setProductos(res.data);
    };

    const cargarVentas = async () => {
        const res = await axios.get(`${API_URL}/ventas`);
        setVentas(res.data);
    };

    const agregarProducto = async () => {
        if (!nuevo.codigo_interno || !nuevo.objeto)
            return toast.current.show({ severity: "warn", summary: "Atención", detail: "Completá código y objeto" });

        await axios.post(`${API_URL}/productos`, nuevo);
        toast.current.show({ severity: "success", summary: "Éxito", detail: "Producto agregado" });

        setNuevo({ codigo_interno: "", objeto: "", descripcion: "", cantidad: "", precio: "" });
        cargarProductos();
    };

    const registrarVenta = async () => {
        if (!venta.producto_id || !venta.cantidad)
            return toast.current.show({ severity: "warn", summary: "Atención", detail: "Completá todos los campos" });

        const res = await axios.post(`${API_URL}/ventas`, venta);
        if (res.data.error)
            toast.current.show({ severity: "error", summary: "Error", detail: res.data.error });
        else
            toast.current.show({ severity: "success", summary: "Venta registrada", detail: "Stock actualizado" });

        setVenta({ producto_id: "", cantidad: "", fecha: new Date().toISOString().slice(0, 10) });
        cargarProductos();
        cargarVentas();
    };



    return (



        <main className="container">
            <Toast ref={toast} />

            {onBack && (
                <Button
                    label="← Volver al menú"
                    icon="pi pi-arrow-left"
                    className="p-button-sm p-button-secondary"
                    onClick={onBack}
                    style={{ marginBottom: "1rem" }}
                />
            )}


            <h1>Gestor de Stock y Ventas</h1>

            {/* === Productos === */}
            <Card title="Productos">
                <div className="p-fluid grid formgrid">
                    <div className="field col-12 md:col-3">
                        <InputText placeholder="Código" value={nuevo.codigo_interno}
                            onChange={(e) => setNuevo({ ...nuevo, codigo_interno: e.target.value })} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <InputText placeholder="Objeto" value={nuevo.objeto}
                            onChange={(e) => setNuevo({ ...nuevo, objeto: e.target.value })} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <InputText placeholder="Descripción" value={nuevo.descripcion}
                            onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
                    </div>
                    <div className="field col-12 md:col-2">
                        <InputNumber placeholder="Cantidad" value={nuevo.cantidad}
                            onValueChange={(e) => setNuevo({ ...nuevo, cantidad: e.value })} />
                    </div>
                    <div className="field col-12 md:col-2">
                        <InputNumber placeholder="Precio" value={nuevo.precio}
                            onValueChange={(e) => setNuevo({ ...nuevo, precio: e.value })} />
                    </div>
                    <div className="field col-12 md:col-2">
                        <Button label="Agregar" icon="pi pi-plus" onClick={agregarProducto} />
                    </div>
                </div>

                <DataTable value={productos} paginator rows={5} stripedRows responsiveLayout="scroll">
                    <Column field="codigo_interno" header="Código" />
                    <Column field="objeto" header="Objeto" />
                    <Column field="descripcion" header="Descripción" />
                    <Column field="cantidad" header="Cantidad" />
                    <Column field="precio" header="Precio" body={(p) => `$${p.precio}`} />
                </DataTable>
            </Card>

            {/* === Ventas === */}
            <Card title="Registrar venta">
                <div className="p-fluid grid formgrid">
                    <div className="field col-12 md:col-4">
                        <Dropdown
                            value={venta.producto_id}
                            options={productos.map((p) => ({
                                label: `${p.codigo_interno} — ${p.objeto} (stock: ${p.cantidad})`,
                                value: p.id,
                            }))}
                            onChange={(e) => setVenta({ ...venta, producto_id: e.value })}
                            placeholder="Seleccionar producto"
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <InputNumber placeholder="Cantidad" value={venta.cantidad}
                            onValueChange={(e) => setVenta({ ...venta, cantidad: e.value })} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <InputText type="date" value={venta.fecha}
                            onChange={(e) => setVenta({ ...venta, fecha: e.target.value })} />
                    </div>
                    <div className="field col-12 md:col-2">
                        <Button label="Vender" icon="pi pi-shopping-cart" onClick={registrarVenta} />
                    </div>
                </div>

                <DataTable value={ventas} paginator rows={5} stripedRows responsiveLayout="scroll">
                    <Column field="fecha" header="Fecha" />
                    <Column field="codigo_interno" header="Código" />
                    <Column field="objeto" header="Objeto" />
                    <Column field="cantidad" header="Cant." />
                    <Column field="total" header="Total" body={(v) => `$${v.total}`} />
                </DataTable>
            </Card>
        </main>
    );
}
