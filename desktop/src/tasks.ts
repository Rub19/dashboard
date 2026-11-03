import { EthoneItem, EthoneItemInput, itemsDelete, itemsList, restCall } from "./api";
import { itemToTaskRow, TaskRow, taskRowToItem } from "./productivity";

let absorbing: Promise<void> | null = null;

function absorbOldTasks() {
  absorbing ??= (async () => {
    const old = await itemsList("tasks").catch(() => [] as EthoneItem[]);
    for (const item of old) {
      await restCall("tasks", "POST", itemToTaskRow(item), "return=minimal");
      await itemsDelete("tasks", item.id);
    }
  })().finally(() => {
    absorbing = null;
  });
  return absorbing;
}

export async function tasksList(): Promise<EthoneItem[]> {
  await absorbOldTasks();
  return (await restCall<TaskRow[]>("tasks?select=*&order=updated_at.desc")).map(taskRowToItem);
}

export const tasksCreate = (input: EthoneItemInput) => restCall("tasks", "POST", itemToTaskRow(input), "return=minimal");
export const tasksUpdate = (id: string, input: EthoneItemInput) => restCall(`tasks?id=eq.${id}`, "PATCH", { ...itemToTaskRow(input), updated_at: new Date().toISOString() }, "return=minimal");
export const tasksDelete = (id: string) => restCall(`tasks?id=eq.${id}`, "DELETE", undefined, "return=minimal");
