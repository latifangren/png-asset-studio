/**
 * Web server: Express app, REST endpoints, and Vite dev middleware /
 * static production serving. MCP routes are registered separately from
 * server/mcp.ts — this file knows nothing about MCP transports.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import path from 'path';
import { BUILTIN_PRESETS } from '../src/utils/styleRecipe.ts';
import { getMcpSessionCount, registerMcpRoutes } from './mcp.ts';

export const PORT = Number(process.env.PORT) || 3000;

export function createApp(): Express {
  const app = express();

  // Enable CORS for external agents and tools
  app.use(cors());

  registerMcpRoutes(app, PORT);

  // REST API Endpoints for Direct Script Access
  app.get('/api/presets', (_req, res) => {
    res.json(BUILTIN_PRESETS);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mcpSessions: getMcpSessionCount(),
    });
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PNG Asset Studio & MCP Server running on port ${PORT}`);
    console.log(`MCP Streamable HTTP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`);
  });
}
