import { pgTable, text, integer, timestamp, serial, index } from "drizzle-orm/pg-core";

export const diagrams = pgTable("diagrams", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled"),
  secret: text("secret").notNull(),
  currentVersion: integer("current_version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const versions = pgTable(
  "versions",
  {
    id: serial("id").primaryKey(),
    diagramId: text("diagram_id")
      .notNull()
      .references(() => diagrams.id),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_versions_diagram_version").on(table.diagramId, table.version)]
);
