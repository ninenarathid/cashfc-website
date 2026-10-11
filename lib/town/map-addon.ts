import type { ReactNode, RefObject } from 'react';
import type { Cam } from './camera';
import type { Keeper } from './keeper';
import type { Avatar, SessionOptions, TownSession } from './session';

export interface TownMapControls {
  zoom: (factor: number) => void;
  recenter: () => void;
  frame?: (stamp: number) => void;
}
export interface TownMapRuntime {
  session: TownSession | null;
  camera: RefObject<TownMapControls | null>;
  person: (x: number, y: number) => boolean;
  view: (cam: Cam, width: number, height: number) => void;
  avatar: (ctx: CanvasRenderingContext2D, avatar: Avatar, stamp: number, dpr: number) => void;
}
/** A map replaces the scenery; Town still owns its session, frame loop and complete UI. */
export interface TownMapAddon {
  mode: 'test' | 'live';
  /** Disable floor cast shadows in interiors that do not use them. */
  shadows?: boolean;
  keeper?: Keeper;
  terrain: NonNullable<SessionOptions['terrain']>;
  camera: RefObject<TownMapControls | null>;
  render: (runtime: TownMapRuntime) => ReactNode;
}
