#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, executeTool, setTopicMonitorInstance } from "./tools/index.js";
import { MattermostClient } from "./client.js";
import { loadConfig } from "./config.js";
import { TopicMonitor } from "./monitor/index.js";
import * as http from 'http';

async function main() {
  // Check for command-line arguments
  const runMonitoringImmediately = process.argv.includes('--run-monitoring');
  const exitAfterMonitoring = process.argv.includes('--exit-after-monitoring');
  
  console.error("Starting Mattermost MCP Server...");
  
  // Load configuration
  const config = loadConfig();
  
  // Initialize Mattermost client
  let client: MattermostClient;
  try {
    client = new MattermostClient();
    console.error("Successfully initialized Mattermost client");
  } catch (error) {
    console.error("Failed to initialize Mattermost client:", error);
    process.exit(1);
  }
  
  // Initialize and start topic monitor if enabled
  let topicMonitor: TopicMonitor | null = null;
  if (config.monitoring?.enabled) {
    try {
      console.error("Initializing topic monitor...");
      topicMonitor = new TopicMonitor(client, config.monitoring);
      // Set the TopicMonitor instance in the monitoring tool
      setTopicMonitorInstance(topicMonitor);
      await topicMonitor.start();
      console.error("Topic monitor started successfully");
    } catch (error) {
      console.error("Failed to initialize topic monitor:", error);
      // Continue without monitoring
    }
  } else {
    console.error("Topic monitoring is disabled in configuration");
  }
  
  // Initialize MCP server
  const server = new Server(
    {
      name: "Mattermost MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools,
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    console.error(`Received CallToolRequest for tool: ${request.params.name}`);
    
    try {
      if (!request.params.arguments) {
        throw new Error("No arguments provided");
      }

      return await executeTool(client, request.params.name, request.params.arguments);
    } catch (error) {
      console.error("Error executing tool:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to transport
  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Mattermost MCP Server running on stdio");
  
  // Run monitoring immediately if requested (standalone mode via --run-monitoring flag)
  if (runMonitoringImmediately && topicMonitor) {
    console.error("Running monitoring immediately as requested...");
    try {
      await topicMonitor.runNow();

      if (exitAfterMonitoring) {
        console.error("Exiting after monitoring as requested...");
        process.exit(0);
      }
    } catch (error) {
      console.error("Error running monitoring immediately:", error);

      if (exitAfterMonitoring) {
        process.exit(1);
      }
    }
  }

  // NOTE: stdin is owned by the MCP SDK's StdioServerTransport — do NOT register
  // additional stdin handlers here. Use the HTTP endpoint for manual triggers.

  // Optional HTTP server for remote monitoring triggers (non-fatal if port is busy)
  const httpPort = 3456;
  const httpServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/run-monitoring') {
      if (topicMonitor) {
        try {
          await topicMonitor.runNow();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Monitoring not enabled' }));
      }
    } else if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running', monitoring: { enabled: !!topicMonitor, running: topicMonitor ? topicMonitor.isRunning() : false } }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`HTTP port ${httpPort} already in use — skipping HTTP server (MCP stdio still active)`);
    } else {
      console.error(`HTTP server error: ${err.message}`);
    }
  });

  httpServer.listen(httpPort, '127.0.0.1', () => {
    console.error(`HTTP server listening on 127.0.0.1:${httpPort}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.error("Shutting down Mattermost MCP Server...");
    if (topicMonitor) {
      topicMonitor.stop();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
