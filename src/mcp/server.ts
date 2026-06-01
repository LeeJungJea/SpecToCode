import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { createParsedApiSpec } from '../utils/createParsedApiSpec.js';
import FRONTEND_GENERATORS from '../generators/frontendGenerators.js';
import BACKEND_GENERATORS from '../generators/backendGenerators.js';
import { ApiSpecInput, FrontendLanguage, BackendLanguage, BodyType, ResponseType, HttpMethod } from '../types/specToCode.js';

const app = express();
app.use(cors());

// Create MCP Server
const server = new McpServer({
  name: "SpecToCode",
  version: "1.0.0",
});

// Tool: list_languages
server.tool(
  "list_languages",
  "List available frontend and backend languages for code generation",
  {},
  async () => {
    return {
      content: [{ 
        type: "text", 
        text: `Frontend Languages:\n${Object.keys(FRONTEND_GENERATORS).join(', ')}\n\nBackend Languages:\n${Object.keys(BACKEND_GENERATORS).join(', ')}` 
      }]
    };
  }
);

// Tool: generate_code
server.tool(
  "generate_code",
  "Generate frontend and backend code based on API specifications",
  {
    url: z.string().describe("The URL of the API endpoint"),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE'] as const).describe("HTTP method"),
    bodyType: z.enum(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'graphql'] as const).describe("Body type"),
    headersJsonText: z.string().describe("JSON string representing headers"),
    queryParamsJsonText: z.string().describe("JSON string representing query parameters"),
    pathParamsJsonText: z.string().describe("JSON string representing path parameters"),
    bodyJsonText: z.string().describe("JSON string representing the request body"),
    responseJsonText: z.string().describe("JSON string representing the response"),
    responseType: z.enum(['json', 'text', 'blob', 'arrayBuffer'] as const).describe("Response data type"),
    frontendLanguage: z.string().describe("Frontend framework/language identifier (e.g. REACT_TYPESCRIPT)"),
    backendLanguage: z.string().describe("Backend framework/language identifier (e.g. JAVA_SPRING_BOOT)")
  },
  async (args) => {
    const input: ApiSpecInput = {
      url: args.url,
      method: args.method as HttpMethod,
      bodyType: args.bodyType as BodyType,
      headersJsonText: args.headersJsonText,
      queryParamsJsonText: args.queryParamsJsonText,
      pathParamsJsonText: args.pathParamsJsonText,
      bodyJsonText: args.bodyJsonText,
      responseJsonText: args.responseJsonText,
      responseType: args.responseType as ResponseType,
      frontendLanguage: args.frontendLanguage as FrontendLanguage,
      backendLanguage: args.backendLanguage as BackendLanguage
    };

    const parseResult = createParsedApiSpec(input);
    if (!parseResult.ok) {
      return {
        content: [{ type: "text", text: `Error parsing API Spec: ${JSON.stringify(parseResult.errors, null, 2)}` }],
        isError: true,
      };
    }

    const spec = parseResult.spec;
    const frontendGen = FRONTEND_GENERATORS[input.frontendLanguage];
    const backendGen = BACKEND_GENERATORS[input.backendLanguage];

    if (!frontendGen || !backendGen) {
      return {
        content: [{ type: "text", text: `Unsupported language selection. Provided Frontend: ${input.frontendLanguage}, Provided Backend: ${input.backendLanguage}` }],
        isError: true,
      };
    }

    try {
      const frontendTypes = frontendGen.generateTypes(spec);
      const fetchFunction = frontendGen.generateFetchFunction(spec);
      const requestDto = backendGen.generateRequestDto(spec);
      const responseDto = backendGen.generateResponseDto(spec);
      const controllerMethod = backendGen.generateControllerMethod(spec);

      const result = `=== Frontend (${input.frontendLanguage}) ===

--- Types ---
${frontendTypes}

--- Fetch Client ---
${fetchFunction}


=== Backend (${input.backendLanguage}) ===

--- Request DTO ---
${requestDto}

--- Response DTO ---
${responseDto}

--- Controller Method ---
${controllerMethod}
`;

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error generating code: ${e}` }],
        isError: true,
      };
    }
  }
);

// Map to store active SSE transports
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
  transports.set(transport.sessionId, transport);
  
  res.on('close', () => {
    transports.delete(transport.sessionId);
  });
});

app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }
  
  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SpecToCode MCP Server running on port ${PORT}`);
  console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message Endpoint: http://localhost:${PORT}/message`);
});
