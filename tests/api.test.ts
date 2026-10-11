import { expect, test } from "bun:test";
import { getCurrentSeason, getPlayerRaids } from "../src/api/client";
import seasonFixture from "../src/mocks/season12.json";
import raidsIndexFixture from "../src/mocks/raids/04c08924fa7b41bf75f794ed371b9d3fd925b3ed7394ec95cf1d5897d0a2bcf6_index.json";

test("season12.json has exactly 25 entries", () => {
  expect(seasonFixture.leaderboard).toHaveLength(25);
});

test("season12.json entry[0] has more than 80 fields", () => {
  expect(Object.keys(seasonFixture.leaderboard[0]).length).toBeGreaterThan(80);
});

test("getCurrentSeason resolves with the fixture leaderboard length", async () => {
  const season = await getCurrentSeason();
  expect(season.leaderboard).toHaveLength(seasonFixture.leaderboard.length);
});

test("getPlayerRaids resolves to an index whose total_raids is a number", async () => {
  const index = await getPlayerRaids(raidsIndexFixture.player_id);
  expect(typeof index.total_raids).toBe("number");
});
