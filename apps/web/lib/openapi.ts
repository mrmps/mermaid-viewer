import {
  OpenApiBuilder,
  type SchemaObject,
} from "openapi3-ts/oas31";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://merm.sh";

const DiagramResponse: SchemaObject = {
  type: "object",
  required: ["id", "title", "version", "content", "createdAt", "versions", "skill"],
  properties: {
    id: { type: "string", example: "abc123" },
    title: { type: "string", example: "My Diagram" },
    version: { type: "integer", example: 1 },
    content: { type: "string", example: "graph TD; A-->B" },
    createdAt: { type: "string", format: "date-time" },
    versions: {
      type: "array",
      items: {
        type: "object",
        required: ["version", "content", "createdAt"],
        properties: {
          version: { type: "integer" },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    skill: { type: "string", format: "uri" },
  },
};

const CreateResponse: SchemaObject = {
  type: "object",
  required: ["id", "editId", "url", "editUrl", "secret", "version", "skill"],
  properties: {
    id: { type: "string", example: "abc123" },
    editId: { type: "string", example: "edit_xyz" },
    url: { type: "string", format: "uri", example: `${BASE_URL}/d/abc123` },
    editUrl: { type: "string", format: "uri", example: `${BASE_URL}/e/edit_xyz` },
    secret: { type: "string", example: "sk_..." },
    version: { type: "integer", example: 1 },
    skill: { type: "string", format: "uri" },
  },
};

const UpdateResponse: SchemaObject = {
  type: "object",
  required: ["id", "url", "version", "skill"],
  properties: {
    id: { type: "string" },
    url: { type: "string", format: "uri" },
    version: { type: "integer" },
    skill: { type: "string", format: "uri" },
  },
};

const DeleteResponse: SchemaObject = {
  type: "object",
  required: ["id", "deleted"],
  properties: {
    id: { type: "string" },
    deleted: { type: "boolean", example: true },
  },
};

const ErrorResponse: SchemaObject = {
  type: "object",
  required: ["error", "message"],
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

export function buildOpenAPISpec() {
  return new OpenApiBuilder()
    .addInfo({
      title: "merm.sh",
      version: "1.0.0",
      description:
        "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call with full version history.",
    })
    .addServer({ url: BASE_URL })
    .addPath("/api/d", {
      post: {
        operationId: "createDiagram",
        summary: "Create a new diagram",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    description: "Mermaid diagram content",
                    example: "graph TD; A-->B",
                  },
                  title: {
                    type: "string",
                    description: "Optional diagram title",
                    example: "My Diagram",
                  },
                },
              },
            },
            "text/plain": {
              schema: {
                type: "string",
                description: "Raw Mermaid diagram content",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Diagram created",
            content: { "application/json": { schema: CreateResponse } },
          },
          "400": {
            description: "Missing content",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    })
    .addPath("/api/d/{id}", {
      get: {
        operationId: "getDiagram",
        summary: "Get diagram JSON with full version history",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "v",
            in: "query",
            required: false,
            description: "Specific version number to fetch. Omit to get the latest. The versions array always includes all versions regardless.",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Diagram data",
            content: { "application/json": { schema: DiagramResponse } },
          },
          "404": {
            description: "Diagram not found",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
      put: {
        operationId: "updateDiagram",
        summary: "Update diagram with a new version",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    description: "Updated Mermaid diagram content",
                  },
                  secret: {
                    type: "string",
                    description:
                      "Edit secret (alternative to Authorization header)",
                  },
                  editId: {
                    type: "string",
                    description:
                      "Edit ID (alternative to secret for authorization)",
                  },
                  title: {
                    type: "string",
                    description: "Updated diagram title",
                  },
                },
              },
            },
            "text/plain": {
              schema: {
                type: "string",
                description: "Raw Mermaid diagram content",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Version created",
            content: { "application/json": { schema: UpdateResponse } },
          },
          "400": {
            description: "Missing content",
            content: { "application/json": { schema: ErrorResponse } },
          },
          "401": {
            description: "Missing or invalid secret",
            content: { "application/json": { schema: ErrorResponse } },
          },
          "404": {
            description: "Diagram not found",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
      delete: {
        operationId: "deleteDiagram",
        summary: "Delete a diagram",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  secret: {
                    type: "string",
                    description:
                      "Edit secret (alternative to Authorization header)",
                  },
                  editId: {
                    type: "string",
                    description:
                      "Edit ID (alternative to secret for authorization)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Diagram deleted",
            content: { "application/json": { schema: DeleteResponse } },
          },
          "401": {
            description: "Missing or invalid secret",
            content: { "application/json": { schema: ErrorResponse } },
          },
          "404": {
            description: "Diagram not found",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    })
    .addPath("/api/d/{id}/skill", {
      get: {
        operationId: "getDiagramSkill",
        summary: "Get per-diagram SKILL.md",
        description:
          "Returns a Markdown skill file for this diagram that other agents can use to read or contribute.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "secret",
            in: "query",
            required: false,
            description: "Edit secret — includes write instructions in the skill if valid",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Skill markdown",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
          "401": {
            description: "Invalid secret",
            content: { "application/json": { schema: ErrorResponse } },
          },
          "404": {
            description: "Diagram not found",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    })
    .addPath("/api/skill", {
      get: {
        operationId: "getGlobalSkill",
        summary: "Get global SKILL.md",
        description:
          "Returns the global skill file with setup instructions for adding merm.sh to any agent.",
        responses: {
          "200": {
            description: "Skill markdown",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
        },
      },
    })
    .addSecurityScheme("bearerAuth", {
      type: "http",
      scheme: "bearer",
      description: "The edit secret returned when creating a diagram",
    })
    .rootDoc;
}
