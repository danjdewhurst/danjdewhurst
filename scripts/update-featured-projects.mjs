import { readFile, writeFile } from "node:fs/promises";

const README_PATH = new URL("../README.md", import.meta.url);
const START = "<!-- featured-projects:start -->";
const END = "<!-- featured-projects:end -->";
const OWNERS = ["forjd", "danjdewhurst"];
const MAX_PROJECTS = 6;
const EXCLUDED_REPOS = new Set(["danjdewhurst/danjdewhurst"]);

const token = process.env.GITHUB_TOKEN;

async function github(path) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} for ${path}`);
  }

  return response.json();
}

async function fetchRepos(owner) {
  const isOrg = owner === "forjd";
  const path = isOrg
    ? `orgs/${owner}/repos?type=public&sort=updated&per_page=100`
    : `users/${owner}/repos?type=public&sort=updated&per_page=100`;

  return github(path);
}

function repoScore(repo) {
  const updatedAt = new Date(repo.updated_at).getTime();
  const daysSinceUpdate = Math.max(1, (Date.now() - updatedAt) / 86_400_000);
  const recencyScore = 100 / daysSinceUpdate;
  const starScore = repo.stargazers_count * 5;
  const orgBoost = repo.owner.login.toLowerCase() === "forjd" ? 25 : 0;

  return orgBoost + recencyScore + starScore;
}

function cleanDescription(description) {
  return (description || "Open source project")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[|]/g, "-")
    .replace(/[\u2013\u2014]/g, "-");
}

function renderProjects(repos) {
  return repos
    .map((repo) => {
      const description = cleanDescription(repo.description);
      return `- [\`${repo.full_name}\`](${repo.html_url}) - ${description}`;
    })
    .join("\n");
}

function replaceFeaturedProjects(readme, projectsMarkdown) {
  const startIndex = readme.indexOf(START);
  const endIndex = readme.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`README.md must contain ${START} and ${END} markers`);
  }

  return [
    readme.slice(0, startIndex + START.length),
    "\n",
    projectsMarkdown,
    "\n",
    readme.slice(endIndex),
  ].join("");
}

const ownerRepos = await Promise.all(OWNERS.map(fetchRepos));
const candidateRepos = ownerRepos
  .flat()
  .filter((repo) => !repo.fork)
  .filter((repo) => !repo.archived)
  .filter((repo) => !repo.private)
  .filter((repo) => !EXCLUDED_REPOS.has(repo.full_name))
  .filter((repo) => repo.description);

const forjdRepos = candidateRepos
  .filter((repo) => repo.owner.login.toLowerCase() === "forjd")
  .sort((a, b) => repoScore(b) - repoScore(a));

const personalRepos = candidateRepos
  .filter((repo) => repo.owner.login.toLowerCase() !== "forjd")
  .sort((a, b) => repoScore(b) - repoScore(a));

const featuredRepos = [...forjdRepos, ...personalRepos].slice(0, MAX_PROJECTS);

if (featuredRepos.length === 0) {
  throw new Error("No featured repositories found");
}

const readme = await readFile(README_PATH, "utf8");
const nextReadme = replaceFeaturedProjects(readme, renderProjects(featuredRepos));

if (nextReadme !== readme) {
  await writeFile(README_PATH, nextReadme);
}
