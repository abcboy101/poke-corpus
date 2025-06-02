import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from '@vitejs/plugin-react-swc';

import { render } from './src/entry-server';

const __dirname = path.dirname(process.argv[1]);
const ssrOutlet = '<!--ssr-outlet-->';

async function renderAppToHTML(): Promise<string> {
  const vite = await createServer({
    plugins: [react()],
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const ssrRender = (await vite.ssrLoadModule('/src/entry-server.tsx')).render as typeof render;
    return ssrRender();
  }
  finally {
    vite.close().catch((err: unknown) => {
      console.error(err);
    });
  }
}

async function genStatic() {
  console.log('genStatic: SSR started');
  const [template, appHtml] = await Promise.all([
    fs.readFile(path.join(__dirname, 'dist', 'index.html'), 'utf-8').then((template) => {
      if (!template.includes(ssrOutlet))
        throw Error(`index.html does not have ${ssrOutlet}`);
      return template;
    }),
    renderAppToHTML(),
  ]);

  const html = template.replace(ssrOutlet, appHtml);
  await fs.writeFile(path.join(__dirname, 'dist', 'index.ssr.html'), html);
  console.log('genStatic: SSR done');
}

genStatic().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
