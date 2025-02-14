import express from 'express'; // Si usas Express
import fetch from 'node-fetch';
import sql from 'mssql';
import cron from 'node-cron';

const app = express();

// Configuración de la base de datos
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Función para obtener el tipo de cambio
async function obtenerYGuardarTipoCambio() {
  const fechaActual = new Date().toISOString().split('T')[0];
  const token = process.env.API_TOKEN;
  const url = `https://api.apis.net.pe/v2/sunat/tipo-cambio?date=${fechaActual}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    const data = await response.json();
    const tipoCambio = {
      precioCompra: data.compra,
      precioVenta: data.venta,
      moneda: 'USD',
      fecha: new Date(fechaActual),
    };

    const pool = await sql.connect(dbConfig);
    const query = `
      INSERT INTO Tipo_Cambio (precio_Compra, precio_Venta, moneda, fecha)
      VALUES (@precioCompra, @precioVenta, @moneda, @fecha)
    `;

    await pool.request()
      .input('precioCompra', sql.Float, tipoCambio.precioCompra)
      .input('precioVenta', sql.Float, tipoCambio.precioVenta)
      .input('moneda', sql.NVarChar, tipoCambio.moneda)
      .input('fecha', sql.Date, tipoCambio.fecha)
      .query(query);

    console.log(`Tipo de cambio insertado correctamente para la fecha: ${fechaActual}`);
  } catch (error) {
    console.error('Error al obtener o insertar el tipo de cambio:', error);
  } finally {
    await sql.close();
  }
}

// Programar la tarea a las 7:00 a.m.
cron.schedule('0 7 * * *', () => {
  console.log('Ejecutando la tarea programada a las 7:00 a.m.');
  obtenerYGuardarTipoCambio();
});

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Servidor de tipo de cambio funcionando!');
});

// Escuchar en el puerto asignado por Render
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
