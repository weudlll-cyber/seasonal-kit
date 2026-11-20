/**
 * @file   src/callSlot.test.ts
 * @brief  The reserved call-view slot: hidden without a call, and the contract's sizes in each
 *         form.
 *
 * Responsibility: no call id, or an invalid one, means no slot. With one: 338 × 190 on a
 *                 desktop, 267 × 150 in a window under 760 px high (759 is low, 760 is not),
 *                 48 × the strip's height collapsed, and on a phone the 48 px strip or the full
 *                 width at 16:9.
 * Depends on:     vitest
 */
import { describe, expect, it } from 'vitest';

import { callSlot, type CallSlotInput } from './callSlot.js';

const desktop: CallSlotInput = { callId: 7, phone: false, collapsed: false, windowHeight: 900 };

describe('the call slot', () => {
  it.each([null, 0, -3, 2.5, Number.NaN])('is hidden for the call id %s', (callId) => {
    expect(callSlot({ ...desktop, callId })).toBeNull();
    expect(callSlot({ ...desktop, callId, phone: true, collapsed: true })).toBeNull();
  });

  it('is 338 × 190 on a desktop', () => {
    expect(callSlot(desktop)).toEqual({
      form: 'picture',
      className: 'sk-call-slot',
      width: 338,
      height: 190,
    });
    expect(callSlot({ ...desktop, windowHeight: 760 })?.form).toBe('picture');
  });

  it('is 267 × 150 in a window under 760 px high', () => {
    expect(callSlot({ ...desktop, windowHeight: 759 })).toEqual({
      form: 'low',
      className: 'sk-call-slot',
      width: 267,
      height: 150,
    });
  });

  it('is 48 px wide at the strip’s height when collapsed', () => {
    const collapsed = { ...desktop, collapsed: true };
    expect(callSlot(collapsed)).toEqual({
      form: 'collapsed',
      className: 'sk-call-slot sk-call-slot--collapsed',
      width: 48,
      height: 190,
    });
    expect(callSlot({ ...collapsed, windowHeight: 700 })?.height).toBe(150);
  });

  it('is the 48 px strip on a phone, or the full width at 16:9 expanded', () => {
    const phone = { ...desktop, phone: true, windowHeight: 700 };
    expect(callSlot({ ...phone, collapsed: true })).toEqual({
      form: 'strip',
      className: 'sk-call-slot sk-call-slot--strip',
      width: null,
      height: 48,
    });
    expect(callSlot(phone)).toEqual({
      form: 'phone-picture',
      className: 'sk-call-slot sk-call-slot--phone',
      width: null,
      height: null,
    });
  });
});
