/* V13.3: intro dot timing, Apply button + "Mark as applied?" prompt */
(function(){
/* #4: randomise blink period (1.2–2s) and delay so the dots never blink in sync */
document.querySelectorAll('#intro .dot').forEach(d=>{d.style.setProperty('--bd',(1.2+Math.random()*.8).toFixed(2)+'s');d.style.setProperty('--bdl',(-Math.random()*2).toFixed(2)+'s')});
})();
