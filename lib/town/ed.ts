/**
 * The map editor's town this page has (lib/town/town-map): the town of 2026-10-22 (lib/town/town2) or the city of
 * 2026-11-23 (lib/town/city). The two modules have the same names meaning the same things; whatever asks for the town
 * (lib/town/world, the scenery, the page) asks here, and is given the one the database's switch says.
 */
import * as town2 from "./town2";
import * as city from "./city";
import { CITY } from "./town-map";

/** The shape of an editor's town: every name town2 has (the city has each, with its own meaning for the city). */
export type EditorTown = typeof town2;
// (a check, made when this is compiled: the city has every name of the editor's town, of the same type)
const cityIsATown: EditorTown = city;
export const ed: EditorTown = CITY ? cityIsATown : town2;
