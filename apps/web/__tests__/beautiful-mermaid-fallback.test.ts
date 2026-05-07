import { describe, expect, it } from "vitest";
import {
  loadBeautifulMermaid,
  shouldUseClassicForBeautiful,
} from "@/lib/mermaid-client";

const COMPLEX_CROSS_SUBGRAPH_DIAGRAM = `flowchart TB
    subgraph CURRENT["Current deployment"]
        direction TB
        LOCAL[Local app]
        WORKER[Worker runtime]
        PROD[Production API]
        LOCAL -.cannot reach directly.-> WORKER
        WORKER ==>|requests| PROD
    end

    subgraph PROPOSED["Proposed routing"]
        direction TB

        subgraph CLIENT["Client"]
            WEB[Web app]
            GATEWAY[Gateway]
            API[Local API]
            WEB --> GATEWAY
            WEB --> API
        end

        subgraph TUNNEL["Stable tunnel"]
            EDGE[Tunnel URL]
        end

        subgraph SANDBOX["Sandbox"]
            RUNTIME[Runtime process]
        end

        GATEWAY --> RUNTIME
        RUNTIME --> EDGE
        EDGE --> API
    end

    subgraph STORAGE["Storage"]
        PROD_DB[Production database]
        DEV_DB[Development database]
    end

    API -.-> DEV_DB
    PROD -.-> PROD_DB`;

describe("shouldUseClassicForBeautiful", () => {
  it("falls back for flowcharts with subgraph direction overrides and multiple cross-subgraph edges", async () => {
    await loadBeautifulMermaid();

    expect(shouldUseClassicForBeautiful(COMPLEX_CROSS_SUBGRAPH_DIAGRAM)).toBe(true);
  });

  it("keeps simple directed subgraphs on the beautiful renderer", async () => {
    await loadBeautifulMermaid();

    expect(
      shouldUseClassicForBeautiful(`flowchart TB
        subgraph API["API"]
          direction TB
          A[Request] --> B[Response]
        end
        C[Client] --> A`),
    ).toBe(false);
  });
});
