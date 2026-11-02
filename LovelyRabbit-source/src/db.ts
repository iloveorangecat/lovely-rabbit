import Dexie, { type Table } from "dexie";
import {
  fillPlans,
  migrateDefaultTasks,
  initialState,
  validateState,
  type State,
} from "./model";
export class QuestDB extends Dexie {
  states!: Table<{ id: string; data: State }, string>;
  constructor(name = "beauty-quest") {
    super(name);
    this.version(1).stores({ states: "id" });
  }
}
export const db = new QuestDB();
export async function loadState() {
  return db.transaction("rw", db.states, async () => {
    const row = await db.states.get("main");
    if (row) {
      const data = validateState(row.data);
      fillPlans(data);
      migrateDefaultTasks(data);
      await db.states.put({ id: "main", data });
      return data;
    }
    const data = initialState();
    fillPlans(data);
    await db.states.put({ id: "main", data });
    return data;
  });
}
export async function mutate(fn: (s: State) => void) {
  return db.transaction("rw", db.states, async () => {
    const row = await db.states.get("main");
    if (!row) throw new Error("数据尚未初始化");
    const data = structuredClone(row.data);
    fn(data);
    const checked = validateState(data);
    await db.states.put({ id: "main", data: checked });
    return checked;
  });
}
export async function restore(data: State) {
  const checked = validateState(data);
  await db.states.put({ id: "main", data: checked });
  return checked;
}
