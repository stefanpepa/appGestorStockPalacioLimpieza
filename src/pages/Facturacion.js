import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/main.css";

export default function Facturacion({ onBack }) {
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState({ producto_id: null, cantidad: 1 });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  // 🔹 Tipo de factura y razón social (para Factura A)
  const [tipoFactura, setTipoFactura] = useState("B"); // "A" o "B"
  const [razonSocial, setRazonSocial] = useState("");

  // 🔹 Cargar productos desde Supabase
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from("productos").select("*");
    if (error) console.error("Error al cargar productos:", error);
    else setProductos(data);
  };

  // ➕ Agregar producto a la factura (sin afectar stock todavía)
  const agregarItem = () => {
    if (!nuevo.producto_id) return alert("Seleccioná un producto");

    const producto = productos.find((p) => p.id === nuevo.producto_id);
    if (!producto) return alert("Producto no encontrado");

    const total = (nuevo.cantidad || 1) * producto.precio;
    setItems((prev) => [
      ...prev,
      {
        id: producto.id,
        descripcion: producto.objeto,
        cantidad: nuevo.cantidad,
        precio: producto.precio,
        total,
      },
    ]);

    setNuevo({ producto_id: null, cantidad: 1 });
  };

  const totalFactura = items.reduce((sum, it) => sum + it.total, 0);

  // 🔹 Llamar al backend Node que factura en AFIP
  const facturarEnAfip = async () => {
    const res = await fetch("http://localhost:3001/api/facturar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        fecha,
        total: totalFactura,
        tipoFactura,              // "A" o "B"
        tipoCliente: "consumidor_final",
        razonSocial,              // la usamos si es A
      }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      console.error("No se pudo parsear JSON del backend:", e);
    }

    if (!res.ok) {
      console.error("Error AFIP (frontend):", data);
      throw new Error(data?.error || "Error al facturar en AFIP");
    }

    return data; // { cae, vencimientoCae, nroComprobante, ptoVta, tipoFactura }
  };

  // 🧾 Generar factura: guarda ventas + stock + genera PDF con datos AFIP
  const generarFactura = async () => {
    if (items.length === 0) return alert("No hay productos en la factura.");

    if (tipoFactura === "A" && !razonSocial.trim()) {
      return alert("Para Factura A tenés que cargar la razón social.");
    }

    try {
      // 1️⃣ Registrar ventas y descontar stock en Supabase
      for (const item of items) {
        const { error: ventaError } = await supabase.from("ventas").insert([
          {
            producto_id: item.id,
            cantidad: item.cantidad,
            fecha: fecha,
          },
        ]);

        if (ventaError) throw ventaError;

        const { error: stockError } = await supabase.rpc("descontar_stock", {
          pid: item.id,
          cantidad_vendida: item.cantidad,
        });

        if (stockError) throw stockError;
      }

      await cargarProductos();

      // 2️⃣ Facturar en AFIP (backend)
      const { cae, vencimientoCae, nroComprobante, ptoVta, tipoFactura: tipoDevuelto } =
        await facturarEnAfip();

      // 3️⃣ Generar PDF con datos AFIP
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(
        `Factura ${tipoDevuelto || tipoFactura} - El Palacio de la Limpieza`,
        14,
        20
      );

      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date(fecha).toLocaleDateString("es-AR")}`, 14, 30);
      if (tipoFactura === "A" && razonSocial.trim()) {
        doc.text(`Razón social: ${razonSocial}`, 14, 38);
      }
      doc.text(`Pto Vta: ${ptoVta}  Comp. N°: ${nroComprobante}`, 14, 46);
      doc.text(`CAE: ${cae}`, 14, 54);
      doc.text(`Vto CAE: ${vencimientoCae}`, 14, 62);

      autoTable(doc, {
        startY: 70,
        head: [["Producto", "Cantidad", "Precio", "Total"]],
        body: items.map((it) => [
          it.descripcion,
          it.cantidad,
          `$${it.precio}`,
          `$${it.total}`,
        ]),
      });

      doc.text(
        `TOTAL FINAL: $${totalFactura.toFixed(2)}`,
        14,
        doc.lastAutoTable.finalY + 10
      );

      doc.save(`factura_${Date.now()}.pdf`);

      alert("Factura generada, stock actualizado y AFIP ✅");
      setItems([]);
      if (tipoFactura === "A") setRazonSocial("");
    } catch (err) {
      console.error("⚠️ Error al generar la factura:", err);
      alert(
        "⚠️ " +
          (err.message || "Error al registrar la venta o facturar en AFIP.")
      );
    }
  };

  // 🔹 Opciones del dropdown de Factura
  const opcionesFactura = [
    { label: "Factura B", value: "B" },
    { label: "Factura A", value: "A" },
  ];

  return (
    <main className="container">
      {onBack && (
        <Button
          label="← Volver al menú"
          icon="pi pi-arrow-left"
          className="p-button-sm p-button-secondary"
          onClick={onBack}
          style={{ marginBottom: "1rem" }}
        />
      )}

      <Card title="Facturación">
        <div className="p-fluid grid formgrid">
          <div className="field col-12 md:col-5">
            <Dropdown
              value={nuevo.producto_id}
              options={productos.map((p) => ({
                label: `${p.codigo_interno} — ${p.objeto} (stock: ${p.cantidad})`,
                value: p.id,
              }))}
              onChange={(e) => setNuevo({ ...nuevo, producto_id: e.value })}
              placeholder="Seleccionar producto"
            />
          </div>

          <div className="field col-12 md:col-2">
            <InputNumber
              placeholder="Cantidad"
              value={nuevo.cantidad}
              onValueChange={(e) =>
                setNuevo({ ...nuevo, cantidad: e.value || 1 })
              }
            />
          </div>

          <div className="field col-12 md:col-3">
            <InputNumber
              value={totalFactura}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              disabled
              placeholder="Total"
            />
          </div>

          <div className="field col-12 md:col-2">
            <Button label="Agregar" icon="pi pi-plus" onClick={agregarItem} />
          </div>
        </div>

        <DataTable value={items} stripedRows>
          <Column field="descripcion" header="Producto" />
          <Column field="cantidad" header="Cantidad" />
          <Column field="precio" header="Precio" body={(r) => `$${r.precio}`} />
          <Column field="total" header="Total" body={(r) => `$${r.total}`} />
        </DataTable>

        <h3 style={{ textAlign: "right", marginTop: "1rem" }}>
          Total final: ${totalFactura.toFixed(2)}
        </h3>

        {/* 🔹 Fila inferior: tipo de factura + razón social + botón */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Dropdown
            value={tipoFactura}
            options={opcionesFactura}
            onChange={(e) => setTipoFactura(e.value)}
            placeholder="Tipo de factura"
            style={{ minWidth: "150px" }}
          />

          {tipoFactura === "A" && (
            <InputText
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Razón social (Factura A)"
              style={{ minWidth: "260px", flex: "1" }}
            />
          )}

          <Button
            label="Generar Factura (PDF + AFIP)"
            icon="pi pi-file-pdf"
            className="p-button-success"
            onClick={generarFactura}
          />
        </div>
      </Card>
    </main>
  );
}
