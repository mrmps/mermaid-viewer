import { eq, asc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { diagrams, versions } from "./schema";

export async function createDiagram(opts: {
  content: string;
  title?: string;
}) {
  const id = nanoid(10);
  const editId = nanoid(10);
  const secret = nanoid(24);

  await db.insert(diagrams).values({
    id,
    editId,
    title: opts.title ?? "Untitled",
    secret,
    currentVersion: 1,
  });

  await db.insert(versions).values({
    diagramId: id,
    version: 1,
    content: opts.content,
  });

  return { id, editId, secret, version: 1 };
}

export async function addVersion(opts: {
  diagramId: string;
  secret?: string;
  editId?: string;
  content: string;
  title?: string;
}) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.diagramId),
  });

  if (!diagram) return { error: "not_found" as const };

  const authorized =
    (opts.secret && diagram.secret === opts.secret) ||
    (opts.editId && diagram.editId === opts.editId);

  if (!authorized) return { error: "unauthorized" as const };

  const newVersion = diagram.currentVersion + 1;

  await db.insert(versions).values({
    diagramId: opts.diagramId,
    version: newVersion,
    content: opts.content,
  });

  const updateFields: Record<string, unknown> = {
    currentVersion: newVersion,
    updatedAt: new Date(),
  };
  if (opts.title) updateFields.title = opts.title;

  await db
    .update(diagrams)
    .set(updateFields)
    .where(eq(diagrams.id, opts.diagramId));

  return { version: newVersion };
}

export async function getDiagram(opts: { id: string; version?: number }) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.id, opts.id),
  });

  if (!diagram) return null;

  const allVersions = await db.query.versions.findMany({
    where: eq(versions.diagramId, opts.id),
    orderBy: [asc(versions.version)],
  });

  const targetVersion = opts.version ?? diagram.currentVersion;
  const currentVersionData = allVersions.find((v) => v.version === targetVersion);

  if (!currentVersionData) return null;

  return {
    diagram,
    currentVersion: currentVersionData,
    allVersions,
  };
}

export async function getDiagramByEditId(opts: { editId: string; version?: number }) {
  const diagram = await db.query.diagrams.findFirst({
    where: eq(diagrams.editId, opts.editId),
  });

  if (!diagram) return null;

  const allVersions = await db.query.versions.findMany({
    where: eq(versions.diagramId, diagram.id),
    orderBy: [asc(versions.version)],
  });

  const targetVersion = opts.version ?? diagram.currentVersion;
  const currentVersionData = allVersions.find((v) => v.version === targetVersion);

  if (!currentVersionData) return null;

  return {
    diagram,
    currentVersion: currentVersionData,
    allVersions,
  };
}

export async function getDiagramCount() {
  const [result] = await db.select({ count: count() }).from(diagrams);
  return result.count;
}
