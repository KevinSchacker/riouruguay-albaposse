const https = require('https');

exports.handler = async function(event, context) {
  const url = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/?page=historico&tiempo=7&id=532';

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Extraemos los datos usando expresiones regulares básicas sobre el HTML devuelto
          // Ejemplo: <b>Último registro: </b>9.00 Mts el 04/JUL/26 - 0600<br>
          
          // Nota: a veces viene con codificación y puede ser ltimo, así que buscamos "ltimo registro" para ser seguros
          const currentMatch = data.match(/ltimo registro: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);
          const previousMatch = data.match(/Registro anterior: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);

          if (!currentMatch || !previousMatch) {
            console.error("No se pudieron parsear los datos en la web.");
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'No se pudieron extraer los datos.' })
            });
            return;
          }

          const responseData = {
            current: {
              height: currentMatch[1],
              date: currentMatch[2],
              time: currentMatch[3]
            },
            previous: {
              height: previousMatch[1],
              date: previousMatch[2],
              time: previousMatch[3]
            },
            fetchedAt: new Date().toISOString()
          };

          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*', // Permitir peticiones desde cualquier origen (para desarrollo local)
            },
            body: JSON.stringify(responseData)
          });
        } catch (e) {
          console.error(e);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Error procesando la respuesta.' })
          });
        }
      });
    }).on('error', (e) => {
      console.error(e);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Error obteniendo datos de Prefectura.' })
      });
    });
  });
};
