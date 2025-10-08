// --- Estado y persistencia (localStorage) ---
const LS_KEY_ITEMS = "stock_items_v5";
const LS_KEY_VENTAS = "stock_ventas_v5";

/** @typedef {{sku:string,objeto:string,descripcion:string,cantidad:number,precio:number}} Item */
/** @typedef {{id:string, fecha:string, sku:string, objeto:string, cantidad:number, precio:number, total:number}} Venta */

/** @type {Item[]} */
let items = JSON.parse(localStorage.getItem(LS_KEY_ITEMS) || "[]");
/** @type {Venta[]} */
let ventas = JSON.parse(localStorage.getItem(LS_KEY_VENTAS) || "[]");

function save() {
  localStorage.setItem(LS_KEY_ITEMS, JSON.stringify(items));
  localStorage.setItem(LS_KEY_VENTAS, JSON.stringify(ventas));
}

// --- Helpers ---
const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const by = (k) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0);
const $ = (sel) => document.querySelector(sel);
const el = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

// --- DOM refs ---
const tbody = $("#tabla tbody");
const ventasBody = $("#tablaVentas tbody");
const inpSKU = el("sku");
const inpObjeto = el("objeto");
const inpDescripcion = el("descripcion");
const inpCantidad = el("cantidad");
const inpPrecio = el("precio");
const inpBuscar = el("buscar");
const selVentaProducto = el("ventaProducto");
const inpVentaCantidad = el("ventaCantidad");
const inpVentaFecha = el("ventaFecha");
const ventasTitulo = el("ventasTitulo");
const btnVender = el("btnVender");
const btnCancelarEdicion = el("btnCancelarEdicion");

let editingSaleId = null; // si no es null, estamos editando

inpVentaFecha.valueAsDate = new Date();

