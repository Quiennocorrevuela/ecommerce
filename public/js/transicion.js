/* La transición entre páginas, la de la casa (JAMstack, patrones.md
   §6c): este archivo y css/transicion.css son iguales en todas las webs.
   Lo que se ve lo pone cada una (window.dibujo; aquí, js/ola.js).

   Al ir a otra página de la web, la pantalla se tapa, se cambia de
   página y la nueva se destapa cuando está lista: montada y con las
   fotos de la primera pantalla ya llegadas (como mucho WAIT). Lo que el
   dibujo necesita para seguir (colores, sentido) pasa a la página nueva
   por sessionStorage, y el <head> de esta la tapa antes de pintar
   (.tapada; build/paginas.mjs). Si la espera en blanco pasa de medio
   segundo, sale el loader, y si este script no llega, la página se
   destapa sola a los 5 s (css/transicion.css).

   Con atrás y adelante del navegador no se puede tapar antes de irse:
   la página nueva tapa una foto de la de antes (View Transitions, donde
   las hay; donde no, nace en blanco). Con prefers-reduced-motion, nada.

   El dibujo, window.dibujo, de un script que va antes que este; sin él,
   un fundido:

     datos(de, a, enlace)   lo que el dibujo necesita para ir de la URL
                            `de` a la `a`: `enlace` es el <a> pulsado, o
                            null con atrás y adelante (y `de`, null si no
                            se sabe de dónde se viene). Si trae `carga`,
                            es el color del loader
     tapar(datos)           tapa la pantalla (una promesa)
     destapar(datos)        la destapa (una promesa)

   Aquí también entran las fotos: cada una aparece cuando ha llegado. */

(() => {
  const root = document.documentElement;
  const KEY = 'transicion';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HOLD = 250;    // ms en blanco, como mínimo, entre tapar y destapar
  const WAIT = 2500;   // ms que se espera, como mucho, a que lo nuevo esté listo

  /* Si la web no tiene dibujo propio: un fundido al color del fondo. */
  function fundido() {
    const veil = document.createElement('div');
    veil.className = 'veil';
    veil.style.cssText = 'background:var(--bg,#fff);opacity:0';
    document.body.append(veil);
    const fade = (from, to) => veil.animate({ opacity: [from, to] }, { duration: 400, fill: 'forwards' }).finished;
    addEventListener('pageshow', (e) => { if (e.persisted) veil.getAnimations().forEach((a) => a.cancel()); });
    return { datos: () => ({}), tapar: () => fade(0, 1), destapar: () => fade(1, 0) };
  }

  const dibujo = window.dibujo || fundido();

  /* La página montada: los demás scripts (van detrás de este, con
     defer) han corrido cuando salta DOMContentLoaded. */
  const mounted = new Promise((done) => addEventListener('DOMContentLoaded', done, { once: true }));

  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  /* Lo que se espera en blanco: que la página esté montada y que hayan
     llegado las fotos que quedan a la vista; como mucho WAIT. Y luego
     HOLD, para que el blanco se vea entero. */
  async function ready() {
    await mounted;
    const seen = [...document.images].filter((img) => {
      if (img.complete) return false;
      const r = img.getBoundingClientRect();
      return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    const arrived = seen.map((img) => new Promise((done) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }));
    await Promise.race([Promise.all(arrived), wait(WAIT)]);
    await wait(HOLD);
  }

  async function uncover(datos) {
    await ready();
    root.classList.remove('tapada');
    await dibujo.destapar(datos);
  }

  /* Con atrás o adelante. Si el navegador ha dejado la foto de la página
     de antes (vt), el dibujo la tapa primero; luego se destapa como
     siempre. Si no, de blanco. */
  async function back(vt) {
    const from = window.navigation?.activation?.from?.url;
    const datos = dibujo.datos(from ? new URL(from) : null, new URL(location.href), null);
    if (vt) {
      await dibujo.tapar(datos);
      root.classList.remove('tapando');
      vt.ready.catch(() => {});   // saltarla rechaza ready: sin error en la consola
      vt.skipTransition();
    }
    uncover(datos);
  }

  /* Al llegar a una página tapada (el <head> pone .tapada): se destapa
     con lo que dejó la de antes. */
  async function arrive() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch { /* nada */ }
    if (!root.classList.contains('tapada')) return;
    if (!pending) { back(await window.revelada); return; }
    uncover(pending);
  }

  /* Los enlaces a otra página de la web: se tapa, se apunta lo que falta
     y se va. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const to = new URL(a.href, location.href);
    if (to.origin !== location.origin) return;
    if (to.pathname === location.pathname && to.search === location.search) return;
    e.preventDefault();
    const datos = dibujo.datos(new URL(location.href), to, a);
    dibujo.tapar(datos).then(() => {
      /* tapada, a esperar la página nueva: si tarda, sale el loader */
      if (datos.carga) root.style.setProperty('--carga', datos.carga);
      root.classList.add('cargando');
      try {
        sessionStorage.setItem(KEY, JSON.stringify(datos));
      } catch { /* sin él, se destapa igual, como con atrás */ }
      location.href = to.href;
    });
  });

  /* Volver con atrás o adelante a una página que el navegador guardó tal
     cual: igual, pero el <head> no vuelve a correr. */
  addEventListener('pageshow', (e) => {
    root.classList.remove('cargando');   // se volvió a esta antes de irse del todo
    if (!e.persisted || still) return;
    root.classList.add('tapada', 'tapando');
    if (!('onpagereveal' in window)) { root.classList.remove('tapando'); back(null); return; }
    addEventListener('pagereveal', (r) => {
      if (!r.viewTransition) root.classList.remove('tapando');
      back(r.viewTransition);
    }, { once: true });
  });

  arrive();

  /* Y las fotos de la página: cada una aparece cuando ha llegado (.ok;
     el fundido, en el CSS de la web). Las que fallen, también: mejor el
     hueco que nada. */
  for (const img of document.images) {
    if (img.complete) img.classList.add('ok');
    else for (const type of ['load', 'error']) img.addEventListener(type, () => img.classList.add('ok'), { once: true });
  }
})();
