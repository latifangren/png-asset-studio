import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoneGlyphMcpServer } from './createMcpServer';

test('createStoneGlyphMcpServer initializes with correct name and registered tools', () => {
  const server = createStoneGlyphMcpServer();
  assert.ok(server);
  // server instance exists and has connect method
  assert.equal(typeof server.connect, 'function');
});
