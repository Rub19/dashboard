import { createActionFacade } from "../v8/core/actions.mjs";
import { COMMANDS } from "../v8/command/catalog.mjs";

const actions = createActionFacade();
console.log("=== CATALOG ACTIONS THAT ARE NOT AVAILABLE / UNREGISTERED ===");
for (const item of COMMANDS) {
  const res = actions.dispatch(item.actionId);
  if (!res.ok) {
    console.log(`[${item.actionId}] (${item.label}): ${res.status} - ${res.message}`);
  }
}
