/**
 * pages/home.js — la tienda. Las tarjetas vienen en el HTML; aquí se marcan las agotadas.
 */
import { mountLayout } from "../core/layout.js";
import { marcarAgotados } from "../core/data.js";

mountLayout();
marcarAgotados();
