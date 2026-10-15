/**
 * pages/autor.js — una autora. Su bio y sus fanzines vienen en el HTML; aquí se marcan los agotados.
 */
import { mountLayout } from "../core/layout.js";
import { marcarAgotados } from "../core/data.js";

mountLayout();
marcarAgotados();
