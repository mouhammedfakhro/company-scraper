import { NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import prisma from '../../../../components/lib/prisma';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

async function scrapeCompaniesByCode(code: string): Promise<any[]> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002';
    const allCompanies: any[] = [];
    let page = 1;
    const maxPages = 10; // Increased to get all companies
    
    while (page <= maxPages) {
      const url = `${baseUrl}/api/companies?page=${page}&code=${code}&skipDetails=true`;
      console.log(`Fetching companies from page ${page}: ${url}`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch companies for code ${code}, page ${page}: ${response.status} - ${errorText}`);
          break; // Stop if we get an error
        }
        
        const companies = await response.json();
        console.log(`Page ${page}: Found ${companies.length} companies for code ${code}`);
        
        if (companies.length === 0) {
          console.log(`No more companies found on page ${page}, stopping`);
          break; // Stop if no companies found
        }
        
        allCompanies.push(...companies);
        page++;
        
      } catch (pageError) {
        console.error(`Error fetching page ${page} for code ${code}:`, pageError);
        break; // Stop on error
      }
    }
    
    console.log(`Successfully fetched total of ${allCompanies.length} companies for code ${code} across ${page - 1} pages`);
    return allCompanies;
  } catch (error) {
    console.error(`Error fetching companies for code ${code}:`, error);
    return [];
  }
}

async function saveCompaniesToDatabase(companies: any[]): Promise<boolean> {
  try {
    if (companies.length === 0) {
      console.log('No companies to save');
      return true;
    }

    console.log(`Saving ${companies.length} companies to database...`);

    const savePromises = companies.map(company =>
      prisma.company.upsert({
        where: {
          organizationNumber: company.organisationNumber || company.organizationNumber
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
          organizationNumber: company.organisationNumber || company.organizationNumber,
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
    console.log(`✅ Successfully saved ${companies.length} companies to database`);
    return true;
  } catch (error) {
    console.error('❌ Error saving companies to database:', error);
    return false;
  }
}

async function getNewCompanies(): Promise<any[]> {
  try {
    // Get all ProffIndustryCode from database
    const proffIndustryCodes = await prisma.proffIndustryCode.findMany();
    console.log(`Found ${proffIndustryCodes.length} ProffIndustryCode to scrape`);

    if (proffIndustryCodes.length === 0) {
      console.log('No ProffIndustryCode found in database');
      return [];
    }

    // Get already saved companies to filter them out
    const savedCompanies = await prisma.company.findMany({
      select: { organizationNumber: true }
    });
    const savedOrgNumbers = new Set(savedCompanies.map(c => c.organizationNumber));
    console.log(`Found ${savedOrgNumbers.size} already saved companies`);

    // Scrape companies for each code
    const allNewCompanies: any[] = [];
    
    for (const proffCode of proffIndustryCodes) {
      console.log(`Scraping companies for code: ${proffCode.code} (${proffCode.name})`);
      
      try {
        // For now, we'll scrape the first page of each code
        const companies = await scrapeCompaniesByCode(proffCode.code);
        
        // Filter out already saved companies
        const newCompanies = companies.filter(company => 
          !savedOrgNumbers.has(company.organisationNumber || company.organizationNumber)
        );
        
        // Add code info to each company
        newCompanies.forEach(company => {
          company.proffIndustryCode = proffCode.code;
          company.proffIndustryCodeName = proffCode.name;
        });
        
        allNewCompanies.push(...newCompanies);
        console.log(`Found ${newCompanies.length} new companies for ${proffCode.code}`);
        
      } catch (error) {
        console.error(`Error scraping companies for code ${proffCode.code}:`, error);
      }
    }

    console.log(`Total new companies found: ${allNewCompanies.length}`);
    return allNewCompanies;

  } catch (error) {
    console.error('Error in getNewCompanies:', error);
    return [];
  }
}

async function sendCompanyDigest(companies: any[]): Promise<void> {
  try {
    // Get all email addresses from database
    const emailHandler = await prisma.emailHandler.findFirst();
    
    if (!emailHandler || emailHandler.emails.length === 0) {
      console.log('No email addresses found in database');
      return;
    }

    console.log(`Sending digest to ${emailHandler.emails.length} email addresses`);

    // Create email content
    const subject = `Företagsökare - ${companies.length} nya företag hittade`;
    
    let htmlContent = `
      <h2>Företagsökare - Dagligt sammandrag</h2>
      <p>Hittade <strong>${companies.length}</strong> nya företag som matchar dina kriterier:</p>
    `;

    if (companies.length > 0) {
      // Group companies by ProffIndustryCode
      const companiesByCode: { [key: string]: any[] } = {};
      companies.forEach(company => {
        const key = `${company.proffIndustryCode} - ${company.proffIndustryCodeName}`;
        if (!companiesByCode[key]) {
          companiesByCode[key] = [];
        }
        companiesByCode[key].push(company);
      });

      htmlContent += '<div style="margin: 20px 0;">';
      
      Object.entries(companiesByCode).forEach(([codeKey, codeCompanies]) => {
        htmlContent += `
          <h3 style="color: #2563eb; margin-top: 20px;">${codeKey} (${codeCompanies.length} företag)</h3>
          <ul style="list-style-type: none; padding-left: 0;">
        `;
        
        codeCompanies.forEach(company => { // Show all companies
          htmlContent += `
            <li style="margin: 10px 0; padding: 10px; border-left: 3px solid #2563eb; background-color: #f8fafc;">
              <strong>${company.name}</strong><br>
              <small style="color: #64748b;">
                Org nr: ${company.organisationNumber || company.organizationNumber} | 
                Ort: ${company.location || 'Ej tillgängligt'} | 
                Grundat: ${company.foundedDate || company.registeredDate || 'Ej tillgängligt'}
              </small>
              ${company.detailUrl ? `<br><a href="${company.detailUrl}" style="color: #2563eb;">Visa detaljer →</a>` : ''}
            </li>
          `;
        });
        
        
        htmlContent += '</ul>';
      });
      
      htmlContent += '</div>';
    } else {
      htmlContent += '<p style="color: #64748b;">Inga nya företag hittades denna gång. Vi fortsätter att övervaka åt dig!</p>';
    }

    htmlContent += `
      <hr style="margin: 30px 0;">
      <p style="color: #64748b; font-size: 12px;">
        Detta automatiska sammandrag genererades ${new Date().toLocaleString('sv-SE')}<br>
        Drivs av Företagsökare
      </p>
    `;

    // Create sender and recipients
    const sentFrom = new Sender("no-reply@sharksushi.se");

    // Send to all emails
    for (const email of emailHandler.emails) {
      try {
        const recipients = [new Recipient(email, email)];

        const emailParams = new EmailParams()
          .setFrom(sentFrom)
          .setTo(recipients)
          .setReplyTo(sentFrom)
          .setSubject(subject)
          .setHtml(htmlContent)
          .setText(`Företagsökare: Hittade ${companies.length} nya företag. Vänligen visa HTML-versionen för fullständiga detaljer.`);

        await mailerSend.email.send(emailParams);
        console.log(`Email sent successfully to ${email}`);
        
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

  } catch (error) {
    console.error('Error sending company digest:', error);
  }
}

export async function GET() {
  try {
    console.log('🕐 Starting company digest cron job...');
    
    // Verify cron secret for security
  

    // Get new companies
    const newCompanies = await getNewCompanies();
    
    // Save new companies to database before sending digest
    if (newCompanies.length > 0) {
      const saveSuccess = await saveCompaniesToDatabase(newCompanies);
      if (!saveSuccess) {
        console.error('⚠️  Failed to save companies to database, but continuing with digest');
      }
    }
    
    // Send digest email
    await sendCompanyDigest(newCompanies);

    console.log('✅ Company digest cron job completed successfully');
    
    return NextResponse.json({
      success: true,
      companiesFound: newCompanies.length,
      timestamp: new Date().toISOString(),
      message: `Sammandrag skickat med ${newCompanies.length} nya företag`
    });

  } catch (error) {
    console.error('❌ Error in company digest cron job:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}