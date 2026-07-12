import { getRouteApi } from '@tanstack/react-router';

import { CompareTab } from './compare-tab';
import { EvalTab } from './eval-tab';
import type { SearchLabSearch } from './search-lab-search';
import { SearchTab } from './search-tab';
import { LensHeader, LensPage } from '../../components/lens';
import { Segmented } from '../../components/segmented';

const route = getRouteApi('/_shell/search');

type Tab = SearchLabSearch['tab'];

export function SearchLabPage() {
  const { tab } = route.useSearch();
  const navigate = route.useNavigate();

  return (
    <LensPage>
      <LensHeader
        title="Search Lab"
        subtitle="Run live searches, compare models, and drive the offline eval machinery."
        actions={
          <Segmented<Tab>
            value={tab}
            onChange={(next) =>
              navigate({
                search: (prev) => ({ ...prev, tab: next }),
                replace: true,
              })
            }
            options={[
              { value: 'search', label: 'Search' },
              { value: 'compare', label: 'Compare' },
              { value: 'eval', label: 'Eval' },
            ]}
          />
        }
      />
      {tab === 'search' ? <SearchTab /> : null}
      {tab === 'compare' ? <CompareTab /> : null}
      {tab === 'eval' ? <EvalTab /> : null}
    </LensPage>
  );
}
