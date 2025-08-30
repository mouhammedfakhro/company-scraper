'use client';

import { useMemo } from 'react';
import { useFindManyCompany, useUpdateCompany } from '../lib/hooks';

export default function SparadeForetag() {
  const { data: companies = [], isLoading } = useFindManyCompany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const updateCompany = useUpdateCompany();

  const toggleFavorite = async (companyId: string, currentFavoriteStatus: boolean) => {
    try {
      await updateCompany.mutateAsync({
        where: { id: companyId },
        data: { isFavorite: !currentFavoriteStatus }
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  // Sort companies with favorites at the top
  const sortedCompanies = useMemo(() => {
    if (!companies) return [];
    return [...companies].sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [companies]);

  const favoriteCompanies = sortedCompanies.filter(company => company.isFavorite);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-32">
          <div className="text-lg">Laddar sparade företag...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Sparade Företag</h1>
      
      <div className="mb-6">
        <div className="flex space-x-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Totalt antal företag</h3>
            <p className="text-2xl font-bold text-blue-600">{sortedCompanies.length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Favoriter</h3>
            <p className="text-2xl font-bold text-green-600">{favoriteCompanies.length}</p>
          </div>
        </div>
      </div>

      {sortedCompanies.length > 0 ? (
        <div className="space-y-4">
          {sortedCompanies.map((company) => (
            <div key={company.id} className={`border rounded-lg p-4 ${
              company.isFavorite ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold flex items-center">
                    {company.name}
                    {company.isFavorite && (
                      <span className="ml-2 text-yellow-500">⭐</span>
                    )}
                  </h3>
                  <p className="text-gray-600">Organisationsnummer: {company.organizationNumber}</p>
                  <p className="text-gray-600">Ort: {company.address || company.city || 'Ej tillgängligt'}</p>
                  <p className="text-gray-600">Grundat: {company.registeredDate || 'Ej tillgängligt'}</p>
                  {company.CEO && (
                    <p className="text-gray-600">CEO: {company.CEO}</p>
                  )}
                  {company.SNI && (
                    <p className="text-gray-600">SNI: {company.SNI}</p>
                  )}
                  {company.description && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Beskrivning:</p>
                      <p className="text-sm text-gray-700">{company.description.substring(0, 150)}...</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-gray-500 text-sm">Sparat: {new Date(company.createdAt).toLocaleDateString()}</p>
                    {company.url && (
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Visa detaljer →
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFavorite(company.id, company.isFavorite)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    company.isFavorite
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {company.isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600">
          Inga sparade företag hittades. Sök några företag från sidan Nya Företag först.
        </div>
      )}
    </div>
  );
}