import { describe, expect, it, vi } from 'vitest';
import { TownSession } from './session';
import { readElementAction } from './element-action';
import { ELEMENTS } from './tools';
import { announceElementAction, onElementAction } from '../../components/town/element-action-events';

function stay() {
  const other = { info: { id: 'B' }, pos: { x: 30, y: 31 }, placed: true };
  return Object.assign(Object.create(TownSession.prototype), {
    closed: false, self: { pos: { x: 30, y: 30 } },
    avatars: new Map([['B', other]]), listed: new Set(['B']),
    current: { effect: vi.fn() }, onElement: vi.fn(), elementSentAt: -Infinity,
  });
}
describe('cosmetic elemental use across the room', () => {
  it('accepts only one or two known elements and canonicalizes socket order', () => {
    for (const element of ELEMENTS) expect(readElementAction(element)?.elements).toEqual([element]);
    expect(readElementAction('ice:fire')).toEqual(readElementAction('fire:ice'));
    expect(readElementAction('fire:fire')?.doubled).toBe(true);
    for (const raw of [null, {}, 1, '', 'fire:', 'fire:ice:water', 'bogus', 'fire'.repeat(30)]) expect(readElementAction(raw)).toBeNull();
  });
  it('sends compact keys with no purse data, bounds rapid hits and slows crowded rooms', () => {
    const s = stay(), now = vi.spyOn(performance, 'now').mockReturnValue(0);
    s.element(readElementAction('ice:fire')!);
    for (let i = 0; i < 30; i++) s.element(readElementAction('fire')!);
    expect(s.current.effect).toHaveBeenCalledExactlyOnceWith('fire:ice');
    now.mockReturnValue(1000); s.element(readElementAction('water')!);
    expect(s.current.effect).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 50; i++) s.avatars.set(`${i}`, {});
    now.mockReturnValue(2000); s.element(readElementAction('dark')!);
    expect(s.current.effect).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
  it('delivers to a nearby listed player, throttles floods, expires the sender after leaving', () => {
    const s = stay(), now = vi.spyOn(performance, 'now').mockReturnValue(0);
    s.heardElement('B', 'water:fire');
    expect(s.onElement).toHaveBeenCalledExactlyOnceWith(s.avatars.get('B'), readElementAction('fire:water'));
    for (let i = 0; i < 30; i++) s.heardElement('B', 'ice');
    expect(s.onElement).toHaveBeenCalledTimes(1);
    now.mockReturnValue(900); s.heardElement('B', 'ice');
    expect(s.onElement).toHaveBeenCalledTimes(2);
    s.listed.clear(); now.mockReturnValue(2000); s.heardElement('B', 'fire');
    expect(s.onElement).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
  it('ignores unknown, malformed, departed, distant and unplaced senders', () => {
    const s = stay(), a = s.avatars.get('B');
    s.heardElement('stranger', 'fire'); s.heardElement('B', 'fire:ice:dark');
    a.byeAt = 1; s.heardElement('B', 'fire'); delete a.byeAt;
    a.goneAt = 1; s.heardElement('B', 'fire'); delete a.goneAt;
    a.placed = false; s.heardElement('B', 'fire'); a.placed = true;
    a.pos = { x: 80, y: 80 }; s.heardElement('B', 'fire');
    expect(s.onElement).not.toHaveBeenCalled();
  });
  it('unmounting removes listeners, and world pulses retain their origin', () => {
    const fn = vi.fn(), stop = onElementAction(fn), look = readElementAction('ice')!;
    announceElementAction(look, 'world'); expect(fn).toHaveBeenCalledExactlyOnceWith(look, 'world');
    stop(); announceElementAction(look); expect(fn).toHaveBeenCalledTimes(1);
  });
});
