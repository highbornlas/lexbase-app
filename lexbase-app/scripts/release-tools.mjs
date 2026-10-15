export function parseVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('Version exceeds the supported range');
  return parts;
}

export function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

function validDate(value, allowMonth = true) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return false;
  if (!allowMonth && value.length !== 10) return false;
  const full = value.length === 7 ? `${value}-01` : value;
  const date = new Date(`${full}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === full;
}

function validNotes(notes) {
  return Array.isArray(notes) && notes.length > 0
    && notes.every(note => typeof note === 'string' && note.trim().length > 0);
}

export function validateRelease(pkg, lock, history) {
  parseVersion(pkg.version);
  if (pkg.version !== lock.version || pkg.version !== lock.packages?.['']?.version) {
    throw new Error('Package and lockfile versions differ');
  }
  if (!Array.isArray(history.releases) || history.releases.length === 0
    || history.releases[0].version !== pkg.version) {
    throw new Error('Current version has no matching release notes');
  }
  for (const [index, release] of history.releases.entries()) {
    parseVersion(release.version);
    if (!validDate(release.date) || !validNotes(release.changes)) {
      throw new Error(`Invalid release date or notes for ${release.version}`);
    }
    if (index > 0 && compareVersions(history.releases[index - 1].version, release.version) <= 0) {
      throw new Error('Release history must have unique, descending versions');
    }
  }
  if (!Array.isArray(history.unreleased)
    || history.unreleased.some(note => typeof note !== 'string' || !note.trim())) {
    throw new Error('Invalid unpublished notes');
  }
  parseVersion(history.legacyLiveVersion);
}

export function prepareRelease(pkg, lock, history, bump, date, suppliedNotes = []) {
  validateRelease(pkg, lock, history);
  if (!['patch', 'minor', 'major'].includes(bump)) throw new Error('Choose patch, minor or major');
  if (!validDate(date, false)) throw new Error('A valid YYYY-MM-DD release date is required');
  const notes = suppliedNotes.length ? suppliedNotes : history.unreleased;
  if (!validNotes(notes)) throw new Error('Write release notes before preparing a release');
  const parts = parseVersion(pkg.version);
  const index = { major: 0, minor: 1, patch: 2 }[bump];
  parts[index]++;
  for (let i = index + 1; i < 3; i++) parts[i] = 0;
  const version = parts.join('.');
  const result = {
    pkg: { ...pkg, version },
    lock: { ...lock, version, packages: { ...lock.packages, '': { ...lock.packages[''], version } } },
    history: { ...history, unreleased: [], releases: [{ version, date, changes: notes.map(note => note.trim()) }, ...history.releases] },
  };
  validateRelease(result.pkg, result.lock, result.history);
  return result;
}

export function assertNewLiveVersion(pkg, history, status, payload) {
  let liveVersion;
  if (status === 200) {
    liveVersion = payload?.version;
    parseVersion(liveVersion);
  } else if (status === 404 && history.releases[1]?.version === history.legacyLiveVersion) {
    // One-time bridge for the existing site which has no metadata endpoint.
    liveVersion = history.legacyLiveVersion;
  } else {
    throw new Error('Cannot verify the live version; deployment stopped');
  }
  if (compareVersions(pkg.version, liveVersion) <= 0) {
    throw new Error(`Live is ${liveVersion}. Prepare a newer version before deploying ${pkg.version}`);
  }
  return liveVersion;
}
