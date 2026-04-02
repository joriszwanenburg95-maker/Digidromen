export function parseGitHubRemote(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  const sshMatch = remoteUrl.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      repo: sshMatch[3],
    };
  }

  const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return {
      host: httpsMatch[1],
      owner: httpsMatch[2],
      repo: httpsMatch[3],
    };
  }

  return null;
}

export function validateProjectContext(expected, actual) {
  const errors = [];
  const parsedRemote = parseGitHubRemote(actual.gitRemoteUrl);

  if (!parsedRemote) {
    errors.push("Git remote mismatch: could not parse origin remote.");
  } else if (
    parsedRemote.host !== expected.github.host ||
    parsedRemote.owner !== expected.github.owner ||
    parsedRemote.repo !== expected.github.repo
  ) {
    errors.push(
      `Git remote mismatch: expected ${expected.github.host}/${expected.github.owner}/${expected.github.repo}, got ${parsedRemote.host}/${parsedRemote.owner}/${parsedRemote.repo}.`,
    );
  }

  const ghUser = actual.ghUser ?? "not logged in";
  if (ghUser !== expected.github.user) {
    errors.push(
      `GitHub CLI mismatch: expected account ${expected.github.user}, got ${ghUser}.`,
    );
  }

  if (!actual.vercelProject) {
    errors.push(
      `Vercel link missing: expected .vercel/project.json for project ${expected.vercel.projectName}.`,
    );
  } else {
    if (actual.vercelProject.projectId !== expected.vercel.projectId) {
      errors.push(
        `Vercel project mismatch: expected project ${expected.vercel.projectId}, got ${actual.vercelProject.projectId}.`,
      );
    }
    if (actual.vercelProject.orgId !== expected.vercel.orgId) {
      errors.push(
        `Vercel org mismatch: expected org ${expected.vercel.orgId}, got ${actual.vercelProject.orgId}.`,
      );
    }
    if (actual.vercelProject.projectName !== expected.vercel.projectName) {
      errors.push(
        `Vercel project name mismatch: expected ${expected.vercel.projectName}, got ${actual.vercelProject.projectName}.`,
      );
    }
  }

  if (!actual.supabaseProjectRef) {
    errors.push(
      `Supabase link missing: expected local link to project ref ${expected.supabase.projectRef}.`,
    );
  } else if (actual.supabaseProjectRef !== expected.supabase.projectRef) {
    errors.push(
      `Supabase link mismatch: expected project ref ${expected.supabase.projectRef}, got ${actual.supabaseProjectRef}.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function buildRepairCommands(expected) {
  return [
    `gh auth switch --user ${expected.github.user}`,
    `vercel link --project ${expected.vercel.projectName}`,
    `npx supabase link --project-ref ${expected.supabase.projectRef}`,
    `npm run setup:hooks`,
  ];
}
