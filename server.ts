import express from 'express';
import cors from 'cors';
import path from 'path';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createStoneGlyphMcpServer } from './src/mcp/createMcpServer.ts';
import { BUILTIN_PRESETS } from './src/utils/styleRecipe.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS for external agents and tools
app.use(cors());

// Map of active SSE session transports
const activeTransports = new Map<string, SSEServerTransport>();

// 1. MCP SSE Endpoint: Coding agents connect here via Server-Sent Events
app.get('/sse', async (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 12);
  const messageEndpoint = `/messages?sessionId=${sessionId}`;

  const transport = new SSEServerTransport(messageEndpoint, res);
  activeTransports.set(sessionId, transport);

  const mcpServer = createStoneGlyphMcpServer();
  await mcpServer.connect(transport);

  req.on('close', () => {
    activeTransports.delete(sessionId);
  });
});

// 2. MCP JSON-RPC Message Handling Endpoint
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  let transport: SSEServerTransport | undefined;

  if (sessionId && activeTransports.has(sessionId)) {
    transport = activeTransports.get(sessionId);
  } else if (activeTransports.size > 0) {
    // Fallback to most recent transport if sessionId was omitted
    transport = Array.from(activeTransports.values()).pop();
  }

  if (!transport) {
    res.status(400).json({
      error: 'Sesi MCP SSE tidak ditemukan. Pastikan klien terhubung ke /sse terlebih dahulu.',
    });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// 2b. MCP Streamable HTTP Endpoint (modern clients: VS Code, Cursor,
// Claude Code via HTTP). Stateless: one server+transport per request,
// no session bookkeeping. Legacy SSE (/sse + /messages) is kept below
// for older clients.
app.post('/mcp', express.json(), async (req, res) => {
  try {
    const mcpServer = createStoneGlyphMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close().catch(() => {});
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('Streamable HTTP MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal MCP error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', (_req, res) => {
  res.status(405).json({
    error: 'Endpoint /mcp hanya menerima POST (Streamable HTTP). Gunakan stdio (mcp-stdio.ts) untuk koneksi lokal, atau POST JSON-RPC ke endpoint ini.',
  });
});

// 3. MCP Discovery & Connection Info API
app.get('/api/mcp/info', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  const baseUrl = `${protocol}://${host}`;

  const info = {
    name: 'stoneglyph-game-ui-asset-studio',
    version: '1.0.0',
    description:
      'MCP Server untuk pembuatan aset teks tombol UI game 2D/3D (HD 96px) dan bitmap font generator.',
    status: 'online',
    endpoints: {
      // Preferred for modern clients (VS Code, Cursor, Claude Code via HTTP)
      streamableHttp: `${baseUrl}/mcp`,
      // Legacy SSE, kept for older clients
      sse: `${baseUrl}/sse`,
      messages: `${baseUrl}/messages`,
      // Preferred for local agents (no server needed, just `npm install` first)
      stdioCommand: 'npx tsx mcp-stdio.ts',
    },
    tools: [
      {
        name: 'list_presets',
        description: 'Daftar semua preset material teks (Stone, Gold, ABOUT, Wood, Ice, Metal)',
      },
      {
        name: 'get_preset_recipe',
        description: 'Ambil parameter shader lengkap preset tertentu',
      },
      {
        name: 'calculate_word_dimensions',
        description: 'Hitung dimensi piksel kata (W x 96px HD standard) & in-game path',
      },
      {
        name: 'generate_game_word_specs',
        description: 'Generate metadata tombol game dan path penempatan file in-game',
      },
      {
        name: 'list_available_fonts',
        description: 'Daftar font bawaan, Google Fonts loader, dan upload .ttf/.otf',
      },
      {
        name: 'generate_bmfont_fnt_manifest',
        description: 'Generate AngelCode BMFont (.fnt) manifest untuk Unity/Godot/Phaser',
      },
      {
        name: 'generate_batch_queue_config',
        description: 'Generate konfigurasi batch multi-bahasa (EN / ID)',
      },
    ],
    configSnippets: {
      // Claude Code: project file .mcp.json (stdio, committed in this repo)
      claudeCodeStdio: {
        mcpServers: {
          'png-asset-studio': {
            command: 'npx',
            args: ['tsx', 'mcp-stdio.ts'],
          },
        },
      },
      claudeCodeHttp: {
        mcpServers: {
          'png-asset-studio': {
            type: 'http',
            url: `${baseUrl}/mcp`,
          },
        },
      },
      // VS Code: .vscode/mcp.json (stdio + http, committed in this repo)
      vscodeStdio: {
        servers: {
          'png-asset-studio': {
            type: 'stdio',
            command: 'npx',
            args: ['tsx', 'mcp-stdio.ts'],
          },
        },
      },
      vscodeHttp: {
        servers: {
          'png-asset-studio-http': {
            type: 'http',
            url: `${baseUrl}/mcp`,
          },
        },
      },
      cursor: {
        mcpServers: {
          'stoneglyph-studio': {
            url: `${baseUrl}/sse`,
          },
        },
      },
      claudeDesktopSse: {
        mcpServers: {
          'stoneglyph-studio': {
            url: `${baseUrl}/sse`,
          },
        },
      },
      claudeDesktopStdio: {
        mcpServers: {
          'stoneglyph-studio': {
            command: 'npx',
            args: ['tsx', 'mcp-stdio.ts'],
          },
        },
      },
      windsurf: {
        mcpServers: {
          'stoneglyph-studio': {
            serverUrl: `${baseUrl}/sse`,
          },
        },
      },
    },
  };

  res.json(info);
});

// 4. REST API Endpoints for Direct Script Access
app.get('/api/presets', (_req, res) => {
  res.json(BUILTIN_PRESETS);
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mcpSessions: activeTransports.size,
  });
});

// 5. Mount Vite middleware in development or serve static in production
async function startServer() {
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
    console.log(`StoneGlyph Studio & MCP Server running on port ${PORT}`);
    console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
