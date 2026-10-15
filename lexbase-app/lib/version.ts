import packageInfo from '../package.json';
import history from './release-history.json';

export const APP_VERSION = packageInfo.version;
export const CHANGELOG = history.releases;
// Kept for existing consumers; this is the release date, not a build timestamp.
export const BUILD_DATE = CHANGELOG[0].date;
