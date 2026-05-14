import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type StoredBoardItemKind =
  | "diagram"
  | "website"
  | "slides"
  | "markdown"
  | "image"
  | "text"
  | "drawing";

export type StoredBoardSlide = {
  eyebrow?: string;
  title: string;
  body?: string;
  bullets?: string[];
  accent?: string;
};

export type StoredBoardItem = {
  id: string;
  kind?: StoredBoardItemKind;
  diagramId?: string;
  diagramEditId?: string;
  title?: string;
  content?: string;
  href?: string;
  editHref?: string;
  version?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  renderer?: "beautiful" | "mermaid";
  theme?: string;
  look?: "classic" | "handDrawn" | "neo";
  url?: string;
  imageUrl?: string;
  accent?: string;
  author?: string;
  slides?: StoredBoardSlide[];
  updatedAt?: string;
};

export type StoredBoardPage = {
  id: string;
  name: string;
  items: StoredBoardItem[];
};

export type StoredBoardState = {
  version: 1;
  activePageId: string;
  pages: StoredBoardPage[];
};

export const diagrams = pgTable("diagrams", {
  id: text("id").primaryKey(),
  editId: text("edit_id").notNull().unique(),
  title: text("title").notNull().default("Untitled"),
  secret: text("secret").notNull(),
  primaryBoardId: text("primary_board_id"),
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

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  editId: text("edit_id").notNull().unique(),
  title: text("title").notNull().default("Untitled workspace"),
  secret: text("secret").notNull(),
  state: jsonb("state").$type<StoredBoardState>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
