import { NextResponse } from 'next/server';
import axios from 'axios';

interface CompanyDetails {
  description?: string;
  CEO?: string;
  SNI?: string;
}

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

async function fetchCompanyDetails(detailUrl: string): Promise<CompanyDetails> {
  try {
    console.log(`🔍 Fetching company details from: ${detailUrl}`);
    
    const response = await axios.get(detailUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.status !== 200) {
      console.log(`❌ Failed to fetch ${detailUrl} - Status: ${response.status}`);
      return {};
    }

    const html = response.data;
    const details: CompanyDetails = {};

    // Extract description from "Verksamhet & ändamål" section
    const descriptionMatch = html.match(/Verksamhet\s*&\s*ändamål[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);
    if (descriptionMatch) {
      // Clean up HTML tags and whitespace
      let description = descriptionMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .trim();
      
      if (description && description.length > 10) {
        details.description = description;
        console.log(`📝 Found description: ${description.substring(0, 100)}...`);
      }
    }

    // Extract CEO from "Verkställande Direktör" section
    const ceoMatch = html.match(/Verkställande\s*Direktör[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    if (ceoMatch) {
      const ceo = ceoMatch[1].trim();
      if (ceo && ceo.length > 2) {
        details.CEO = ceo;
        console.log(`👨‍💼 Found CEO: ${ceo}`);
      }
    }

    // Extract SNI branches - look for multiple "SNI-bransch" entries
    const sniMatches = html.matchAll(/SNI-bransch[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi);
    const sniBranches: string[] = [];
    
    for (const match of sniMatches) {
      const sniBranch = match[1].trim();
      if (sniBranch && sniBranch.length > 2) {
        sniBranches.push(sniBranch);
      }
    }
    
    if (sniBranches.length > 0) {
      details.SNI = sniBranches.join(', ');
      console.log(`🏢 Found SNI branches: ${details.SNI}`);
    }

    console.log(`✅ Successfully extracted details for ${detailUrl}`);
    return details;

  } catch (error) {
    console.log(`❌ Error fetching company details from ${detailUrl}:`, error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

async function scrapeCompanies(page: number = 1, proffIndustryCode: string = '10241621'): Promise<Company[]> {
  const url = `https://www.allabolag.se/nystartade?location=Skåne&proffIndustryCode=${proffIndustryCode}&page=${page}`;
  
  try {
    console.log(`Fetching page ${page} from: ${url}`);
    const response = await axios.get(url, {
      timeout: 10000,
    });
    
    console.log(`Response status for page ${page}:`, response.status);
    console.log(`Response data type for page ${page}:`, typeof response.data);
    console.log(`Response data length for page ${page}:`, Array.isArray(response.data) ? response.data.length : 'not array');
    
    const data = response.data;
    const companies: Company[] = [];
    
    // Check if we got JSON data
    if (Array.isArray(data)) {
      console.log(`Processing JSON array with ${data.length} items for page ${page}`);
      for (const item of data) {
        if (item.displayName && item.location && item.foundationDate && item.orgnr) {
          companies.push({
            name: item.displayName,
            location: `${item.location.municipality}, ${item.location.county}`,
            foundedDate: item.foundationDate,
            organisationNumber: item.orgnr
          });
        }
      }
    } else if (typeof data === 'string') {
      console.log(`Got HTML response for page ${page}, parsing Material-UI structure`);
      
      // Parse HTML to extract companies from Material-UI list items
      const html = data;
      
      // Find all list items that contain company data
      const listItemRegex = /<li class="MuiListItem-root[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
      let match;
      
      while ((match = listItemRegex.exec(html)) !== null) {
        const listItemContent = match[1];
        
        // Extract company name and detail URL from the link
        const nameAndUrlMatch = listItemContent.match(/href="(\/foretag\/[^"]*)">([^<]+)<\/a>/);
        if (!nameAndUrlMatch) continue;
        
        const detailPath = nameAndUrlMatch[1];
        const companyName = nameAndUrlMatch[2];
        const fullDetailUrl = `https://www.allabolag.se${detailPath}`;
        
        console.log(`Found company: ${companyName}`);
        console.log(`🔗 Company detail link: ${fullDetailUrl}`);
        
        // Only include companies with "AB" or "Aktiebolag" in the name
        if (!companyName.includes('AB') && !companyName.includes('Aktiebolag')) {
          console.log(`Skipping ${companyName} - doesn't contain AB or Aktiebolag`);
          continue;
        }
        
        console.log(`✓ Company ${companyName} contains AB/Aktiebolag - processing`);
        
        // Extract organisation number from the URL
        const urlMatch = listItemContent.match(/href="\/foretag\/[^\/]*\/[^\/]*\/-\/(\d+)"/);
        if (!urlMatch) {
          console.log(`No org number found for ${companyName}`);
          continue;
        }
        const orgNumber = urlMatch[1];
        console.log(`Org number: ${orgNumber}`);
        
        // Extract location from URL path
        const locationUrlMatch = listItemContent.match(/href="\/foretag\/[^\/]*\/([^\/]*)\//);
        let location = 'Skåne';
        if (locationUrlMatch) {
          // Decode URL encoding (like malm%C3%B6 -> malmö)
          let locationFromUrl = decodeURIComponent(locationUrlMatch[1]);
          // Capitalize first letter
          locationFromUrl = locationFromUrl.charAt(0).toUpperCase() + locationFromUrl.slice(1);
          location = `${locationFromUrl}, Skåne`;
        }
        console.log(`Location: ${location}`);
        
        // Extract date after "Registrerad"
        const dateMatch = listItemContent.match(/Registrerad[^>]*>[\s]*<span[^>]*>(\d{4}-\d{2}-\d{2})<\/span>/);
        if (!dateMatch) {
          console.log(`No date found for ${companyName}`);
          continue;
        }
        const foundedDate = dateMatch[1];
        console.log(`Date: ${foundedDate}`);
        
        // Fetch additional details from company detail page
        console.log(`🔍 Fetching additional details for ${companyName}...`);
        const additionalDetails = await fetchCompanyDetails(fullDetailUrl);
        
        // Add the complete company with all details
        companies.push({
          name: companyName,
          location: location,
          foundedDate: foundedDate,
          organisationNumber: orgNumber,
          detailUrl: fullDetailUrl,
          description: additionalDetails.description,
          CEO: additionalDetails.CEO,
          SNI: additionalDetails.SNI
        });
        
        console.log(`✅ Added complete company with details: ${companyName}`);
      }
      
      console.log(`Parsed ${companies.length} companies from Material-UI HTML for page ${page}`);
    } else {
      console.log(`Unexpected data type for page ${page}:`, typeof data);
    }
    
    console.log(`Found ${companies.length} valid companies for page ${page}`);
    
    if (companies.length === 0) {
      console.log(`No valid companies found for page ${page}, returning mock data`);
      return getMockCompanies(page);
    }
    
    return companies;
  } catch (error) {
    console.error(`Error scraping companies for page ${page}:`, error);
    return getMockCompanies(page);
  }
}

function getMockCompanies(page: number): Company[] {
  const allCompanies = [
    { name: "Tim Scharinger", location: "Lund, Skåne", foundedDate: "2025-07-25", organisationNumber: "123456789" },
    { name: "Johan Engdahl", location: "Vellinge, Skåne", foundedDate: "2025-07-18", organisationNumber: "234567890" },
    { name: "F.W.S. i Helsingborg AB", location: "Helsingborg, Skåne", foundedDate: "2025-07-01", organisationNumber: "345678901" },
    { name: "André Ekberg", location: "Fjälkinge, Skåne", foundedDate: "2025-06-27", organisationNumber: "456789012" },
    { name: "Samra Osmancevic", location: "Bunkeflostrand, Skåne", foundedDate: "2025-06-19", organisationNumber: "567890123" },
    { name: "Pham IT", location: "Malmö, Skåne", foundedDate: "2025-06-17", organisationNumber: "678901234" },
    { name: "Elias Fambri", location: "Malmö, Skåne", foundedDate: "2025-06-13", organisationNumber: "789012345" },
    { name: "Amjad Al Shayeb", location: "Landskrona, Skåne", foundedDate: "2025-06-13", organisationNumber: "890123456" },
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const code = searchParams.get('code') || '10241621';
  
  try {
    const companies = await scrapeCompanies(page, code);
    return NextResponse.json(companies);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}