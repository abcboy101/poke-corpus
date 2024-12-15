import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';
import { createServer } from "vite";
import react from '@vitejs/plugin-react-swc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function genStatic() {
  const vite = await createServer({
    plugins: [react()],
    server: { middlewareMode: true },
    appType: "custom",
  });

  const template = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf-8');
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
  const appHtml = await render();
  const html = template.replace('<!--ssr-outlet-->', () => appHtml);
  fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);

  await vite.close();
}

genStatic();
