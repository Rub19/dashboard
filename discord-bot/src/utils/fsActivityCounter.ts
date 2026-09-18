import fs from 'fs';
import { BotTelemetryService } from '../modules/botControl/services/botTelemetryService.js';

// This bot persists everything as JSON files via fs.readFileSync/writeFileSync
// (there is no SQL/Mongo layer) — the Bot Control Performance tab's
// "dbQueriesPerMinute" is really a file-I/O-per-minute count. Instrumenting
// each of the ~30 storage classes individually to report their own reads/
// writes would be a large, invasive refactor; patching the two sync fs
// entry points they all funnel through gets a real, live count with one
// narrow, behavior-preserving wrapper instead.
//
// This module has a side effect on import (no exported install function) so
// that simply being index.ts's first import guarantees the patch is in
// place before any storage singleton's module-level constructor — which
// reads/writes its data file immediately — gets a chance to run.
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;

fs.readFileSync = ((...args: Parameters<typeof fs.readFileSync>) => {
  BotTelemetryService.getInstance().incrementDbQueryCount();
  return originalReadFileSync(...args);
}) as typeof fs.readFileSync;

fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
  BotTelemetryService.getInstance().incrementDbQueryCount();
  return originalWriteFileSync(...args);
}) as typeof fs.writeFileSync;
