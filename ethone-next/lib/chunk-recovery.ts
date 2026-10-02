/**
 * Après une mise en ligne, une page peut demander un fichier de code (/_next/static/…) pas encore disponible ou déjà
 * remplacé : ChunkLoadError, et le démarrage restait bloqué indéfiniment. Ce script (inline, avant React) recharge la
 * page une fois ; au plus une tentative toutes les 30 s pour ne jamais boucler.
 */
export function isChunkLoadFailure(message: string, name = "", scriptSrc = ""): boolean {
  if (name === "ChunkLoadError") return true;
  if (/Loading chunk|Failed to load chunk|ChunkLoadError|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i.test(message)) return true;
  return /\/_next\/static\//.test(scriptSrc);
}

export const CHUNK_RELOAD_KEY = "ethone:chunk-reload";
export const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

export const CHUNK_RECOVERY_SCRIPT = `(function(){
var isChunk=${isChunkLoadFailure.toString()};
function recover(e){
  var r=e&&e.reason, t=e&&e.target;
  var msg=String((r&&(r.message||r))||(e&&e.message)||"");
  var name=(r&&r.name)||"";
  var src=(t&&t.tagName==="SCRIPT"&&t.src)||"";
  if(!isChunk(msg,name,src))return;
  try{var last=+sessionStorage.getItem(${JSON.stringify(CHUNK_RELOAD_KEY)})||0;if(Date.now()-last<${CHUNK_RELOAD_COOLDOWN_MS})return;sessionStorage.setItem(${JSON.stringify(CHUNK_RELOAD_KEY)},String(Date.now()));}catch(_){}
  setTimeout(function(){location.reload();},400);
}
window.addEventListener("error",recover,true);
window.addEventListener("unhandledrejection",recover);
})();`;
