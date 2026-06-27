const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const PHOTOS_DIR = path.join(__dirname, 'fotos-originais');
const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_SUFFIX = '.cache.jpg';

// Modo "somente servir": usado em hardware fraco demais para redimensionar
// imagens (ex: Raspberry Pi 1). Não exige 'sharp' instalado e lê só o que já
// está pronto em cache/ — gerado previamente em outra máquina e copiado para
// lá. Ative com a variável de ambiente SERVE_ONLY=1.
const SERVE_ONLY = process.env.SERVE_ONLY === '1' || process.env.SERVE_ONLY === 'true';

// sharp e heic-convert só são necessários (e só são exigidos) fora do modo
// SERVE_ONLY, para que o Raspberry Pi 1 não precise nem tentar instalá-los.
// heic-convert decodifica HEIC/HEIF (formato padrão de fotos do iPhone), que
// os binários pré-compilados do sharp não suportam por causa de licenciamento
// de patente do codec HEVC.
let sharp = null;
let heicConvert = null;
if (!SERVE_ONLY) {
  sharp = require('sharp');
  heicConvert = require('heic-convert');
}

const HEIC_EXT = new Set(['.heic', '.heif']);

// Tamanho alvo: tela do iPad Mini 2 é 2048x1536 (retina), mas o hardware é
// fraco para decodificar JPEGs muito grandes. 1600px de lado maior é um bom
// equilíbrio entre nitidez e velocidade de decode/crossfade.
const MAX_SIDE = 1600;
const JPEG_QUALITY = 80;

const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff']);

const dirsToEnsure = SERVE_ONLY ? [CACHE_DIR] : [PHOTOS_DIR, CACHE_DIR];
for (const dir of dirsToEnsure) {
  fs.mkdirSync(dir, { recursive: true });
}

const app = express();

app.get('/api/photos', (req, res) => {
  if (SERVE_ONLY) {
    fs.readdir(CACHE_DIR, (err, files) => {
      if (err) {
        console.error('Erro ao ler cache:', err);
        return res.status(500).json({ error: 'Falha ao listar fotos' });
      }
      const photos = files
        .filter((f) => f.endsWith(CACHE_SUFFIX))
        .map((f) => f.slice(0, -CACHE_SUFFIX.length));
      res.json({ photos });
    });
    return;
  }

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
  const cachePath = path.join(CACHE_DIR, `${filename}${CACHE_SUFFIX}`);

  if (!VALID_EXT.has(path.extname(filename).toLowerCase())) {
    return res.status(400).send('Formato não suportado');
  }

  if (SERVE_ONLY) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(cachePath, (err) => {
      if (err) res.status(404).send('Foto não encontrada no cache');
    });
  }

  const originalPath = path.join(PHOTOS_DIR, filename);

  fs.stat(originalPath, async (err, originalStat) => {
    if (err) {
      return res.status(404).send('Foto não encontrada');
    }

    try {
      const cacheStat = await fs.promises.stat(cachePath).catch(() => null);
      const cacheIsFresh = cacheStat && cacheStat.mtimeMs >= originalStat.mtimeMs;

      if (!cacheIsFresh) {
        const resizeAndCache = (input) =>
          sharp(input)
            .rotate() // aplica orientação EXIF e remove o metadado
            .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
            .toFile(cachePath);

        try {
          // Muitos arquivos ".heic" por aí são na verdade JPEGs renomeados
          // (ex: reexportados por apps de edição), então sempre tentamos o
          // sharp primeiro e só caímos para heic-convert se ele de fato falhar.
          await resizeAndCache(originalPath);
        } catch (sharpErr) {
          if (!HEIC_EXT.has(path.extname(filename).toLowerCase())) throw sharpErr;
          const heicBuffer = await fs.promises.readFile(originalPath);
          const jpegBuffer = await heicConvert({ buffer: heicBuffer, format: 'JPEG', quality: 1 });
          await resizeAndCache(jpegBuffer);
        }
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
