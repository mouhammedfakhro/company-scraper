export interface Company {
  name: string;
  location: string;
  foundedDate: string;
  organisationNumber: string;
  detailUrl?: string;
  description?: string;
  CEO?: string;
  SNI?: string;
}

export async function scrapeCompanies(page: number = 1): Promise<Company[]> {
  try {
    const response = await fetch(`/api/companies?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const companies = await response.json();
    return companies;
  } catch (error) {
    console.error(`Error fetching companies for page ${page}:`, error);
    return getMockCompanies(page);
  }
}

function getMockCompanies(page: number): Company[] {
  const allCompanies = [
    // Page 1
    { name: "Tim Scharinger", location: "Lund, Skåne", foundedDate: "2025-07-25", organisationNumber: "123456789" },
    { name: "Johan Engdahl", location: "Vellinge, Skåne", foundedDate: "2025-07-18", organisationNumber: "234567890" },
    { name: "F.W.S. i Helsingborg AB", location: "Helsingborg, Skåne", foundedDate: "2025-07-01", organisationNumber: "345678901" },
    { name: "André Ekberg", location: "Fjälkinge, Skåne", foundedDate: "2025-06-27", organisationNumber: "456789012" },
    { name: "Samra Osmancevic", location: "Bunkeflostrand, Skåne", foundedDate: "2025-06-19", organisationNumber: "567890123" },
    { name: "Pham IT", location: "Malmö, Skåne", foundedDate: "2025-06-17", organisationNumber: "678901234" },
    { name: "Elias Fambri", location: "Malmö, Skåne", foundedDate: "2025-06-13", organisationNumber: "789012345" },
    { name: "Amjad Al Shayeb", location: "Landskrona, Skåne", foundedDate: "2025-06-13", organisationNumber: "890123456" },
    
    // Page 2
    { name: "Nordic Solutions AB", location: "Malmö, Skåne", foundedDate: "2025-06-10", organisationNumber: "901234567" },
    { name: "Skåne Tech Innovation", location: "Lund, Skåne", foundedDate: "2025-06-08", organisationNumber: "012345678" },
    { name: "Green Energy Consulting", location: "Helsingborg, Skåne", foundedDate: "2025-06-05", organisationNumber: "111222333" },
    { name: "Digital Marketing Pro", location: "Malmö, Skåne", foundedDate: "2025-06-01", organisationNumber: "222333444" },
    { name: "Construction Solutions", location: "Vellinge, Skåne", foundedDate: "2025-05-28", organisationNumber: "333444555" },
    { name: "Food Delivery Express", location: "Lund, Skåne", foundedDate: "2025-05-25", organisationNumber: "444555666" },
    { name: "Health Care Services", location: "Landskrona, Skåne", foundedDate: "2025-05-20", organisationNumber: "555666777" },
    { name: "Transport & Logistics", location: "Helsingborg, Skåne", foundedDate: "2025-05-15", organisationNumber: "666777888" },
  ];
  
  const companiesPerPage = 8;
  const startIndex = (page - 1) * companiesPerPage;
  const endIndex = startIndex + companiesPerPage;
  
  return allCompanies.slice(startIndex, endIndex);
}

export async function getMaxPage(): Promise<number> {
  try {
    const response = await fetch('/api/max-page');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.maxPage;
  } catch (error) {
    console.error('Error determining max page:', error);
    return 5;
  }
}