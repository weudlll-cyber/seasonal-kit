/**
 * @file   src/testing/standInContract.test.ts
 * @brief  Contract tests of the stand-in that need no server: the authorize route's origin rule
 *         and host right, and the frames' messages (K74).
 *
 * Responsibility: a state-changing original method needs the website's own origin, an admin may
 *                 always host (AUTH.md "Embedded games"; embeddedRoutes.js at cc743b9); every chat
 *                 and call message the stand-in's frames speak is one the kit's `parseChat` and
 *                 `parseCall` accept unchanged (EMBED.md, GAME-INTEGRATION.md §9), and a frame
 *                 page never posts to "*" or lets a room name break out of its script. The server
 *                 half is ./websiteStandIn.test.ts.
 * Depends on:     vitest
 * Source:         new in the kit.
 */
import { describe, expect, it } from 'vitest';

import { parseCall } from '../callView.js';
import { parseChat } from '../chatEmbed.js';
import { stepsFrom } from '../server/steps.js';
import { authorize } from './standInContract.js';
import { FRAME_MESSAGES, framePage } from './standInFrames.js';

describe('the authorize decision (AUTH.md "Embedded games")', () => {
  it("asks a state-changing method for the website's own origin", () => {
    const ask = (method: string, origin?: string) =>
      authorize(
        { method: 'GET', originalMethod: method, origin, siteOrigin: 'https://site.example' },
        null,
      ).status;
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(ask(method), method).toBe(403);
      expect(ask(method, 'https://evil.example')).toBe(403);
      expect(ask(method, 'https://site.example')).toBe(204);
    }
    expect([ask('HEAD'), ask('OPTIONS')]).toEqual([204, 204]);
  });

  it("gives an admin the right to host without a grant, and an empty step list as '[]'", () => {
    const answer = authorize(
      { method: 'GET', originalMethod: 'GET', origin: undefined, siteOrigin: 'x' },
      { id: 1, name: 'A', role: 'admin' },
    );
    expect(answer.headers['x-acting-user-can-host']).toBe('true');
    expect(stepsFrom(answer.headers['x-acting-user-steps'], 'all')).toEqual({
      steps: [],
      bad: false,
    });
  });
});

describe('the frames (EMBED.md and GAME-INTEGRATION.md §9)', () => {
  const { chat, call } = FRAME_MESSAGES;

  it("every chat message is one the kit's chat link accepts, unchanged", () => {
    for (const message of [chat.ready, chat.unread, chat.resize]) {
      expect(parseChat(message)).toEqual(message);
    }
    expect([chat.source, chat.host]).toEqual(['seasonal-chat', 'seasonal-chat-host']);
  });

  it("every call message is one the kit's call link accepts, unchanged", () => {
    for (const m of [call.ready, call.live, call.ended, call.speaking, call.resize, call.error]) {
      expect(parseCall(m)).toEqual(m);
    }
    expect([call.source, call.host]).toEqual(['seasonal-call', 'seasonal-call-host']);
  });

  it('never posts to "*" and cannot be broken out of by a room name', () => {
    const page = framePage('chat', { type: 'ready', room: '</script><script>x' });
    expect(page).not.toContain("'*'");
    expect(page).not.toContain('</script><script>x');
    expect(page.match(/<\/script>/g)).toHaveLength(1);
  });
});
