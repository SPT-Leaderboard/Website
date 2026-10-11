import { expect, test } from "bun:test";
import { getGlobalPlayers } from "../src/api/global";
import globalPlayersFixture from "../src/mocks/global-players.json";

test("global-players.json has exactly 25 rows (one per season12 entry)", () => {
  expect(globalPlayersFixture).toHaveLength(25);
});

test("every global player row carries the full field set with correct types", () => {
  for (const player of globalPlayersFixture) {
    expect(typeof player.id).toBe("string");
    expect(typeof player.name).toBe("string");
    expect(typeof player.permaLink).toBe("string");
    expect(typeof player.teamTag).toBe("string");
    expect(typeof player.avatar).toBe("string");
    expect(typeof player.lastSeen).toBe("number");
    expect(typeof player.pmcKills).toBe("number");
    expect(typeof player.scavKills).toBe("number");
    expect(typeof player.bossesKilled).toBe("number");
    expect(typeof player.totalRaids).toBe("number");
    expect(typeof player.survived).toBe("number");
    expect(typeof player.totalPlayTime).toBe("number");
    expect(typeof player.totalProfit).toBe("number");
  }
});

test("global-players.json ids are unique", () => {
  const ids = globalPlayersFixture.map((player) => player.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("getGlobalPlayers resolves to the fixture row count", async () => {
  const players = await getGlobalPlayers();
  expect(players).toHaveLength(globalPlayersFixture.length);
});
