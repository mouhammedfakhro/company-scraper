import { NextRequest, NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import prisma from '../../../../components/lib/prisma';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

async function scrapeCompaniesByCode(code: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/companies?page=1&code=${code}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch companies for code ${code}: ${response.status}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching companies for code ${code}:`, error);
    return [];
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
    const subject = `Company Scraper Digest - ${companies.length} New Companies Found`;
    
    let htmlContent = `
      <h2>Company Scraper Daily Digest</h2>
      <p>Found <strong>${companies.length}</strong> new companies that match your criteria:</p>
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
          <h3 style="color: #2563eb; margin-top: 20px;">${codeKey} (${codeCompanies.length} companies)</h3>
          <ul style="list-style-type: none; padding-left: 0;">
        `;
        
        codeCompanies.slice(0, 10).forEach(company => { // Limit to first 10 per code
          htmlContent += `
            <li style="margin: 10px 0; padding: 10px; border-left: 3px solid #2563eb; background-color: #f8fafc;">
              <strong>${company.name}</strong><br>
              <small style="color: #64748b;">
                Org #: ${company.organisationNumber || company.organizationNumber} | 
                Location: ${company.location || 'N/A'} | 
                Founded: ${company.foundedDate || company.registeredDate || 'N/A'}
              </small>
              ${company.detailUrl ? `<br><a href="${company.detailUrl}" style="color: #2563eb;">View Details →</a>` : ''}
            </li>
          `;
        });
        
        if (codeCompanies.length > 10) {
          htmlContent += `<li style="padding: 10px; font-style: italic;">... and ${codeCompanies.length - 10} more companies</li>`;
        }
        
        htmlContent += '</ul>';
      });
      
      htmlContent += '</div>';
    } else {
      htmlContent += '<p style="color: #64748b;">No new companies found this time. We\'ll keep monitoring for you!</p>';
    }

    htmlContent += `
      <hr style="margin: 30px 0;">
      <p style="color: #64748b; font-size: 12px;">
        This automated digest was generated at ${new Date().toLocaleString()}<br>
        Powered by Company Scraper
      </p>
    `;

    // Create sender and recipients
    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL || 'noreply@companyscraper.com', 
      'Company Scraper'
    );

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
          .setText(`Company Scraper Digest: Found ${companies.length} new companies. Please view the HTML version for full details.`);

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

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Starting company digest cron job...');
    
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get new companies
    const newCompanies = await getNewCompanies();
    
    // Send digest email
    await sendCompanyDigest(newCompanies);

    console.log('✅ Company digest cron job completed successfully');
    
    return NextResponse.json({
      success: true,
      companiesFound: newCompanies.length,
      timestamp: new Date().toISOString(),
      message: `Digest sent with ${newCompanies.length} new companies`
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