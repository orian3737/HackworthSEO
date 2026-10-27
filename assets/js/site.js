document.getElementById('yr').textContent = new Date().getFullYear();
(function(){
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(function(e){ io.observe(e); });
})();
(function(){
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;
  function setOpen(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('open', open);
  }
  btn.addEventListener('click', function(){ setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function(e){ if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setOpen(false); btn.focus(); }
  });
})();
