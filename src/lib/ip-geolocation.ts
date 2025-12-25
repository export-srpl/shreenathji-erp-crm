/**
 * Simple IP geolocation utility
 * Uses a free API service to get location from IP address
 */

export interface IPLocation {
  city: string | null;
  country: string | null;
}

/**
 * Get location information from IP address
 * Uses ipapi.co free tier (1000 requests/day)
 */
export async function getLocationFromIP(ipAddress: string | null | undefined): Promise<IPLocation> {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
    // Local IP addresses
    return { city: 'Local', country: 'Local' };
  }

  try {
    // Using ipapi.co free tier (no API key required for basic usage)
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: {
        'User-Agent': 'SRPL-CRM/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`IP geolocation API returned ${response.status}`);
    }

    const data = await response.json();
    
    return {
      city: data.city || null,
      country: data.country_name || data.country || null,
    };
  } catch (error) {
    console.warn('Failed to get location from IP:', error);
    // Return unknown on error
    return { city: null, country: null };
  }
}

