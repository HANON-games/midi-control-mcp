# MIDI Control MCP Server

A Model Context Protocol server for sending MIDI messages to output devices.

This TypeScript-based MCP server provides tools to interact with MIDI output devices, allowing you to send note and control change messages to specified MIDI channels.

## Features

### Tools

#### `list_ports`
Lists all available MIDI output ports on the system.
- No parameters required
- Returns port names and manufacturers

#### `send_messages`
Sends multiple MIDI messages (notes and control changes) to a specified port.
- Parameters:
  - `port`: MIDI output port name (required)
  - `notes`: Array of note messages (optional)
    - `channel`: MIDI channel (1-16)
    - `note`: Note number (0-127)
    - `velocity`: Note velocity (0-127)
    - `release`: Note release velocity (0-127)
    - `duration`: Note duration in milliseconds
    - `time`: Time in milliseconds to send the message (optional)
  - `controls`: Array of control change messages (optional)
    - `channel`: MIDI channel (1-16)
    - `controller`: Controller number (0-127)
    - `value`: Control value (0-127)
    - `time`: Time in milliseconds to send the message (optional)

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

### Prerequisites

1. Install Node.js and npm
2. For Windows users, install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) to create virtual MIDI ports for testing

### Setup with Claude Desktop

Add the server configuration to:
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "midi-control-mcp": {
      "command": "node",
      "args": ["/path/to/midi-control-mcp/build/index.js"]
    }
  }
}
```
