import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Toast } from "primereact/toast";

export default function Productos({ onBack }) {
  const [productos, setProductos] = useState([]);
  const [nuevo, setNuevo] = useState({
    codigo_interno: "",
    objeto: "",
    descripcion: "",
    cantidad: null,
    precio: null,
  });
  const toast = useRef(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from("productos").select("*");
    if (error) console.error("Error al cargar productos:", error);
    else setProductos(data || []);
  };

  const agregarProducto = async () => {
    if (!nuevo.codigo_interno || !nuevo.objeto)
      return toast.current.show({
        severity: "warn",
        summary: "Atención",
        detail: "Completá código y objeto",
      });

    const { error } = await supabase.from("productos").insert([nuevo]);
    if (error) {
      console.error(error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo agregar el producto",
      });
    } else {
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Producto agregado",
      });
      setNuevo({
        codigo_interno: "",
        objeto: "",
        descripcion: "",
        cantidad: 0,
        precio: 0,
      });
      cargarProductos();
    }
  };

  return (
    <main className="container">
      <Toast ref={toast} />

      {/* === Botón Volver === */}
      {onBack && (
        <Button
          label="← Volver al menú"
          icon="pi pi-arrow-left"
          className="p-button-sm p-button-secondary"
          onClick={onBack}
          style={{ marginBottom: "1rem" }}
        />
      )}

      <h1>Gestor de Productos</h1>

      {/* === Formulario de nuevo producto === */}
      <Card title="Agregar producto">
        <div className="p-fluid grid formgrid">
          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Código"
              value={nuevo.codigo_interno}
              onChange={(e) =>
                setNuevo({ ...nuevo, codigo_interno: e.target.value })
              }
            />
          </div>
          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Objeto"
              value={nuevo.objeto}
              onChange={(e) => setNuevo({ ...nuevo, objeto: e.target.value })}
            />
          </div>
          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Descripción"
              value={nuevo.descripcion}
              onChange={(e) =>
                setNuevo({ ...nuevo, descripcion: e.target.value })
              }
            />
          </div>
          <div className="field col-12 md:col-1">
            <InputNumber
              placeholder="Cantidad"
              value={nuevo.cantidad}
              onValueChange={(e) =>
                setNuevo({ ...nuevo, cantidad: e.value || null })
              }
            />
          </div>
          <div className="field col-12 md:col-2">
            <InputNumber
              placeholder="Precio"
              value={nuevo.precio}
              onValueChange={(e) =>
                setNuevo({ ...nuevo, precio: e.value || null })
              }
            />
          </div>
          <div className="field col-12 md:col-2">
            <Button label="Agregar" icon="pi pi-plus" onClick={agregarProducto} />
          </div>
        </div>
      </Card>

      {/* === Tabla de productos === */}
      <Card title="Listado de productos">
        <DataTable value={productos} paginator rows={5} stripedRows>
          <Column field="codigo_interno" header="Código" />
          <Column field="objeto" header="Objeto" />
          <Column field="descripcion" header="Descripción" />
          <Column field="cantidad" header="Stock" />
          <Column field="precio" header="Precio" body={(p) => `$${p.precio}`} />
        </DataTable>
      </Card>
    </main>
  );
}
