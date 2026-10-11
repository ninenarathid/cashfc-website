import type { ElementAction } from '@/lib/town/element-action';

export type ElementOrigin = 'stage' | 'world';
type Listener = (look: ElementAction, origin: ElementOrigin) => void;
const listeners = new Set<Listener>();
/** Actual equipment-use pulses only; idle glows never produce sound or traffic. */
export function announceElementAction(look: ElementAction, origin: ElementOrigin = 'stage') {
  for (const listener of listeners) listener(look, origin);
}
export function onElementAction(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
