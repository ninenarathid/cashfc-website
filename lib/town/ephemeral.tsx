"use client";
import {createContext,useContext} from 'react';

/** TEST descendants change only their own state, never real character device records. */
export const TownEphemeral = createContext(false);
export const useTownEphemeral = () => useContext(TownEphemeral);
