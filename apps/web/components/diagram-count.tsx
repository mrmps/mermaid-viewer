import { connection } from "next/server";
import { getDiagramCount } from "@mermaid-viewer/db";

export async function DiagramCount() {
  await connection();
  const count = await getDiagramCount();

  return (
    <p className="text-sm text-muted-foreground">
      <span className="tabular-nums font-medium text-foreground">
        {count.toLocaleString()}
      </span>{" "}
      diagram{count !== 1 ? "s" : ""} created
    </p>
  );
}
