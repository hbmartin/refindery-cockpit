/** Presentation gate: the app shell, every lens page, and the URL search
 * schemas the route layer wires into `validateSearch`. */
export { ClustersPage } from './presentation/lenses/clusters/clusters-page';
export { EntitiesPage } from './presentation/lenses/entities/entities-page';
export { JobsPage } from './presentation/lenses/jobs/jobs-page';
export {
  type JobsSearch,
  jobsSearchSchema,
} from './presentation/lenses/jobs/jobs-search';
export { ModelsPage } from './presentation/lenses/models/models-page';
export { PageDetail } from './presentation/lenses/pages/page-detail';
export { PagesIndex } from './presentation/lenses/pages/pages-index';
export { PulsePage } from './presentation/lenses/pulse/pulse-page';
export { SearchLabPage } from './presentation/lenses/search-lab/search-lab-page';
export {
  type SearchLabSearch,
  searchLabSearchDefaults,
  searchLabSearchSchema,
} from './presentation/lenses/search-lab/search-lab-search';
export { SettingsPage } from './presentation/lenses/settings/settings-page';
export { SystemPage } from './presentation/lenses/system/system-page';
export { RefinderyClientProvider } from './presentation/refindery-client-provider';
export { CockpitShell } from './presentation/shell/cockpit-shell';
