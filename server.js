const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const PORT = process.env.PORT || 3000;
const PHOTOS_DIR = path.join(__dirname, 'fotos-originais');
const CACHE_DIR = path.join(__dirname, 'cache');

// Tamanho alvo: tela do iPad Mini 2 é 2048x1536 (retina), mas o hardware é
// fraco para decodificar JPEGs muito grandes. 1600px de lado maior é um bom
// equilíbrio entre nitidez e velocidade de decode/crossfade.
const MAX_SIDE = 1600;
const JPEG_QUALITY = 80;

const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff']);

for (const dir of [PHOTOS_DIR, CACHE_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const app = express();

app.get('/api/photos', (req, res) => {
  fs.readdir(PHOTOS_DIR, (err, files) => {
    if (err) {
      console.error('Erro ao ler fotos-originais:', err);
      return res.status(500).json({ error: 'Falha ao listar fotos' });
    }
    const photos = files.filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()));
    res.json({ photos });
  });
});

app.get('/photos/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  const originalPath = path.join(PHOTOS_DIR, filename);

  if (!VALID_EXT.has(path.extname(filename).toLowerCase())) {
    return res.status(400).send('Formato não suportado');
  }

  fs.stat(originalPath, async (err, originalStat) => {
    if (err) {
      return res.status(404).send('Foto não encontrada');
    }

    const cachePath = path.join(CACHE_DIR, `${filename}.cache.jpg`);

    try {
      const cacheStat = await fs.promises.stat(cachePath).catch(() => null);
      const cacheIsFresh = cacheStat && cacheStat.mtimeMs >= originalStat.mtimeMs;

      if (!cacheIsFresh) {
        await sharp(originalPath)
          .rotate() // aplica orientação EXIF e remove o metadado
          .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toFile(cachePath);
      }

      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(cachePath);
    } catch (e) {
      console.error(`Erro processando ${filename}:`, e);
      res.status(500).send('Falha ao processar imagem');
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Porta-retrato disponível em http://<ip-do-pc>:${PORT}`);
});
