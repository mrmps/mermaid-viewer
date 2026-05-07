export { db } from "./client";
export { boards, diagrams, versions } from "./schema";
export type { StoredBoardItem, StoredBoardPage, StoredBoardState } from "./schema";
export {
  createDiagram,
  createBoard,
  addVersion,
  addDiagramToBoard,
  updateTitle,
  updateBoard,
  deleteDiagram,
  getDiagram,
  getDiagramByEditId,
  getBoard,
  getBoardByEditId,
  getDiagramCount,
  getRecentDiagrams,
  getRecentDiagramsWithContent,
} from "./queries";
export type { EnrichedBoardItem, EnrichedBoardState } from "./queries";
