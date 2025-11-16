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

  const [tipoFactura, setTipoFactura] = useState("B");
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");

  const [descuento, setDescuento] = useState(0);
  const [descuentoAplicado, setDescuentoAplicado] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from("productos").select("*");
    if (!error) setProductos(data);
  };

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

  const aplicarDescuento = () => {
    const porc = Math.min(Math.max(descuento || 0, 0), 100);
    setDescuentoAplicado(porc);
    setTotalConDescuento(
      porc === 0 ? null : totalFactura * (1 - porc / 100)
    );
  };

  const porcentajeEf = descuentoAplicado || 0;
  const totalFinal =
    porcentajeEf > 0 && totalConDescuento != null
      ? totalConDescuento
      : totalFactura;

  const facturarEnAfip = async () => {
    const res = await fetch("http://localhost:3001/api/facturar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        fecha,
        total: totalFinal,
        tipoFactura,
        // 🔥 SI ES FACTURA A → cliente inscripto (obligatorio)
        tipoCliente: tipoFactura === "A" ? "inscripto" : "consumidor_final",
        razonSocial,
        descuento: porcentajeEf,
        cuitCliente: cuit, // 🔥 le mandás CUIT al backend
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
      throw new Error(data?.error || "Error al facturar");
    }

    return data;
  };


  const generarFactura = async () => {
    if (items.length === 0) return alert("No hay productos en la factura.");

    if (tipoFactura === "A") {
      if (!razonSocial.trim()) return alert("Debe ingresar razón social.");
      if (!cuit.trim()) return alert("Debe ingresar CUIT.");
    }

    try {
      // registro ventas + stock
      for (const item of items) {
        await supabase.from("ventas").insert([
          { producto_id: item.id, cantidad: item.cantidad, fecha },
        ]);

        await supabase.rpc("descontar_stock", {
          pid: item.id,
          cantidad_vendida: item.cantidad,
        });
      }

      await cargarProductos();

      // AFIP
      const {
        cae,
        vencimientoCae,
        nroComprobante,
        ptoVta,
        tipoFactura: tipoDevuelto,
      } = await facturarEnAfip();

      // PDF
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(
        `Factura ${tipoDevuelto || tipoFactura} - El Palacio de la Limpieza`,
        14,
        20
      );

      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date(fecha).toLocaleDateString("es-AR")}`, 14, 30);

      if (tipoFactura === "A") {
        doc.text(`Razón social: ${razonSocial}`, 14, 38);
        doc.text(`CUIT: ${cuit}`, 14, 46);
      }

      doc.text(`Pto Vta: ${ptoVta}  Comp: ${nroComprobante}`, 14, 54);
      doc.text(`CAE: ${cae}`, 14, 62);
      doc.text(`Vto CAE: ${vencimientoCae}`, 14, 70);

      autoTable(doc, {
        startY: 80,
        head: [["Producto", "Cantidad", "Precio", "Total"]],
        body: items.map((it) => [
          it.descripcion,
          it.cantidad,
          `$${it.precio}`,
          `$${it.total}`,
        ]),
      });

      let y = doc.lastAutoTable.finalY + 10;
      doc.text(`SUBTOTAL: $${totalFactura.toFixed(2)}`, 14, y);

      if (porcentajeEf > 0) {
        doc.text(
          `DESCUENTO (${porcentajeEf}%): -$${(
            totalFactura - totalFinal
          ).toFixed(2)}`,
          14,
          (y += 8)
        );
      }

      doc.text(`TOTAL FINAL: $${totalFinal.toFixed(2)}`, 14, (y += 10));

      doc.save(`factura_${Date.now()}.pdf`);

      alert("Factura generada correctamente");
      setItems([]);
      setDescuento(0);
      setDescuentoAplicado(0);
      setTotalConDescuento(null);
      setRazonSocial("");
      setCuit("");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const opcionesFactura = [
    { label: "Factura B", value: "B" },
    { label: "Factura A", value: "A" },
  ];

  return (
    <main className="container">
      {onBack && (
        <Button
          label="← Volver"
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
          Subtotal: ${totalFactura.toFixed(2)}
          {porcentajeEf > 0 && totalFinal !== totalFactura && (
            <div style={{ marginTop: 6, color: "#14532d" }}>
              Total con descuento ({porcentajeEf}%):{" "}
              <b>${totalFinal.toFixed(2)}</b>
            </div>
          )}
        </h3>

        {/* Inputs izquierda + botones derecha */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {/* IZQUIERDA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <Dropdown
              value={tipoFactura}
              options={opcionesFactura}
              onChange={(e) => setTipoFactura(e.value)}
              style={{ minWidth: "150px" }}
            />

            <InputNumber
              value={descuento}
              onValueChange={(e) => setDescuento(e.value || 0)}
              mode="decimal"
              min={0}
              max={100}
              suffix="%"
              style={{ width: "120px" }}
            />

            {tipoFactura === "A" && (
              <>
                <InputText
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Razón social"
                  style={{
                    minWidth: "260px",
                    marginLeft: "85px",
                  }}
                />

                <InputText
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="CUIT"
                  style={{ width: "170px" }}
                />
              </>
            )}
          </div>

          {/* DERECHA */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button
              label="Aplicar descuento"
              icon="pi pi-percentage"
              onClick={aplicarDescuento}
            />

            <Button
              label="Generar Factura"
              icon="pi pi-file-pdf"
              className="p-button-success"
              onClick={generarFactura}
            />
          </div>
        </div>
      </Card>
    </main>
  );
}
