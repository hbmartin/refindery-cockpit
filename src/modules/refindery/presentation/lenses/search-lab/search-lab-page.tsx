import { useState } from 'react';

import { CompareTab } from './compare-tab';
import { EvalTab } from './eval-tab';
import { SearchTab } from './search-tab';
import { LensHeader, LensPage } from '../../components/lens';
import { Segmented } from '../../components/segmented';

type Tab = 'search' | 'compare' | 'eval';

export function SearchLabPage() {
  const [tab, setTab] = useState<Tab>('search');

  return (
    <LensPage>
      <LensHeader
        title="Search Lab"
        subtitle="Run live searches, compare models, and drive the offline eval machinery."
        actions={
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
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
