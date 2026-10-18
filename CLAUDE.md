# quienNoCorre, para Claude

La tienda de la editorial **Quien no corre, vuela** (quiennocorrevuela.com),
hecha por meowrhino con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)). Se habla en
castellano. Cómo está hecha: [README.md](README.md); lo que edita Andrea:
[GUIA.md](GUIA.md).

**Es una tienda en marcha**: un push a `main` de la copia de Andrea
(`Quiennocorrevuela/ecommerce`) publica la tienda (Workers Builds, en su
Cloudflare). Nada de push ni de `wrangler d1 … --remote` sin que te lo pidan.

## Si el build falla (la tienda no se ha publicado)

Cuando falla, la tienda se queda como estaba. Para arreglarlo:

1. **El error**: la Action `revisar` abre un issue con la etiqueta `build` y el
   mensaje dentro: `gh issue list --label build` y `gh issue view <n>`. El
   registro entero: `gh run list -L 3` y `gh run view <id> --log-failed`. El de
   Cloudflare está en el panel de Andrea; no hace falta: el paso 2 da lo mismo.
2. **Reprodúcelo aquí**: `npm ci && node build/build.mjs`. Es el mismo build que
   en la nube y dice lo mismo: cada línea con ✗ trae el fichero y qué pasa.
3. **Arréglalo donde dice**, casi siempre en `products/<id>/product.json`,
   `authors/<id>/author.json` o `data/*.json`:
   - "no es un JSON válido, línea 12": una coma de más o de menos, o unas
     comillas sin cerrar, en esa línea o justo antes.
   - "no es un campo de aquí", "falta…", "no tiene la forma que toca": lo dice
     el esquema (`schema/<tipo>.json`); el mensaje lleva cómo va el campo.
   - "photos dice 7, pero no hay ningún img/7.webp": una foto que no está en
     `img/`. Pregunta si falta subirla; si no, quítala de `photos` y dilo.
   - "la lista … dice …, pero no hay ninguna carpeta": el nombre de
     `data/site.json` → `lists` y el de la carpeta no son iguales.
4. **Comprueba**: `node build/build.mjs` sin ✗ (los ⚠ no paran nada).

No cambies el build, las plantillas ni el esquema para que pase: si el dato
está bien y el build se queja, es un fallo del build, y hay que decírselo a
manu. No borres fotos ni fanzines, ni cambies el nombre de una carpeta ya
publicada (los pedidos y el stock van por él).

Commit y push solo cuando te lo pidan: mensaje en castellano diciendo qué se
arregla. Al pasar la revisión, la Action cierra el issue sola.