function render() {
  const q = (inpBuscar.value || "").toLowerCase().trim();
  const filtered = items
    .slice()
    .sort(by("objeto"))
    .filter(it => !q || it.objeto.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || (it.descripcion||'').toLowerCase().includes(q));

  // Tabla stock
  tbody.innerHTML = "";
  let valorTotal = 0;
  for (const it of filtered) {
    const total = (it.cantidad || 0) * (it.precio || 0);
    valorTotal += total;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.sku}</td>
      <td>${it.objeto}</td>
      <td>${it.descripcion || ""}</td>
      <td class="right">${Number(it.cantidad) || 0}</td>
      <td class="right">$ ${fmt(it.precio)}</td>
      <td class="right">$ ${fmt(total)}</td>
      <td class="right">
        <button class="btn secondary" data-edit="${it.sku}">Editar</button>
        <button class="btn danger" data-del="${it.sku}">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Totales y contadores
  el("valorTotal").textContent = fmt(valorTotal);
  el("countItems").textContent = String(items.length);

  // Select de ventas
  selVentaProducto.innerHTML = items
    .slice()
    .sort(by("objeto"))
    .map(it => `<option value="${it.sku}">${it.sku} — ${it.objeto} (stock: ${it.cantidad})</option>`)
    .join("");
  selVentaProducto.disabled = items.length === 0;

  // Ventas
  ventasBody.innerHTML = "";
  let ingresos = 0;
  for (const v of ventas) {
    ingresos += v.total;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.fecha}</td>
      <td>${v.sku}</td>
      <td>${v.objeto}</td>
      <td class="right">${v.cantidad}</td>
      <td class="right">$ ${fmt(v.precio)}</td>
      <td class="right">$ ${fmt(v.total)}</td>
      <td class="right">
        <button class="btn secondary" data-editventa="${v.id}">Editar</button>
        <button class="btn danger" data-delventa="${v.id}">Eliminar</button>
      </td>
    `;
    ventasBody.appendChild(tr);
  }
  el("ventasCount").textContent = String(ventas.length);
  el("ventasIngresos").textContent = fmt(ingresos);
}

function upsertItem(sku, objeto, descripcion, cantidad, precio) {
  sku = (sku || "").trim();
  objeto = (objeto || "").trim();
  if (!sku) return alert("Ingresá un código (SKD).");
  if (!objeto) return alert("Ingresá un objeto.");
  cantidad = Number(cantidad || 0);
  precio = Number(precio || 0);
  if (cantidad < 0) return alert("La cantidad no puede ser negativa.");
  if (precio < 0) return alert("El precio no puede ser negativo.");

  const idx = items.findIndex(it => it.sku.toLowerCase() === sku.toLowerCase());
  const base = { sku, objeto, descripcion: descripcion || "", cantidad, precio };
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...base };
  } else {
    items.push(base);
  }
  save();
  render();
  inpSKU.value = "";
  inpObjeto.value = "";
  inpDescripcion.value = "";
  inpCantidad.value = "";
  inpPrecio.value = "";
  inpSKU.focus();
}

function deleteItem(sku) {
  if (!confirm(`¿Borrar producto ${sku}?`)) return;
  items = items.filter(it => it.sku !== sku);
  save(); render();
}

function editItem(sku) {
  const it = items.find(x => x.sku === sku);
  if (!it) return;
  inpSKU.value = it.sku;
  inpObjeto.value = it.objeto;
  inpDescripcion.value = it.descripcion || "";
  inpCantidad.value = it.cantidad;
  inpPrecio.value = it.precio;
  inpSKU.focus();
}

// --- Ventas ---
function vender(sku, cantidad, fecha) {
  const it = items.find(x => x.sku === sku);
  if (!it) return alert("Producto no encontrado");
  cantidad = Number(cantidad || 0);
  if (cantidad <= 0) return alert("Cantidad inválida");
  if (cantidad > it.cantidad) return alert("No hay stock suficiente");
  const total = cantidad * (Number(it.precio) || 0);
  it.cantidad -= cantidad;
  ventas.unshift({
    id: uid(),
    fecha: fecha || new Date().toISOString().slice(0,10),
    sku: it.sku,
    objeto: it.objeto,
    cantidad,
    precio: Number(it.precio) || 0,
    total
  });
  save(); render();
  inpVentaCantidad.value = "";
}

function eliminarVenta(id) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;
  if (!confirm("¿Eliminar esta venta? Se devolverá el stock.")) return;
  const it = items.find(x => x.sku === v.sku);
  if (it) it.cantidad += v.cantidad; // devolver stock
  ventas = ventas.filter(x => x.id !== id);
  if (editingSaleId === id) cancelarEdicionVenta();
  save(); render();
}

function editarVenta(id) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;
  editingSaleId = id;
  // Devolver stock temporalmente para permitir cambiar la cantidad
  const it = items.find(x => x.sku === v.sku);
  if (it) it.cantidad += v.cantidad;

  // Poner datos en el formulario
  selVentaProducto.value = v.sku;
  inpVentaCantidad.value = v.cantidad;
  inpVentaFecha.value = v.fecha;

  ventasTitulo.textContent = "Editar venta";
  btnVender.textContent = "Actualizar venta";
  btnCancelarEdicion.style.display = "";
  render(); // para reflejar stock devuelto
}

function cancelarEdicionVenta() {
  // Si estábamos editando, hay que volver a restar el stock que devolvimos temporalmente
  if (!editingSaleId) return;
  const v = ventas.find(x => x.id === editingSaleId);
  if (v) {
    const it = items.find(x => x.sku === v.sku);
    if (it) it.cantidad -= v.cantidad; // restaurar situación original
  }
  editingSaleId = null;
  ventasTitulo.textContent = "Registrar venta";
  btnVender.textContent = "Vender";
  btnCancelarEdicion.style.display = "none";
  selVentaProducto.selectedIndex = 0;
  inpVentaCantidad.value = "";
  inpVentaFecha.valueAsDate = new Date();
  save(); render();
}

function actualizarVenta(id, nuevoSku, nuevaCantidad, nuevaFecha) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;
  nuevaCantidad = Number(nuevaCantidad || 0);
  if (nuevaCantidad <= 0) return alert("Cantidad inválida");

  // Ya devolvimos el stock original en editarVenta()
  // Ahora aplicamos la venta modificada
  const it = items.find(x => x.sku === nuevoSku);
  if (!it) return alert("Producto no encontrado");
  if (nuevaCantidad > it.cantidad) return alert("No hay stock suficiente");
  it.cantidad -= nuevaCantidad;

  v.sku = it.sku;
  v.objeto = it.objeto;
  v.cantidad = nuevaCantidad;
  v.precio = Number(it.precio) || 0;
  v.total = v.cantidad * v.precio;
  v.fecha = nuevoSku ? (nuevaFecha || new Date().toISOString().slice(0,10)) : v.fecha;

  save();
  editingSaleId = null;
  ventasTitulo.textContent = "Registrar venta";
  btnVender.textContent = "Vender";
  btnCancelarEdicion.style.display = "none";
  selVentaProducto.selectedIndex = 0;
  inpVentaCantidad.value = "";
  inpVentaFecha.valueAsDate = new Date();
  render();
}

// --- Eventos UI ---
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.dataset?.del) deleteItem(t.dataset.del);
  if (t.dataset?.edit) editItem(t.dataset.edit);
  if (t.dataset?.delventa) eliminarVenta(t.dataset.delventa);
  if (t.dataset?.editventa) editarVenta(t.dataset.editventa);
});

el("btnAgregar").addEventListener("click", () => {
  upsertItem(inpSKU.value, inpObjeto.value, inpDescripcion.value, inpCantidad.value, inpPrecio.value);
});

btnVender.addEventListener("click", () => {
  if (editingSaleId) {
    actualizarVenta(editingSaleId, selVentaProducto.value, inpVentaCantidad.value, inpVentaFecha.value);
  } else {
    vender(selVentaProducto.value, inpVentaCantidad.value, inpVentaFecha.value);
  }
});

btnCancelarEdicion.addEventListener("click", cancelarEdicionVenta);

inpBuscar.addEventListener("input", render);
inpPrecio.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    upsertItem(inpSKU.value, inpObjeto.value, inpDescripcion.value, inpCantidad.value, inpPrecio.value);
  }
});

// --- Easter Egg: burbujas ---
const bubble = el("bubbleEgg");
let bubbleClicks = 0;
const TRIGGER = 7;
if (bubble) {
  bubble.addEventListener("click", () => {
    bubbleClicks++;
    if (bubbleClicks >= TRIGGER) {
      bubbleClicks = 0;
      spawnBubbles(120);
    } else {
      bubble.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 180 });
    }
  });
}

function spawnBubbles(n = 60) {
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
}

// Inicial
render();
