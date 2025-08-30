'use client';

import { useState, useEffect } from 'react';
import { scrapeCompanies, getMaxPage, Company } from '../lib/scraper';

export default function Home() {
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('');

  useEffect(() => {
    const fetchAllCompanies = async () => {
      setLoading(true);
      setLoadingStatus('Getting page count...');
      
      try {
        // First, get the maximum page
        const maxPage = await getMaxPage();
        console.log(`Found ${maxPage} pages to scrape`);
        
        // Then, fetch companies from all pages in parallel
        setLoadingStatus(`Loading companies from ${maxPage} pages...`);
        
        const allCompaniesPromises = [];
        for (let page = 1; page <= maxPage; page++) {
          allCompaniesPromises.push(
            scrapeCompanies(page).then(companies => {
              console.log(`Loaded ${companies.length} companies from page ${page}`);
              return companies;
            })
          );
        }
        
        const allPagesResults = await Promise.all(allCompaniesPromises);
        
        // Flatten all companies into one array
        const allCompaniesFlat = allPagesResults.flat();
        
        console.log(`Total companies loaded: ${allCompaniesFlat.length}`);
        setAllCompanies(allCompaniesFlat);
        setLoadingStatus('');
      } catch (error) {
        console.error('Error fetching all companies:', error);
        setLoadingStatus('Error loading companies');
      }
      
      setLoading(false);
    };

    fetchAllCompanies();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-lg mb-4">Loading all companies...</div>
          {loadingStatus && (
            <div className="text-sm text-gray-600">{loadingStatus}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        All AB/Aktiebolag Companies Founded Within Last 12 Months - Skåne ({allCompanies.length} companies)
      </h1>
      
      {allCompanies.length > 0 ? (
        <div className="space-y-4">
          {allCompanies.map((company, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold">{company.name}</h2>
              <p className="text-gray-600">Organisation Number: {company.organisationNumber}</p>
              <p className="text-gray-600">Location: {company.location}</p>
              <p className="text-gray-600">Founded: {company.foundedDate}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No AB/Aktiebolag companies found.</p>
        </div>
      )}
    </div>
  );
}
