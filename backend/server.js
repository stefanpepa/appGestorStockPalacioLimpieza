const express = require("express");
const cors = require("cors");
const Afip = require("@afipsdk/afip.js");
require("dotenv").config();

const app = express();

// Permitir frontend
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
  })
);

app.use(express.json());

// AFIP config
const afip = new Afip({
  CUIT: process.env.AFIP_CUIT || 20409378472,
  access_token: process.env.AFIP_ACCESS_TOKEN,
});

// Health check
app.get("/", (_, res) => res.send("Backend AFIP OK"));

// ===================================================================
// FACTURAR
// ===================================================================
app.post("/api/facturar", async (req, res) => {
  try {
    const {
      items,
      fecha,
      total,
      tipoFactura = "B",
      tipoCliente = "consumidor_final",
      razonSocial = "",
      cuitCliente = 0,
    } = req.body;

    console.log("📦 Body recibido:", req.body);

    // ============================
    //   DOCUMENTO DEL RECEPTOR
    // ============================
    const docTipo = tipoFactura === "A" ? 80 : 99;  // 80 = CUIT / 99 = consumidor final
    const docNro =
      tipoFactura === "A"
        ? Number(String(cuitCliente).replace(/\D/g, ""))
        : 0;

    // ============================
    //   CONDICIÓN IVA RECEPTOR
    // ============================
    const condicionIVA = {
      consumidor_final: 5,
      inscripto: 1,
      monotributista: 6,
      exento: 4,
    };

    const condicionIVAReceptor =
      condicionIVA[tipoCliente] || 5; // default consumidor final

    // ============================
    //   CÁLCULO IVA
    // ============================
    const neto = parseFloat((total / 1.21).toFixed(2));
    const iva = parseFloat((total - neto).toFixed(2));
    const cbteFch = parseInt(String(fecha).replace(/-/g, ""));

    // Tipo de comprobante
    const cbteTipos = { A: 1, B: 6 };
    const cbteTipo = cbteTipos[tipoFactura] || 6;

    const data = {
      CantReg: 1,
      PtoVta: parseInt(process.env.PTO_VTA || 1),
      CbteTipo: cbteTipo,
      Concepto: 1,
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

      // *** OBLIGATORIO PARA FACTURA A ***
      CondicionIvaReceptor: condicionIVAReceptor,

      Iva: [
        {
          Id: 5, // 21%
          BaseImp: neto,
          Importe: iva,
        },
      ],
    };

    console.log("➡️ Enviando a AFIP:", data);

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

// ===================================================================
// INICIAR SERVER
// ===================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log("🚀 Backend AFIP escuchando en http://localhost:" + PORT)
);
