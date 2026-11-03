import assert from "node:assert/strict";
import { test } from "node:test";

import { selectFeaturedRepos } from "./update-featured-projects.mjs";

function repo(fullName, overrides = {}) {
  const [owner, name] = fullName.split("/");
  return {
    full_name: fullName,
    name,
    owner: { login: owner },
    description: `${name} description`,
    html_url: `https://github.com/${fullName}`,
    updated_at: new Date().toISOString(),
    stargazers_count: 0,
    fork: false,
    archived: false,
    private: false,
    ...overrides,
  };
}

const names = (repos) => repos.map((r) => r.full_name);

test("excludes .github repos for every owner, in any case", () => {
  const selected = selectFeaturedRepos([
    repo("forjd/.github"),
    repo("danjdewhurst/.GitHub"),
    repo("forjd/agenthint"),
  ]);

  assert.deepEqual(names(selected), ["forjd/agenthint"]);
});

test("excludes the profile repo, in any case", () => {
  const selected = selectFeaturedRepos([
    repo("DanJDewhurst/DanJDewhurst"),
    repo("danjdewhurst/notes"),
  ]);

  assert.deepEqual(names(selected), ["danjdewhurst/notes"]);
});

test("excludes forks, archived, private and undescribed repos", () => {
  const selected = selectFeaturedRepos([
    repo("forjd/fork", { fork: true }),
    repo("forjd/archived", { archived: true }),
    repo("forjd/private", { private: true }),
    repo("forjd/blank", { description: null }),
    repo("forjd/kept"),
  ]);

  assert.deepEqual(names(selected), ["forjd/kept"]);
});

test("puts pinned repos first, then forjd, then personal, capped at 6", () => {
  const selected = selectFeaturedRepos([
    repo("danjdewhurst/personal", { stargazers_count: 100 }),
    ...Array.from({ length: 6 }, (_, i) => repo(`forjd/tool-${i}`, { stargazers_count: 6 - i })),
    repo("danjdewhurst/story-skills"),
  ]);

  assert.equal(selected.length, 6);
  assert.equal(selected[0].full_name, "danjdewhurst/story-skills");
  assert.deepEqual(names(selected.slice(1)), [
    "forjd/tool-0",
    "forjd/tool-1",
    "forjd/tool-2",
    "forjd/tool-3",
    "forjd/tool-4",
  ]);
});
