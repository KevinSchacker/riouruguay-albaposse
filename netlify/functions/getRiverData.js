export async function handler(event, context) {
  const url = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/?page=historico&tiempo=7&id=532';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Error del servidor de Prefectura: ${res.status}` })
      };
    }

    const data = await res.text();
    const currentMatch = data.match(/ltimo registro: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);
    const previousMatch = data.match(/Registro anterior: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);

    if (!currentMatch || !previousMatch) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No se pudieron extraer los datos del HTML.' })
      };
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Error en getRiverData:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Error obteniendo datos de Prefectura.', details: error.message })
    };
  }
}
