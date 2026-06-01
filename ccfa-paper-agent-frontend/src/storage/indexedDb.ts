import { openDB } from "idb";
import type { PaperProject } from "../types/project";

const DB_NAME = "ccfa-paper-agent-db";
const STORE_NAME = "app-state";
const STATE_KEY = "workspace";

type PersistedAppState = {
  projects: PaperProject[];
  activeProjectId?: string;
};

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  });
}

export async function loadAppState(): Promise<PersistedAppState> {
  const db = await getDb();
  const state = await db.get(STORE_NAME, STATE_KEY);
  return state ?? { projects: [], activeProjectId: undefined };
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, state, STATE_KEY);
}
