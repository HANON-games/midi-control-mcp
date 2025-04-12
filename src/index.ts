import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { WebMidi, Output } from "webmidi";

try {
  await WebMidi.enable();
} catch (error) {
  throw new McpError(
    ErrorCode.InternalError,
    `Failed to initialize WebMidi: ${error}`
  );
}

const server = new Server(
  {
    name: "midi-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_ports",
        description: "List available MIDI output ports",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "send_messages",
        description: "Send multiple MIDI messages (notes and controls)",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "string",
              description: "MIDI output port name",
            },
            notes: {
              type: "array",
              description: "Array of MIDI note messages",
              items: {
                type: "object",
                properties: {
                  channel: {
                    type: "number",
                    description: "MIDI channel (1-16)",
                    minimum: 1,
                    maximum: 16,
                  },
                  note: {
                    type: "number",
                    description: "MIDI note number (0-127)",
                    minimum: 0,
                    maximum: 127,
                  },
                  velocity: {
                    type: "number",
                    description: "Note velocity (0-127)",
                    minimum: 0,
                    maximum: 127,
                  },
                  release: {
                    type: "number",
                    description: "Note release (0-127)",
                    minimum: 0,
                    maximum: 127,
                  },
                  duration: {
                    type: "number",
                    description: "Note duration in milliseconds",
                    minimum: 0,
                  },
                  time: {
                    type: "number",
                    description: "Time in milliseconds to send the message",
                    minimum: 0,
                  },
                },
                required: ["channel", "note", "velocity", "release", "duration"],
              },
            },
            controls: {
              type: "array",
              description: "Array of MIDI control change messages",
              items: {
                type: "object",
                properties: {
                  channel: {
                    type: "number",
                    description: "MIDI channel (1-16)",
                    minimum: 1,
                    maximum: 16,
                  },
                  controller: {
                    type: "number",
                    description: "Controller number (0-127)",
                    minimum: 0,
                    maximum: 127,
                  },
                  value: {
                    type: "number",
                    description: "Control value (0-127)",
                    minimum: 0,
                    maximum: 127,
                  },
                  time: {
                    type: "number",
                    description: "Time in milliseconds to send the message",
                    minimum: 0,
                  },
                },
                required: ["channel", "controller", "value"],
              },
            },
          },
          required: ["port"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_ports": {
      const outputs = WebMidi.outputs;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              outputs.map((output: Output) => ({
                name: output.name,
                manufacturer: output.manufacturer,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case "send_messages": {
      const { port, notes = [], controls = [] } = request.params.arguments as {
        port: string;
        notes?: Array<{
          channel: number;
          note: number;
          velocity: number;
          release: number;
          duration: number;
          time: number;
        }>;
        controls?: Array<{
          channel: number;
          controller: number;
          value: number;
          time: number;
        }>;
      };

      const output = WebMidi.outputs.find((out: Output) => out.name === port);
      if (!output) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `MIDI output port not found: ${port}`
        );
      }

      // Process all notes
      for (const note of notes) {
        if (output.channels.length < note.channel) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `MIDI output port ${port} does not support channel ${note.channel}`
          );
        }

        output.channels[note.channel].playNote(note.note, {
          duration: note.duration,
          rawAttack: note.velocity,
          rawRelease: note.release,
          time: `+${note.time}`,
        });
      }

      // Process all control changes
      for (const control of controls) {
        if (output.channels.length < control.channel) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `MIDI output port ${port} does not support channel ${control.channel}`
          );
        }

        output.channels[control.channel].sendControlChange(control.controller, control.value, {
          time: `+${control.time}`,
        });
      }

      const notesSummary = notes.length > 0 
        ? `Sent ${notes.length} note messages` 
        : "No note messages sent";
      const controlsSummary = controls.length > 0
        ? `Sent ${controls.length} control change messages`
        : "No control change messages sent";

      return {
        content: [
          {
            type: "text",
            text: `${notesSummary}, ${controlsSummary} to ${port}`,
          },
        ],
      };
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
