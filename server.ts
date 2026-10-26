/**
 * Entry point kept for `npm run dev` / `npm start` (`tsx server.ts`).
 * All logic lives in server/web.ts (web + Vite) and server/mcp.ts (MCP).
 */
import { startServer } from './server/web.ts';

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
