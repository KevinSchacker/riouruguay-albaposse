const Jimp = require('jimp');

async function removeWhite(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);
    
    // Tolerancia para considerar un color como "blanco" (0-255)
    // 240 significa que cualquier pixel con R>240, G>240, B>240 será transparente
    const threshold = 230; 

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      if (red > threshold && green > threshold && blue > threshold) {
        this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
      }
    });

    await image.writeAsync(outputPath);
    console.log(`Procesado: ${inputPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error procesando ${inputPath}:`, error);
  }
}

async function run() {
  await removeWhite('./public/logo-proteccion.jpg', './public/logo-proteccion-tp.png');
  await removeWhite('./public/logo-municipio.png', './public/logo-municipio-tp.png');
}

run();
