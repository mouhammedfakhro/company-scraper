'use client';

import { useState, useMemo } from 'react';
import { scrapeCompanies, getMaxPage, Company } from '../lib/scraper';
import { useFindManyCompany, useUpsertCompany } from '../lib/hooks';

interface ProffIndustryCode {
  id: string;
  code: string;
  name: string;
}

interface NyaForetagProps {
  proffIndustryCodes: ProffIndustryCode[];
}

export default function NyaForetag({ proffIndustryCodes }: NyaForetagProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('');

  // Fetch already saved companies to filter them out
  const { data: savedCompaniesData = [] } = useFindManyCompany();
  const upsertCompany = useUpsertCompany();

  const savedCompanies = useMemo(() => {
    return new Set(savedCompaniesData.map(c => c.organizationNumber));
  }, [savedCompaniesData]);

  const saveCompanies = async (companiesToSave: Company[]) => {
    try {
      const savePromises = companiesToSave.map(company =>
        upsertCompany.mutateAsync({
          where: {
            organizationNumber: company.organisationNumber
          },
          update: {
            name: company.name,
            address: company.location,
            city: company.location,
            registeredDate: company.foundedDate,
            url: company.detailUrl,
            description: company.description,
            CEO: company.CEO,
            SNI: company.SNI
          },
          create: {
            organizationNumber: company.organisationNumber,
            name: company.name,
            address: company.location,
            city: company.location,
            registeredDate: company.foundedDate,
            url: company.detailUrl,
            description: company.description,
            CEO: company.CEO,
            SNI: company.SNI,
            isFavorite: false
          }
        })
      );

      await Promise.all(savePromises);
      console.log('Saved companies successfully');
      return true;
    } catch (error) {
      console.error('Error saving companies:', error);
      return false;
    }
  };

  const handleScrape = async () => {
    if (!selectedCode) {
      alert('Vänligen välj en branschkod först');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll scrape all pages as before
      // Later this should be updated to scrape based on the selected proffIndustryCode
      const maxPage = await getMaxPage();
      const allCompaniesPromises = [];
      
      for (let page = 1; page <= maxPage; page++) {
        allCompaniesPromises.push(scrapeCompanies(page));
      }
      
      const allPagesResults = await Promise.all(allCompaniesPromises);
      const allCompaniesFlat = allPagesResults.flat();
      
      // Filter out companies that are already saved
      const newCompanies = allCompaniesFlat.filter(
        company => !savedCompanies.has(company.organisationNumber)
      );
      
      setCompanies(newCompanies);

      // Save the new companies to database
      if (newCompanies.length > 0) {
        await saveCompanies(newCompanies);
      }
    } catch (error) {
      console.error('Error scraping companies:', error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Nya Företag</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Välj branschkod:
        </label>
        <select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-64"
        >
          <option value="">Välj en kod...</option>
          {proffIndustryCodes.map((proffCode) => (
            <option key={proffCode.id} value={proffCode.code}>
              {proffCode.code} - {proffCode.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleScrape}
          disabled={loading || !selectedCode}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Söker...' : 'Sök företag'}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="text-lg">Söker företag...</div>
        </div>
      )}

      {companies.length > 0 && !loading && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Hittade {companies.length} nya företag (redan sparade företag borttagna)
          </h2>
          {companies.map((company, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold">{company.name}</h3>
              <p className="text-gray-600">Organisationsnummer: {company.organisationNumber}</p>
              <p className="text-gray-600">Ort: {company.location}</p>
              <p className="text-gray-600">Grundat: {company.foundedDate}</p>
              {company.CEO && (
                <p className="text-gray-600">CEO: {company.CEO}</p>
              )}
              {company.SNI && (
                <p className="text-gray-600">SNI: {company.SNI}</p>
              )}
              {company.description && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Beskrivning:</p>
                  <p className="text-sm text-gray-700">{company.description.substring(0, 200)}...</p>
                </div>
              )}
              {company.detailUrl && (
                <a 
                  href={company.detailUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Visa detaljer →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {proffIndustryCodes.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          Inga branschkoder konfigurerade. Gå till Scraper-inställningar för att lägga till koder.
        </div>
      )}
    </div>
  );
}