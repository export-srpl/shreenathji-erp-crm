'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { useToast } from '@/hooks/use-toast';

// Simple world map geo URL
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface CountryData {
  country: string;
  countryCode: string;
  customerCount: number;
  revenue: number;
  growth: number;
}

export default function GlobalPresencePage() {
  const { toast } = useToast();
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        setIsLoading(true);
        // Fetch customers and aggregate by country
        const res = await fetch('/api/customers');
        if (!res.ok) throw new Error('Failed to fetch customers');
        
        const customers = await res.json();
        
        // Aggregate by country
        const aggregated = customers.reduce((acc: Record<string, CountryData>, customer: any) => {
          const country = customer.country || 'Unknown';
          const code = getCountryCode(country);
          
          if (!acc[country]) {
            acc[country] = {
              country,
              countryCode: code,
              customerCount: 0,
              revenue: 0,
              growth: Math.random() * 20 - 10, // Placeholder growth
            };
          }
          
          acc[country].customerCount += 1;
          // Revenue would come from invoices - placeholder for now
          acc[country].revenue += Math.random() * 100000;
          
          return acc;
        }, {});
        
        setCountryData(Object.values(aggregated));
      } catch (error) {
        console.error('Failed to fetch country data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not fetch global presence data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountryData();
  }, [toast]);

  const getCountryCode = (countryName: string): string => {
    // Simple mapping - in production, use a proper country code library
    const mapping: Record<string, string> = {
      'India': 'IN',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Germany': 'DE',
      'France': 'FR',
      'Japan': 'JP',
      'China': 'CN',
      'Canada': 'CA',
      'Australia': 'AU',
      'Brazil': 'BR',
    };
    return mapping[countryName] || '';
  };

  const getFillColor = (country: string) => {
    const data = countryData.find(d => d.country === country);
    if (!data) return '#E5E7EB';
    
    if (data.customerCount > 50) return '#10B981'; // High activity - green
    if (data.customerCount > 10) return '#3B82F6'; // Medium activity - blue
    if (data.customerCount > 0) return '#60A5FA'; // Low activity - light blue
    return '#E5E7EB'; // No activity - gray
  };

  const selectedData = useMemo(() => {
    if (!selectedCountry) return null;
    return countryData.find(d => d.country === selectedCountry);
  }, [selectedCountry, countryData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Global Presence</h1>
        <p className="text-muted-foreground">View our customer base across the world.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Countries Served
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold metric-value">{countryData.length}</p>
            <p className="text-sm text-muted-foreground mt-2">Active markets worldwide</p>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold metric-value">
              {countryData.reduce((sum, d) => sum + d.customerCount, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Across all countries</p>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold metric-value">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(countryData.reduce((sum, d) => sum + d.revenue, 0))}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Global revenue</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>World Map</CardTitle>
          <CardDescription>Click on a country to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-[600px] w-full rounded-lg overflow-hidden border">
            <ComposableMap projectionConfig={{ scale: 147 }}>
              <ZoomableGroup>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryName = geo.properties.NAME || geo.properties.NAME_LONG;
                      const fillColor = getFillColor(countryName);
                      const isSelected = selectedCountry === countryName;
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke={isSelected ? '#EF4444' : '#FFFFFF'}
                          strokeWidth={isSelected ? 2 : 0.5}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              fill: '#F59E0B',
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: { outline: 'none' },
                          }}
                          onClick={() => setSelectedCountry(countryName)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {selectedData && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg animate-slide-in">
              <h3 className="font-semibold text-lg mb-3">{selectedData.country}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{selectedData.customerCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(selectedData.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth</p>
                  <p className={`text-2xl font-bold ${selectedData.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {selectedData.growth >= 0 ? '+' : ''}{selectedData.growth.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">High Activity (&gt;50 customers)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm">Medium Activity (10-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-300"></div>
              <span className="text-sm">Low Activity (1-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300"></div>
              <span className="text-sm">No Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Country Breakdown</CardTitle>
          <CardDescription>Detailed statistics by country</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {countryData
              .sort((a, b) => b.customerCount - a.customerCount)
              .map((data) => (
                <div
                  key={data.country}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCountry(data.country)}
                >
                  <div>
                    <p className="font-semibold">{data.country}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.customerCount} customer{data.customerCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      }).format(data.revenue)}
                    </p>
                    <p className={`text-sm ${data.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}% growth
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

