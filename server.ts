import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portFlagIndex = process.argv.indexOf('--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = parseInt(process.argv[portFlagIndex + 1], 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.DEFAULT_APP_PORT) {
      const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (process.env.PORT && process.env.PORT !== process.env.NGINX_PORT) {
      const parsed = parseInt(process.env.PORT, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 3000;
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const PORT = resolvePort();
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    );

    vitePromise.catch((err) => {
      console.error('Failed to initialize Vite dev server:', err);
      process.exit(1);
    });

    app.use((req, res, next) => {
      vitePromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
