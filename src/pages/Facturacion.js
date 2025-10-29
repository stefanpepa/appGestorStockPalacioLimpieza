import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/main.css";

const API_URL = "http://localhost:3001";

export default function Facturacion({ onBack }) {
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState({ producto_id: null, cantidad: 1 });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const res = await axios.get(`${API_URL}/productos`);
    setProductos(res.data);
  };

  // ➕ Agregar producto a la factura (sin afectar stock todavía)
  const agregarItem = () => {
    if (!nuevo.producto_id) return alert("Seleccioná un producto");

    const producto = productos.find((p) => p.id === nuevo.producto_id);
    if (!producto) return alert("Producto no encontrado");

    const total = (nuevo.cantidad || 1) * producto.precio;
    setItems([
      ...items,
      { id: producto.id, descripcion: producto.objeto, cantidad: nuevo.cantidad, precio: producto.precio, total },
    ]);

    setNuevo({ producto_id: null, cantidad: 1 });
  };

  const totalFactura = items.reduce((sum, it) => sum + it.total, 0);

  // 🧾 Generar PDF y registrar venta real
  const generarFactura = async () => {
    if (items.length === 0) return alert("No hay productos en la factura.");

    try {
      // 📤 Registrar cada venta y descontar stock en el backend
      for (const item of items) {
        await axios.post(`${API_URL}/ventas`, {
          producto_id: item.id,
          cantidad: item.cantidad,
          fecha: fecha,
        });
      }

      // 🧠 Luego refrescamos el stock
      cargarProductos();

      // 🖨️ Generamos el PDF
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Factura - El Palacio de la Limpieza", 14, 20);
      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date(fecha).toLocaleDateString("es-AR")}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [["Producto", "Cantidad", "Precio", "Total"]],
        body: items.map((it) => [it.descripcion, it.cantidad, `$${it.precio}`, `$${it.total}`]),
      });

      doc.text(`TOTAL FINAL: $${totalFactura.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
      doc.save(`factura_${Date.now()}.pdf`);

      alert("Factura generada y stock actualizado correctamente ✅");
      setItems([]); // Limpiar factura
    } catch (err) {
      console.error(err);
      alert("⚠️ Error al registrar la venta o generar la factura.");
    }
  };

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
              onValueChange={(e) => setNuevo({ ...nuevo, cantidad: e.value })}
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

        <Button
          label="Generar Factura (PDF)"
          icon="pi pi-file-pdf"
          className="p-button-success"
          onClick={generarFactura}
        />
      </Card>
    </main>
  );
}
