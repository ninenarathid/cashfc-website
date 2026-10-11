"use client";
import {createContext, useContext, type ReactNode} from 'react';
/** A map may add a compartment to the existing bag, without changing its purse. */
export const TownMapBag = createContext<ReactNode | null>(null);
export const useMapBag = () => useContext(TownMapBag);
