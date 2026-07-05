/* ETHONE Database Builder — Formula field type. Hand-rolled tokenizer + recursive-descent parser + evaluator.
   Never uses eval()/Function() on user input — zero external dependencies. */

function dbFormulaTokenize(src){
  var tokens=[];
  var re=/(\{[^}]*\})|(\d+\.?\d*)|("(?:[^"\\]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|>=|<=|[()+\-*\/,><])|(\s+)/g;
  var m,lastIndex=0;
  while((m=re.exec(src))){
    if(m.index!==lastIndex)throw new Error("caractère inattendu près de: "+src.slice(lastIndex,m.index+1));
    lastIndex=re.lastIndex;
    if(m[1])tokens.push({type:"colref",value:m[1].slice(1,-1)});
    else if(m[2])tokens.push({type:"number",value:parseFloat(m[2])});
    else if(m[3])tokens.push({type:"string",value:m[3].slice(1,-1).replace(/\\"/g,'"')});
    else if(m[4])tokens.push({type:"ident",value:m[4]});
    else if(m[5])tokens.push({type:"op",value:m[5]});
    /* m[6] whitespace: skipped */
  }
  if(lastIndex!==src.length)throw new Error("caractère inattendu en fin de formule");
  return tokens;
}
var DB_FORMULA_COMPARE_OPS=["==","!=",">","<",">=","<="];
function dbFormulaParse(tokens){
  var pos=0;
  function peek(){return tokens[pos];}
  function isOp(v){var t=peek();return !!t&&t.type==="op"&&t.value===v;}
  function expectOp(v){if(isOp(v)){pos++;return true;}return false;}
  function parseExpr(){return parseComparison();}
  function parseComparison(){
    var left=parseAdd();
    while(peek()&&peek().type==="op"&&DB_FORMULA_COMPARE_OPS.indexOf(peek().value)>-1){
      var op=tokens[pos++].value;
      left={type:"binary",op:op,left:left,right:parseAdd()};
    }
    return left;
  }
  function parseAdd(){
    var left=parseMul();
    while(isOp("+")||isOp("-")){
      var op=tokens[pos++].value;
      left={type:"binary",op:op,left:left,right:parseMul()};
    }
    return left;
  }
  function parseMul(){
    var left=parseUnary();
    while(isOp("*")||isOp("/")){
      var op=tokens[pos++].value;
      left={type:"binary",op:op,left:left,right:parseUnary()};
    }
    return left;
  }
  function parseUnary(){
    if(isOp("-")){pos++;return {type:"unary",op:"-",arg:parseUnary()};}
    return parsePrimary();
  }
  function parsePrimary(){
    var t=peek();
    if(!t)throw new Error("formule incomplète");
    if(t.type==="number"){pos++;return {type:"literal",value:t.value};}
    if(t.type==="string"){pos++;return {type:"literal",value:t.value};}
    if(t.type==="colref"){pos++;return {type:"colref",name:t.value};}
    if(t.type==="ident"){
      pos++;
      if(isOp("(")){
        pos++;
        var args=[];
        if(!isOp(")")){
          args.push(parseExpr());
          while(isOp(",")){pos++;args.push(parseExpr());}
        }
        if(!expectOp(")"))throw new Error("parenthèse fermante manquante");
        return {type:"call",name:t.value,args:args};
      }
      return {type:"literal",value:t.value};
    }
    if(isOp("(")){
      pos++;
      var inner=parseExpr();
      if(!expectOp(")"))throw new Error("parenthèse fermante manquante");
      return inner;
    }
    throw new Error("jeton inattendu dans la formule");
  }
  var ast=parseExpr();
  if(pos!==tokens.length)throw new Error("jetons superflus en fin de formule");
  return ast;
}
var DB_FORMULA_FUNCS={
  SUM:function(args){return args.reduce(function(a,b){return a+(parseFloat(b)||0);},0);},
  AVG:function(args){return args.length?DB_FORMULA_FUNCS.SUM(args)/args.length:0;},
  IF:function(args){return args[0]?args[1]:args[2];},
  CONCAT:function(args){return args.map(function(a){return a==null?"":String(a);}).join("");},
  ROUND:function(args){var n=parseFloat(args[0])||0,d=args[1]!=null?parseInt(args[1],10):0,f=Math.pow(10,d);return Math.round(n*f)/f;}
};
function dbFormulaEvalNode(node,db,row){
  switch(node.type){
    case "literal":return node.value;
    case "colref":{
      var col=dbColumns(db).find(function(c){return c.label===node.name||c.key===node.name;});
      if(!col)return null;
      if(col.type==="formula")return dbFormulaCompute(db,row,col,true);
      return row[col.key];
    }
    case "unary":{
      var v=dbFormulaEvalNode(node.arg,db,row);
      return node.op==="-"?-(parseFloat(v)||0):v;
    }
    case "binary":{
      var l=dbFormulaEvalNode(node.left,db,row),r=dbFormulaEvalNode(node.right,db,row);
      switch(node.op){
        case "+":return (typeof l==="number"&&typeof r==="number")?(l+r):(String(l==null?"":l)+String(r==null?"":r));
        case "-":return (parseFloat(l)||0)-(parseFloat(r)||0);
        case "*":return (parseFloat(l)||0)*(parseFloat(r)||0);
        case "/":var rv=parseFloat(r)||0;return rv===0?0:(parseFloat(l)||0)/rv;
        case "==":return l===r;
        case "!=":return l!==r;
        case ">":return (parseFloat(l)||0)>(parseFloat(r)||0);
        case "<":return (parseFloat(l)||0)<(parseFloat(r)||0);
        case ">=":return (parseFloat(l)||0)>=(parseFloat(r)||0);
        case "<=":return (parseFloat(l)||0)<=(parseFloat(r)||0);
      }
      return null;
    }
    case "call":{
      var fn=DB_FORMULA_FUNCS[String(node.name).toUpperCase()];
      if(!fn)throw new Error("fonction inconnue: "+node.name);
      return fn(node.args.map(function(a){return dbFormulaEvalNode(a,db,row);}));
    }
  }
  return null;
}
function dbFormulaCompute(db,row,col,raw){
  var result;
  try{
    if(!col.formula){result=null;}
    else{
      if(!col._parsedAst||col._parsedSrc!==col.formula){
        col._parsedAst=dbFormulaParse(dbFormulaTokenize(col.formula));
        col._parsedSrc=col.formula;
      }
      result=dbFormulaEvalNode(col._parsedAst,db,row);
    }
  }catch(err){
    return raw?"":"⚠ "+err.message;
  }
  if(raw)return result;
  if(result==null)return "—";
  if(typeof result==="boolean")return result?"Vrai":"Faux";
  if(typeof result==="number")return String(Math.round(result*100)/100);
  return String(result);
}
function dbFormulaCellHTML(db,row,col){
  return '<span class="db-cell-text db-cell-muted">'+dbEsc(dbFormulaCompute(db,row,col))+"</span>";
}
function dbOpenFormulaEditor(anchorEl,db,col,onDone){
  var panel=document.getElementById("db-formula-panel");
  if(!panel){panel=document.createElement("div");panel.id="db-formula-panel";document.body.appendChild(panel);}
  panel.className="db-dd-panel db-formula-panel";
  panel.innerHTML=
    '<div class="db-dd-title">Formule — '+dbEsc(col.label)+"</div>"+
    '<div style="padding:0 10px 10px">'+
      '<textarea id="db-formula-input" class="db-dp-edit-input" style="min-height:70px;width:100%" placeholder="'+dbEsc(t("db_formula_placeholder"))+'">'+dbEsc(col.formula||"")+"</textarea>"+
      '<div style="font-size:10.5px;color:var(--text-disabled);margin:6px 0">Colonnes : {Nom} — Fonctions : SUM, AVG, IF, CONCAT, ROUND</div>'+
      '<button type="button" class="db-addcol-create" id="db-formula-save">Enregistrer</button>'+
    "</div>";
  panel.style.visibility="hidden";
  panel.classList.add("open");
  var r=anchorEl.getBoundingClientRect();
  var pw=panel.offsetWidth||300;
  panel.style.left=Math.min(r.left,window.innerWidth-pw-10)+"px";
  panel.style.top=(r.bottom+6)+"px";
  panel.style.visibility="";
  var input=document.getElementById("db-formula-input");
  input.focus();
  input.addEventListener("keydown",function(e){e.stopPropagation();});
  document.getElementById("db-formula-save").addEventListener("click",function(){
    col.formula=input.value;
    delete col._parsedAst;
    dbTouch(db);saveStateNow();
    close();
    if(onDone)onDone();
  });
  function close(){panel.classList.remove("open");document.removeEventListener("mousedown",outsideHandler);}
  function outsideHandler(e){if(!panel.contains(e.target)&&e.target!==anchorEl)close();}
  setTimeout(function(){document.addEventListener("mousedown",outsideHandler);},0);
}
