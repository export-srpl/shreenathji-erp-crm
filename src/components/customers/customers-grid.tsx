'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Mail, Phone, MapPin, Building2, Edit, Trash2, Eye } from 'lucide-react';
import type { Customer } from '@/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface CustomersGridProps {
  customers: Customer[];
  onDelete?: (customerId: string) => void;
}

export function CustomersGrid({ customers, onDelete }: CustomersGridProps) {
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'domestic':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'international':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleDelete = async (customerId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete ${companyName}?`)) return;
    
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete customer');

      toast({
        title: 'Customer deleted',
        description: `${companyName} has been deleted successfully.`,
      });

      onDelete?.(customerId);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete customer',
        description: 'Please try again later.',
      });
    }
  };

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No customers found</p>
        <p className="text-sm text-muted-foreground mt-2">Get started by adding your first customer</p>
      </div>
    );
  }

  return (
    <div className="grid-customers">
      {customers.map((customer) => (
        <Card key={customer.id} className="card-grid group animate-fade-in">
          <CardContent className="p-6">
            {/* Header with Avatar and Actions */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={undefined} alt={customer.companyName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                    {getInitials(customer.companyName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                    {customer.companyName}
                  </h3>
                  <Badge className={`mt-1 text-xs ${getCustomerTypeColor(customer.customerType)}`}>
                    {customer.customerType || 'Customer'}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/customers/edit/${customer.id}`} className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(customer.id, customer.companyName)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Contact Information */}
            <div className="space-y-2 mb-4">
              {customer.contactPerson?.name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{customer.contactPerson.name}</span>
                  {customer.contactPerson.designation && (
                    <span className="text-xs">• {customer.contactPerson.designation}</span>
                  )}
                </div>
              )}
              
              {customer.contactPerson?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a
                    href={`mailto:${customer.contactPerson.email}`}
                    className="hover:text-primary transition-colors truncate"
                  >
                    {customer.contactPerson.email}
                  </a>
                </div>
              )}
              
              {customer.contactPerson?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <a
                    href={`tel:${customer.contactPerson.phone}`}
                    className="hover:text-primary transition-colors"
                  >
                    {customer.contactPerson.phone}
                  </a>
                </div>
              )}
              
              {(customer.country || customer.state) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {[customer.city, customer.state, customer.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Footer with Quick Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex gap-2">
                {customer.contactPerson?.email && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={`mailto:${customer.contactPerson.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {customer.contactPerson?.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={`tel:${customer.contactPerson.phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers/${customer.id}`}>View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

