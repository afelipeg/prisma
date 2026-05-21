#!/usr/bin/env bun
import { runDemo } from './demo.js';
import { runMcp } from './mcp.js';

const [,, command] = process.argv;

switch (command) {
  case 'demo':
    await runDemo();
    break;
  case 'mcp':
    await runMcp();
    break;
  default:
    console.log('Usage: prism <demo|mcp>');
    process.exit(1);
}
