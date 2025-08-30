'use client';

import { useState } from 'react';
import Sidebar, { Page } from '../components/Sidebar';
import NyaForetag from '../components/NyaForetag';
import SparadeForetag from '../components/SparadeForetag';
import ScraperDetails from '../components/ScraperDetails';
import { useFindManyProffIndustryCode } from '../lib/hooks';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('nya-foretag');
  
  // Fetch all ProffIndustryCode records directly
  const { data: proffIndustryCodes = [] } = useFindManyProffIndustryCode();

  const handleCodesChange = async (codes: Array<{id: string, code: string, name: string}>) => {
    // Since ProffIndustryCode objects are managed directly through their own CRUD operations,
    // we don't need to update the ScraperHandler relationship here.
    // The ScraperDetails component handles creating/deleting ProffIndustryCode records directly.
    console.log('Codes changed:', codes);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'nya-foretag':
        return <NyaForetag proffIndustryCodes={proffIndustryCodes} />;
      case 'sparade-foretag':
        return <SparadeForetag />;
      case 'scraper-details':
        return (
          <ScraperDetails
            proffIndustryCodes={proffIndustryCodes}
            onCodesChange={handleCodesChange}
          />
        );
      default:
        return <NyaForetag proffIndustryCodes={proffIndustryCodes} />;
    }
  };

  return (
    <div className="flex">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 ml-64">
        {renderCurrentPage()}
      </div>
    </div>
  );
}
