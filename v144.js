/* V14.4: the tutorial is removed; clear its old keys. V14.5: card and panel grade links and the per-posting feedback view are removed. */
(function(){
try{['ir_tour_done','tour_done','ir_tour'].forEach(k=>{localStorage.removeItem(k)});Object.keys(localStorage).filter(k=>/^ir_tour/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
document.getElementById('tour')?.remove();document.getElementById('uiTour')?.remove();
})();
