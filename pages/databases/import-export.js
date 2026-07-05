/* ETHONE Database Builder — CSV/JSON import-export, schema-driven (generalizes pages/valorant-accounts/import-export.js). */

function dbExportableColumns(db){
  return dbVisibleColumns(db).filter(function(c){return c.type!=="relation"&&c.type!=="formula";});
}
function dbDownloadBlob(content,filename,mime){
  var blob=new Blob([content],{type:mime});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}
function dbCsvEscape(v){
  v=v==null?"":String(v);
  if(/[",\n]/.test(v))return '"'+v.replace(/"/g,'""')+'"';
  return v;
}
function dbToCSV(db,rows){
  var cols=dbExportableColumns(db);
  var header=cols.map(function(c){return c.label;}).join(",");
  var lines=rows.map(function(r){
    return cols.map(function(c){
      var v=r[c.key];
      if(Array.isArray(v))v=v.map(function(x){return dbOptionDef(db,c.key,x).label||x;}).join("|");
      else if(c.type==="select")v=v?dbOptionDef(db,c.key,v).label:"";
      return dbCsvEscape(v);
    }).join(",");
  });
  return [header].concat(lines).join("\r\n");
}
function dbParseCSV(text){
  var rows=[],row=[],field="",inQuotes=false;
  for(var i=0;i<text.length;i++){
    var c=text[i],n=text[i+1];
    if(inQuotes){
      if(c==='"'&&n==='"'){field+='"';i++;}
      else if(c==='"'){inQuotes=false;}
      else field+=c;
    }else{
      if(c==='"')inQuotes=true;
      else if(c===","){row.push(field);field="";}
      else if(c==="\r"){/* skip */}
      else if(c==="\n"){row.push(field);rows.push(row);row=[];field="";}
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(function(r){return r.length>1||r[0]!=="";});
}
function dbCSVToRows(db,text){
  var rows=dbParseCSV(text);
  if(!rows.length)return [];
  var header=rows[0].map(function(h){return h.trim();});
  var cols=dbExportableColumns(db);
  var byLabel={};cols.forEach(function(c){byLabel[c.label]=c;});
  return rows.slice(1).map(function(cells){
    var row=dbBlankRow(db);
    header.forEach(function(h,i){
      var col=byLabel[h];
      if(!col)return;
      var v=cells[i];
      if(v==null)return;
      if(col.type==="multiselect"||col.type==="tags")row[col.key]=v.split("|").map(function(s){return s.trim();}).filter(Boolean);
      else if(col.type==="checkbox")row[col.key]=/^(oui|yes|true|1)$/i.test(v.trim());
      else if(col.type==="genericNumber"||col.type==="progress"||col.type==="rating")row[col.key]=parseFloat(v)||0;
      else row[col.key]=v;
    });
    return row;
  });
}
function dbExportMenu(db,anchor){
  if(!anchor)return;
  dbOpenDropdown(anchor,{
    title:t("db_export"),searchable:false,
    items:[{value:"json",label:"Export JSON"},{value:"csv",label:"Export CSV (Excel / Sheets)"}],
    onChange:function(v){
      var rows=dbRows(db);
      if(!rows.length){toast("Aucune ligne à exporter","error");return;}
      var stamp=new Date().toISOString().slice(0,10);
      var slug=(db.name||"database").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||"database";
      if(v==="json")dbDownloadBlob(JSON.stringify({database:db,exportedAt:new Date().toISOString(),version:1},null,2),slug+"-"+stamp+".json","application/json");
      else dbDownloadBlob(dbToCSV(db,rows),slug+"-"+stamp+".csv","text/csv");
      toast("Export téléchargé","success");
    }
  });
}
function dbStartImport(db){
  var input=document.createElement("input");
  input.type="file";
  input.accept=".csv,.json,text/csv,application/json";
  input.style.display="none";
  document.body.appendChild(input);
  input.addEventListener("change",function(){dbImportFile(db,input);input.remove();});
  input.click();
}
function dbImportFile(db,inputEl){
  var file=inputEl.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var text=ev.target.result;
      var imported;
      if(file.name.toLowerCase().endsWith(".json")){
        var data=JSON.parse(text);
        var srcRows=(data.database&&Array.isArray(data.database.rows))?data.database.rows:(Array.isArray(data)?data:[]);
        imported=srcRows.map(function(r){
          var row=dbBlankRow(db);
          Object.keys(row).forEach(function(k){if(r[k]!==undefined)row[k]=r[k];});
          row.id=dbNewId();
          return row;
        });
      }else{
        imported=dbCSVToRows(db,text);
      }
      if(!imported.length){toast("Aucune ligne valide trouvée","error");return;}
      if(!confirm("Importer "+imported.length+" ligne(s) ? Elles seront ajoutées à la base existante."))return;
      var list=dbRows(db);
      imported.forEach(function(r){list.push(r);});
      dbTouch(db);saveStateNow();
      toast(imported.length+" ligne(s) importée(s)","success");
      dbRerenderView();
    }catch(err){
      toast("Fichier invalide : "+err.message,"error");
    }
  };
  reader.readAsText(file);
}
