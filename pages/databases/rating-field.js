/* ETHONE Database Builder — Rating field type (N clickable stars, no popup). */

function dbRatingCellHTML(db,row,col){
  var max=col.maxStars||5;
  var val=parseInt(row[col.key],10)||0;
  var html='<span class="db-rating-cell" data-col="'+col.key+'">';
  for(var i=1;i<=max;i++){
    html+='<span class="db-star'+(i<=val?" filled":"")+'" data-star="'+i+'">★</span>';
  }
  html+="</span>";
  return html;
}
function dbWireRatingClicks(cellEl,db,row,col,onChange){
  cellEl.querySelectorAll(".db-star").forEach(function(star){
    star.addEventListener("click",function(e){
      e.stopPropagation();
      var val=parseInt(star.dataset.star,10);
      var current=parseInt(row[col.key],10)||0;
      dbSetField(db,row,col.key,current===val?0:val);
      if(onChange)onChange();
    });
  });
}
