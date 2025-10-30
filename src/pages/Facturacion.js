import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/main.css";

export default function Facturacion({ onBack }) {
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState({ producto_id: null, cantidad: 1 });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  // 🔹 Cargar productos de Supabase
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
    setItems([
      ...items,
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

  // 🧾 Generar PDF y registrar venta real en Supabase
  const generarFactura = async () => {
    if (items.length === 0) return alert("No hay productos en la factura.");

    try {
      // 📤 Registrar cada venta y descontar stock en Supabase
      for (const item of items) {
        // Insertar venta
        const { error: ventaError } = await supabase.from("ventas").insert([
          {
            producto_id: item.id,
            cantidad: item.cantidad,
            fecha: fecha,
          },
        ]);

        if (ventaError) throw ventaError;

        // Descontar stock usando RPC
        const { error: stockError } = await supabase.rpc("descontar_stock", {
          pid: item.id,
          cantidad_vendida: item.cantidad,
        });

        if (stockError) throw stockError;
      }

      // 🧠 Luego refrescamos el stock
      await cargarProductos();

      // 🖨️ Generamos el PDF
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Factura - El Palacio de la Limpieza", 14, 20);
      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date(fecha).toLocaleDateString("es-AR")}`, 14, 30);

      autoTable(doc, {
        startY: 40,
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

      alert("Factura generada y stock actualizado correctamente ✅");
      setItems([]); // Limpiar factura
    } catch (err) {
      console.error("⚠️ Error al generar la factura:", err);
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
