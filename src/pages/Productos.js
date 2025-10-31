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
  // ----------------- STATE -----------------
  const [productos, setProductos] = useState([]);

  // form de "agregar producto nuevo"
  const [nuevo, setNuevo] = useState({
    codigo_interno: "",
    objeto: "",
    descripcion: "",
    cantidad: null,
    precio: null,
  });

  // estado edición
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState({
    id: null, // puede existir o no en la DB
    codigo_interno: "",
    objeto: "",
    descripcion: "",
    cantidad: 0,
    precio: 0,
  });

  // estado "dar de baja"
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const toast = useRef(null);

  // ----------------- EFFECT: CARGA INICIAL -----------------
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true); // solo activos

    if (error) {
      console.error("Error al cargar productos:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los productos",
      });
    } else {
      setProductos(data || []);
    }
  };

  // ----------------- VALIDACIONES COMUNES -----------------
  const validarCamposProducto = (data) => {
    // textos obligatorios
    if (
      !data.codigo_interno?.trim() ||
      !data.objeto?.trim() ||
      !data.descripcion?.trim()
    ) {
      toast.current.show({
        severity: "warn",
        summary: "Atención",
        detail: "No podés dejar campos vacíos",
      });
      return false;
    }

    // numéricos obligatorios y >= 0
    if (
      data.cantidad === null ||
      data.precio === null ||
      data.cantidad === "" ||
      data.precio === "" ||
      Number(data.cantidad) < 0 ||
      Number(data.precio) < 0
    ) {
      toast.current.show({
        severity: "warn",
        summary: "Atención",
        detail: "Cantidad y precio tienen que ser >= 0",
      });
      return false;
    }

    return true;
  };

  // ----------------- AGREGAR PRODUCTO -----------------
  const agregarProducto = async () => {
    if (!validarCamposProducto(nuevo)) return;

    const { error } = await supabase.from("productos").insert([
      {
        codigo_interno: nuevo.codigo_interno.trim(),
        objeto: nuevo.objeto.trim(),
        descripcion: nuevo.descripcion.trim(),
        cantidad: Number(nuevo.cantidad),
        precio: Number(nuevo.precio),
        activo: true,
      },
    ]);

    if (error) {
      console.error(error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo agregar el producto",
      });
      return;
    }

    toast.current.show({
      severity: "success",
      summary: "Éxito",
      detail: "Producto agregado",
    });

    // limpio el form
    setNuevo({
      codigo_interno: "",
      objeto: "",
      descripcion: "",
      cantidad: 0,
      precio: 0,
    });

    // recargo lista desde la DB
    cargarProductos();
  };

  // ----------------- EDITAR PRODUCTO -----------------
  const abrirEditar = (producto) => {
    setEditData({
      id: producto.id ?? null,
      codigo_interno: producto.codigo_interno,
      objeto: producto.objeto,
      descripcion: producto.descripcion,
      cantidad: producto.cantidad,
      precio: producto.precio,
    });

    setEditVisible(true);
  };

  const cancelarEdicion = () => {
    setEditVisible(false);
  };

  const guardarEdicion = async () => {
    if (!validarCamposProducto(editData)) return;

    const updateObj = {
      codigo_interno: editData.codigo_interno.trim(),
      objeto: editData.objeto.trim(),
      descripcion: editData.descripcion.trim(),
      cantidad: Number(editData.cantidad),
      precio: Number(editData.precio),
    };

    const tieneId = editData.id !== null && editData.id !== undefined;

    const query = supabase
      .from("productos")
      .update(updateObj)
      .match(
        tieneId
          ? { id: editData.id }
          : { codigo_interno: editData.codigo_interno }
      );

    const { error } = await query;

    if (error) {
      console.error(error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron guardar los cambios",
      });
      return;
    }

    toast.current.show({
      severity: "success",
      summary: "Guardado",
      detail: "Producto actualizado",
    });

    // reflejar cambios en memoria
    setProductos((prev) =>
      prev.map((p) => {
        const match = tieneId
          ? p.id === editData.id
          : p.codigo_interno === editData.codigo_interno;

        return match
          ? {
              ...p,
              ...updateObj,
              id: p.id !== undefined ? p.id : editData.id ?? p.id,
            }
          : p;
      })
    );

    setEditVisible(false);
  };

  // ----------------- DAR DE BAJA (ELIMINAR LÓGICO) -----------------
  const abrirEliminar = (producto) => {
    setProductoAEliminar(producto);
    setDeleteVisible(true);
  };

  const cancelarEliminar = () => {
    setDeleteVisible(false);
    setProductoAEliminar(null);
    setEliminando(false);
  };

  const confirmarEliminar = async () => {
    if (!productoAEliminar) return;

    setEliminando(true);

    const tieneId =
      productoAEliminar.id !== null &&
      productoAEliminar.id !== undefined;

    const matchFilter = tieneId
      ? { id: productoAEliminar.id }
      : { codigo_interno: productoAEliminar.codigo_interno };

    // en vez de delete físico, marcamos activo = false
    const { error } = await supabase
      .from("productos")
      .update({ activo: false })
      .match(matchFilter);

    if (error) {
      console.error("BAJA error ->", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail:
          "No se pudo dar de baja el producto: " + (error.message || ""),
      });
      setEliminando(false);
      return;
    }

    toast.current.show({
      severity: "success",
      summary: "Dado de baja",
      detail: `"${productoAEliminar.objeto}" ya no está activo`,
    });

    // sacarlo del estado local para que desaparezca visualmente
    setProductos((prev) =>
      prev.filter((p) => {
        return tieneId
          ? p.id !== productoAEliminar.id
          : p.codigo_interno !== productoAEliminar.codigo_interno;
      })
    );

    setEliminando(false);
    setDeleteVisible(false);
    setProductoAEliminar(null);
  };

  // ----------------- TABLA: COLUMNA ACCIONES -----------------
  const accionesTemplate = (rowData) => {
    return (
      <div
        className="p-d-flex p-ai-center"
        style={{ display: "flex", gap: ".5rem" }}
      >
        <Button
          label="Editar"
          icon="pi pi-pencil"
          className="p-button-sm p-button-warning"
          onClick={() => abrirEditar(rowData)}
        />
        <Button
          label="Dar de baja"
          icon="pi pi-trash"
          className="p-button-sm p-button-danger"
          onClick={() => abrirEliminar(rowData)}
        />
      </div>
    );
  };

  // ----------------- RENDER -----------------
  return (
    <main className="container" style={{ position: "relative" }}>
      <Toast ref={toast} />

      {/* Volver al menú */}
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

      {/* Formulario: Agregar producto */}
      <Card title="Agregar producto" style={{ marginBottom: "1rem" }}>
        <div className="p-fluid grid formgrid">
          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Código"
              value={nuevo.codigo_interno}
              onChange={(e) =>
                setNuevo({
                  ...nuevo,
                  codigo_interno: e.target.value,
                })
              }
            />
          </div>

          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Objeto"
              value={nuevo.objeto}
              onChange={(e) =>
                setNuevo({
                  ...nuevo,
                  objeto: e.target.value,
                })
              }
            />
          </div>

          <div className="field col-12 md:col-3">
            <InputText
              placeholder="Descripción"
              value={nuevo.descripcion}
              onChange={(e) =>
                setNuevo({
                  ...nuevo,
                  descripcion: e.target.value,
                })
              }
            />
          </div>

          <div className="field col-12 md:col-1">
            <InputNumber
              placeholder="Cantidad"
              value={nuevo.cantidad}
              min={0}
              onValueChange={(e) =>
                setNuevo({
                  ...nuevo,
                  cantidad:
                    e.value !== undefined && e.value !== null
                      ? e.value
                      : "",
                })
              }
            />
          </div>

          <div className="field col-12 md:col-2">
            <InputNumber
              placeholder="Precio"
              value={nuevo.precio}
              min={0}
              onValueChange={(e) =>
                setNuevo({
                  ...nuevo,
                  precio:
                    e.value !== undefined && e.value !== null
                      ? e.value
                      : "",
                })
              }
            />
          </div>

          <div className="field col-12 md:col-2">
            <Button
              label="Agregar"
              icon="pi pi-plus"
              onClick={agregarProducto}
            />
          </div>
        </div>
      </Card>

      {/* Tabla de productos */}
      <Card title="Listado de productos">
        <DataTable value={productos} paginator rows={5} stripedRows>
          {/* si existe id en la data, la mostramos */}
          {"id" in (productos[0] || {}) && (
            <Column field="id" header="ID" />
          )}

          <Column field="codigo_interno" header="Código" />
          <Column field="objeto" header="Objeto" />
          <Column field="descripcion" header="Descripción" />
          <Column field="cantidad" header="Stock" />
          <Column
            field="precio"
            header="Precio"
            body={(p) => `$${p.precio}`}
          />
          <Column header="Acciones" body={accionesTemplate} />
        </DataTable>
      </Card>

      {/* MODAL EDITAR */}
      {editVisible && (
        <>
          {/* fondo oscurecido */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 999,
            }}
            onClick={cancelarEdicion}
          />

          {/* cajita flotante */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#1e1e1e",
              color: "#fff",
              borderRadius: "12px",
              padding: "1rem 1.5rem",
              width: "320px",
              maxWidth: "90vw",
              boxShadow: "0 20px 50px rgba(0,0,0,.9)",
              border: "1px solid #444",
              zIndex: 1000,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
              Editar producto
            </h2>

            <div className="p-fluid grid formgrid" style={{ rowGap: ".5rem" }}>
              <div className="field col-12">
                <small>Código interno</small>
                <InputText
                  value={editData.codigo_interno}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      codigo_interno: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field col-12">
                <small>Objeto</small>
                <InputText
                  value={editData.objeto}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      objeto: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field col-12">
                <small>Descripción</small>
                <InputText
                  value={editData.descripcion}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      descripcion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field col-6">
                <small>Cantidad</small>
                <InputNumber
                  value={editData.cantidad}
                  min={0}
                  onValueChange={(e) =>
                    setEditData({
                      ...editData,
                      cantidad:
                        e.value !== undefined && e.value !== null
                          ? e.value
                          : "",
                    })
                  }
                />
              </div>

              <div className="field col-6">
                <small>Precio</small>
                <InputNumber
                  value={editData.precio}
                  min={0}
                  onValueChange={(e) =>
                    setEditData({
                      ...editData,
                      precio:
                        e.value !== undefined && e.value !== null
                          ? e.value
                          : "",
                    })
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: ".5rem",
                marginTop: "1rem",
              }}
            >
              <Button
                label="Cancelar"
                className="p-button-sm p-button-secondary"
                onClick={cancelarEdicion}
              />
              <Button
                label="Guardar"
                icon="pi pi-check"
                className="p-button-sm p-button-success"
                onClick={guardarEdicion}
              />
            </div>
          </div>
        </>
      )}

      {/* MODAL DAR DE BAJA */}
      {deleteVisible && (
        <>
          {/* fondo oscurecido */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 999,
            }}
            onClick={cancelarEliminar}
          />

          {/* caja flotante roja */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#2a0000",
              color: "#fff",
              borderRadius: "12px",
              padding: "1rem 1.5rem",
              width: "320px",
              maxWidth: "90vw",
              boxShadow: "0 20px 50px rgba(0,0,0,.9)",
              border: "1px solid #622",
              zIndex: 1000,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                fontSize: "1.1rem",
                color: "#fff",
              }}
            >
              Dar de baja producto
            </h2>

            <p
              style={{
                fontSize: ".9rem",
                lineHeight: "1.3rem",
                color: "#ddd",
              }}
            >
              ¿Seguro que querés dar de baja{" "}
              <strong>{productoAEliminar?.objeto}</strong>? No va a aparecer más
              para vender.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: ".5rem",
                marginTop: "1rem",
              }}
            >
              <Button
                label="Cancelar"
                className="p-button-sm p-button-secondary"
                onClick={cancelarEliminar}
                disabled={eliminando}
              />
              <Button
                label={eliminando ? "Procesando..." : "Sí, dar de baja"}
                icon="pi pi-trash"
                className="p-button-sm p-button-danger"
                onClick={confirmarEliminar}
                disabled={eliminando}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
