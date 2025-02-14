// Importar las librerías necesarias
import fetch from 'node-fetch';  
import sql from 'mssql';  
import cron from 'node-cron';  // Importar node-cron para programar tareas

// Configuración de la base de datos
const dbConfig = {
  user: process.env.DB_USER, // Nombre de usuario
  password: process.env.DB_PASSWORD, // Contraseña
  server: process.env.DB_SERVER, // Servidor e instancia
  database: process.env.DB_DATABASE, // Nombre de la base de datos
  options: {
    encrypt: true, // Usar cifrado si es necesario
    trustServerCertificate: true // Si estás usando un certificado no verificado
  }
};

// Función para obtener el tipo de cambio y almacenarlo en la base de datos
async function obtenerYGuardarTipoCambio() {
  const fechaActual = new Date().toISOString().split('T')[0]; // Obtener la fecha actual en formato YYYY-MM-DD
  const token = process.env.API_TOKEN;  // Token de la API
  const url = `https://api.apis.net.pe/v2/sunat/tipo-cambio?date=${fechaActual}`;

  try {
    // Realizar la solicitud HTTP para obtener el tipo de cambio
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Verificar que la respuesta sea exitosa
    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    // Convertir la respuesta en formato JSON
    const data = await response.json();

    // Datos del tipo de cambio
    const tipoCambio = {
      precioCompra: data.compra, // Acceder a la propiedad correcta
      precioVenta: data.venta,   // Acceder a la propiedad correcta
      moneda: 'USD',             // Moneda fija (dólares)
      fecha: new Date(fechaActual) // Fecha actual
    };

    // Conectar a la base de datos
    const pool = await sql.connect(dbConfig);

    // Realizar una inserción en la base de datos
    const query = `
      INSERT INTO Tipo_Cambio (precio_Compra, precio_Venta, moneda, fecha)
      VALUES (@precioCompra, @precioVenta, @moneda, @fecha)
    `;

    // Ejecutar la consulta de inserción
    await pool.request()
      .input('precioCompra', sql.Float, tipoCambio.precioCompra)
      .input('precioVenta', sql.Float, tipoCambio.precioVenta)
      .input('moneda', sql.NVarChar, tipoCambio.moneda)
      .input('fecha', sql.Date, tipoCambio.fecha)
      .query(query);

    console.log(`Tipo de cambio insertado correctamente en la base de datos para la fecha: ${fechaActual}`);
  } catch (error) {
    console.error('Error al obtener o insertar el tipo de cambio:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sql.close();
  }
}

// Programar la ejecución de la función a las 7:00 a.m. todos los días
cron.schedule('0 7 * * *', () => {
  console.log('Ejecutando la tarea programada a las 7:00 a.m.');
  obtenerYGuardarTipoCambio();
});

console.log('Programación iniciada. La tarea se ejecutará a las 7:00 a.m. todos los días.');