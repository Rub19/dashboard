/* Extracted from index.html. Preserve global contracts and load order. */
(function(){
        var tl=document.getElementById('tab-login');
        var tr=document.getElementById('tab-register');
        if(tl){
          tl.classList.add('is-active');
          tl.setAttribute('aria-selected','true');
        }
        if(tr){
          tr.classList.remove('is-active');
          tr.setAttribute('aria-selected','false');
        }
      })();
