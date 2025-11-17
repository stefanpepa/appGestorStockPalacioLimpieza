const express = require("express");
const cors = require("cors");
const Afip = require("@afipsdk/afip.js");
require("dotenv").config();

const app = express();

// ===========================================
// 🔓 Permitir acceso desde el frontend
// ===========================================
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
  })
);

app.use(express.json());

// ===========================================
// ⚙️ Configuración de AFIP
// ===========================================
const afip = new Afip({
  CUIT: process.env.AFIP_CUIT || 20409378472,
  cert: "./cert/palacio.crt", // ruta a tu certificado .crt
  key: "./cert/palacio.key",  // ruta a tu archivo .key
  production: false, // true si usás entorno productivo
});

// ===========================================
// 🧠 Health check
// ===========================================
app.get("/", (_, res) => res.send("✅ Backend AFIP OK"));

// ===========================================
// 🧾 FACTURAR
// ===========================================
app.post("/api/facturar", async (req, res) => {
  try {
    const {
      items = [],
      fecha,
      total,
      tipoFactura = "B",
      tipoCliente = "consumidor_final",
      razonSocial = "",
      cuitCliente = "",
    } = req.body;

    console.log("📦 Body recibido:", req.body);

    // ============================
    // 📄 Documento del receptor
    // ============================
    let docTipo = 99; // 99 = consumidor final
    let docNro = 0;

    // Si es factura A → CUIT obligatorio
    if (tipoFactura === "A") {
      docTipo = 80; // CUIT
      docNro = Number(String(cuitCliente).replace(/\D/g, "")) || 0;
    }

    // Si es factura B pero tiene CUIT (ej: monotributista)
    if (tipoFactura === "B" && cuitCliente) {
      docTipo = 80;
      docNro = Number(String(cuitCliente).replace(/\D/g, "")) || 0;
    }

    // ============================
    // 💡 Condición frente al IVA
    // ============================
    const condicionIVA = {
      consumidor_final: 5,
      inscripto: 1,
      monotributista: 6,
      exento: 4,
    };

    const condicionIVAReceptor = condicionIVA[tipoCliente] || 5;

    // ============================
    // 💰 Cálculo de importes
    // ============================
    const neto = parseFloat((total / 1.21).toFixed(2));
    const iva = parseFloat((total - neto).toFixed(2));
    const cbteFch = parseInt(String(fecha).replace(/-/g, ""));

    // ============================
    // 📋 Tipo de comprobante
    // ============================
    const cbteTipos = { A: 1, B: 6 };
    const cbteTipo = cbteTipos[tipoFactura] || 6;

    // ============================
    // 🧾 Estructura de datos para AFIP
    // ============================
    const data = {
      CantReg: 1,
      PtoVta: parseInt(process.env.PTO_VTA || 1),
      CbteTipo: cbteTipo,
      Concepto: 1, // Productos
      DocTipo: docTipo,
      DocNro: docNro,
      CbteDesde: 1,
      CbteHasta: 1,
      CbteFch: cbteFch,

      ImpNeto: neto,
      ImpIVA: iva,
      ImpTotConc: 0,
      ImpOpEx: 0,
      ImpTrib: 0,
      ImpTotal: total,

      MonId: "PES",
      MonCotiz: 1,

      Iva: [
        {
          Id: 5, // 21%
          BaseImp: neto,
          Importe: iva,
        },
      ],
    };

    // ✅ Agregar CondicionIvaReceptor SOLO si corresponde
    if (tipoFactura === "A" || docTipo === 80) {
      data.CondicionIvaReceptor = condicionIVAReceptor;
    }

    console.log("➡️ Enviando a AFIP:", data);

    // ============================
    // 📤 Enviar a AFIP
    // ============================
    const voucher = await afip.ElectronicBilling.createNextVoucher(data);

    console.log("✔ Respuesta AFIP:", voucher);

    return res.json({
      cae: voucher.CAE,
      vencimientoCae: voucher.CAEFchVto,
      nroComprobante: voucher.voucher_number,
      ptoVta: data.PtoVta,
      tipoFactura,
    });
  } catch (err) {
    console.error("❌ AFIP error:", err);
    res.status(500).json({
      error: err.message || "Error al facturar en AFIP",
    });
  }
});

// ===========================================
// 🚀 Iniciar servidor
// ===========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log("🚀 Backend AFIP escuchando en http://localhost:" + PORT)
);
