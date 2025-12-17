
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function IpWhitelistPage() {
    const [ipAddress, setIpAddress] = useState('');
    const [whitelistedIps, setWhitelistedIps] = useState(['202.54.12.34', '117.211.87.190']);
    const { toast } = useToast();

    const handleAddIp = () => {
        if (ipAddress && !whitelistedIps.includes(ipAddress)) {
            setWhitelistedIps([...whitelistedIps, ipAddress]);
            toast({ title: "IP Added", description: `${ipAddress} has been added to the whitelist.` });
            setIpAddress('');
        } else {
             toast({ variant: 'destructive', title: "Invalid IP", description: "Please enter a valid and unique IP address." });
        }
    };
    
    const handleRemoveIp = (ipToRemove: string) => {
        setWhitelistedIps(whitelistedIps.filter(ip => ip !== ipToRemove));
        toast({ title: "IP Removed", description: `${ipToRemove} has been removed from the whitelist.` });
    };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">IP Whitelisting</h1>
        <p className="text-muted-foreground">Restrict access to the ERP system to specific IP addresses.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Whitelisted IPs</CardTitle>
          <CardDescription>Only users from these IP addresses will be able to log in.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-2 mb-6">
                <Input 
                    placeholder="Enter new IP address" 
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                />
                <Button onClick={handleAddIp}>
                    <PlusCircle className="mr-2" />
                    Add IP
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {whitelistedIps.map(ip => (
                         <TableRow key={ip}>
                            <TableCell className="font-mono">{ip}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveIp(ip)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {whitelistedIps.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>No IP addresses have been whitelisted yet.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
