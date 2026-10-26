import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStoneGlyphMcpServer } from './src/mcp/createMcpServer.ts';

async function main() {
  const server = createStoneGlyphMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio transport connects stdin/stdout
}

main().catch((err) => {
  console.error('Fatal error in StoneGlyph MCP stdio server:', err);
  process.exit(1);
});
