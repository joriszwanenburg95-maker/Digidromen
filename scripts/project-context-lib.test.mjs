import test from "node:test";
import assert from "node:assert/strict";

import {
  parseGitHubRemote,
  validateProjectContext,
} from "./project-context-lib.mjs";

const expectedContext = {
  github: {
    host: "github.com",
    owner: "joriszwanenburg95-maker",
    repo: "Digidromen",
    user: "joriszwanenburg95-maker",
  },
  vercel: {
    projectId: "prj_LBxwTADV6A0COItPTCubcwF4XJVe",
    orgId: "team_7f5GvqVpnIcRnHDJgsuPSr6s",
    projectName: "digidromen",
  },
  supabase: {
    projectRef: "oyxcwfozoxlgdclchden",
  },
};

test("parseGitHubRemote parses ssh remotes", () => {
  assert.deepEqual(
    parseGitHubRemote("git@github.com:joriszwanenburg95-maker/Digidromen.git"),
    {
      host: "github.com",
      owner: "joriszwanenburg95-maker",
      repo: "Digidromen",
    },
  );
});

test("parseGitHubRemote parses https remotes", () => {
  assert.deepEqual(
    parseGitHubRemote("https://github.com/joriszwanenburg95-maker/Digidromen.git"),
    {
      host: "github.com",
      owner: "joriszwanenburg95-maker",
      repo: "Digidromen",
    },
  );
});

test("validateProjectContext passes for the expected repo state", () => {
  const result = validateProjectContext(expectedContext, {
    gitRemoteUrl: "git@github.com:joriszwanenburg95-maker/Digidromen.git",
    ghUser: "joriszwanenburg95-maker",
    vercelProject: {
      projectId: "prj_LBxwTADV6A0COItPTCubcwF4XJVe",
      orgId: "team_7f5GvqVpnIcRnHDJgsuPSr6s",
      projectName: "digidromen",
    },
    supabaseProjectRef: "oyxcwfozoxlgdclchden",
  });

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateProjectContext reports all mismatches", () => {
  const result = validateProjectContext(expectedContext, {
    gitRemoteUrl: "git@github.com:wrong-account/other-repo.git",
    ghUser: "wrong-account",
    vercelProject: {
      projectId: "prj_wrong",
      orgId: "team_wrong",
      projectName: "wrong-project",
    },
    supabaseProjectRef: "wrongref",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "Git remote mismatch: expected github.com/joriszwanenburg95-maker/Digidromen, got github.com/wrong-account/other-repo.",
    "GitHub CLI mismatch: expected account joriszwanenburg95-maker, got wrong-account.",
    "Vercel project mismatch: expected project prj_LBxwTADV6A0COItPTCubcwF4XJVe, got prj_wrong.",
    "Vercel org mismatch: expected org team_7f5GvqVpnIcRnHDJgsuPSr6s, got team_wrong.",
    "Vercel project name mismatch: expected digidromen, got wrong-project.",
    "Supabase link mismatch: expected project ref oyxcwfozoxlgdclchden, got wrongref.",
  ]);
});

test("validateProjectContext reports missing links and sessions", () => {
  const result = validateProjectContext(expectedContext, {
    gitRemoteUrl: "git@github.com:joriszwanenburg95-maker/Digidromen.git",
    ghUser: null,
    vercelProject: null,
    supabaseProjectRef: null,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "GitHub CLI mismatch: expected account joriszwanenburg95-maker, got not logged in.",
    "Vercel link missing: expected .vercel/project.json for project digidromen.",
    "Supabase link missing: expected local link to project ref oyxcwfozoxlgdclchden.",
  ]);
});
