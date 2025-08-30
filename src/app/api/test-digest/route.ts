import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Call the digest endpoint manually for testing
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/cron/company-digest`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    return NextResponse.json({
      message: 'Test digest triggered',
      result: result,
      status: response.status
    });

  } catch (error) {
    console.error('Error triggering test digest:', error);
    return NextResponse.json({
      error: 'Failed to trigger test digest',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}