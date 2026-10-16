/**
 * Après une mise en ligne, une page peut demander un fichier de code (/_next/static/…) pas encore disponible ou déjà
 * remplacé : ChunkLoadError, et le démarrage restait bloqué indéfiniment. Ce script (inline, avant React) recharge la
 * page, jusqu'à 3 fois espacées (0,4 s, 2,5 s, 6 s) le temps que le déploiement se propage ; jamais plus dans les 2 min.
 */
export function isChunkLoadFailure(message: string, name = "", scriptSrc = ""): boolean {
  if (name === "ChunkLoadError") return true;
  if (/Loading chunk|Failed to load chunk|ChunkLoadError|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i.test(message)) return true;
  return /\/_next\/static\//.test(scriptSrc);
}

export const CHUNK_RELOAD_KEY = "ethone:chunk-reload";
export const CHUNK_RELOAD_COOLDOWN_MS = 120_000;

export const CHUNK_RECOVERY_SCRIPT = `(function(){
var isChunk=${isChunkLoadFailure.toString()};
function recover(e){
  var r=e&&e.reason, t=e&&e.target;
  var msg=String((r&&(r.message||r))||(e&&e.message)||"");
  var name=(r&&r.name)||"";
  var src=(t&&t.tagName==="SCRIPT"&&t.src)||"";
  if(!isChunk(msg,name,src))return;
  var n=0;try{var st=JSON.parse(sessionStorage.getItem(${JSON.stringify(CHUNK_RELOAD_KEY)})||"{}");n=Date.now()-(st.t||0)<${CHUNK_RELOAD_COOLDOWN_MS}?(st.n||0):0;if(n>=3)return;sessionStorage.setItem(${JSON.stringify(CHUNK_RELOAD_KEY)},JSON.stringify({n:n+1,t:Date.now()}));}catch(_){}
  setTimeout(function(){location.reload();},[400,2500,6000][n]);
}
window.addEventListener("error",recover,true);
window.addEventListener("unhandledrejection",recover);
})();`;
