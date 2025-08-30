import { NextResponse } from 'next/server';

import axios from 'axios';

async function checkPageHasRealData(page: number): Promise<boolean> {
  const url = `https://www.allabolag.se/nystartade?location=Skåne&proffIndustryCode=10241621&page=${page}`;
  
  try {
    console.log(`Checking page ${page} for real data`);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    const html = response.data;
    
    if (typeof html === 'string') {
      // Check for Material-UI list items (same logic as the main scraper)
      const listItemRegex = /<li class="MuiListItem-root[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
      const matches = html.match(listItemRegex);
      
      if (matches && matches.length > 0) {
        console.log(`Page ${page} has ${matches.length} list items`);
        
        // Check if at least one has company data (regardless of AB/Aktiebolag filter)
        for (const match of matches) {
          const nameMatch = match.match(/href="\/foretag\/[^"]*">([^<]+)<\/a>/);
          const urlMatch = match.match(/href="\/foretag\/[^\/]*\/[^\/]*\/-\/(\d+)"/);
          const dateMatch = match.match(/Registrerad[^>]*>[\s]*<span[^>]*>(\d{4}-\d{2}-\d{2})<\/span>/);
          
          if (nameMatch && urlMatch && dateMatch) {
            console.log(`Page ${page} has real company data: ${nameMatch[1]}`);
            return true;
          }
        }
      }
    }
    
    console.log(`Page ${page} has no real company data`);
    return false;
  } catch (error) {
    console.error(`Error checking page ${page}:`, error);
    return false;
  }
}

export async function GET() {
  let page = 1;
  let maxPage = 1;
  
  try {
    console.log('Starting max page calculation...');
    
    // Check up to 10 pages (reasonable limit)
    while (page <= 10) {
      const hasRealData = await checkPageHasRealData(page);
      
      if (hasRealData) {
        console.log(`✓ Page ${page} has real data`);
        maxPage = page;
        page++;
      } else {
        console.log(`✗ Page ${page} has no real data - stopping`);
        break;
      }
      
      // Add delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`Final max page: ${maxPage}`);
    return NextResponse.json({ maxPage });
  } catch (error) {
    console.error('Error determining max page:', error);
    return NextResponse.json({ maxPage: 2 });
  }
}