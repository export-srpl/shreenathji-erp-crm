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
import { Mail, Phone, MapPin, Building2, MoreVertical, User, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  company: string;
  country: string | null;
  state: string | null;
  city: string | null;
  source: 'customer' | 'lead';
  sourceId: string;
  tags: string[];
}

interface ContactsGridProps {
  contacts: Contact[];
}

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600">
    <path d="M20.52 3.48A11.94 11.94 0 0012.01 0C5.39 0 .04 5.35.04 11.97c0 2.11.55 4.16 1.6 5.97L0 24l6.23-1.63A11.9 11.9 0 0012 24c6.62 0 11.97-5.35 11.97-11.97 0-3.2-1.25-6.21-3.45-8.55zM12 21.6c-1.87 0-3.7-.5-5.29-1.45l-.38-.23-3.7.97.99-3.6-.25-.41A9.57 9.57 0 012.4 12C2.4 6.89 6.89 2.4 12 2.4c2.55 0 4.95.99 6.75 2.79A9.5 9.5 0 0121.6 12c0 5.11-4.49 9.6-9.6 9.6zm5.01-6.96c-.27-.14-1.6-.79-1.84-.88-.24-.09-.41-.14-.59.14-.17.27-.68.88-.83 1.06-.15.18-.31.2-.58.07-.27-.14-1.16-.43-2.2-1.37-.81-.71-1.36-1.59-1.52-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45l-.5-.01c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.34.98 2.63 1.12 2.81.14.18 1.93 2.94 4.67 4.01.65.28 1.15.45 1.54.57.65.21 1.23.18 1.7.11.52-.08 1.6-.66 1.83-1.29.23-.63.23-1.15.16-1.27-.07-.12-.25-.2-.52-.34z"></path>
  </svg>
);

export function ContactsGrid({ contacts }: ContactsGridProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTagColor = (tag: string) => {
    if (tag.toLowerCase().includes('customer')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (tag.toLowerCase().includes('lead')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (tag.toLowerCase().includes('qualified') || tag.toLowerCase().includes('converted')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No contacts found</p>
        <p className="text-sm text-muted-foreground mt-2">Contacts will appear here from customers and leads</p>
      </div>
    );
  }

  return (
    <div className="grid-contacts">
      {contacts.map((contact) => (
        <Card key={contact.id} className="card-grid group animate-fade-in">
          <CardContent className="p-6">
            {/* Header with Avatar */}
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-20 w-20 border-4 border-primary/20 mb-3">
                <AvatarImage src={undefined} alt={contact.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-xl">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg text-center group-hover:text-primary transition-colors">
                {contact.name}
              </h3>
              {contact.designation && (
                <p className="text-sm text-muted-foreground text-center mt-1">{contact.designation}</p>
              )}
            </div>

            {/* Company */}
            <div className="flex items-center gap-2 text-sm mb-3 justify-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{contact.company}</span>
            </div>

            {/* Contact Information */}
            <div className="space-y-2 mb-4">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-primary transition-colors truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              
              {(contact.city || contact.state || contact.country) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {contact.tags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    className={cn('text-xs font-medium border', getTagColor(tag))}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer with Quick Actions */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
              {contact.email && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                >
                  <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {contact.phone && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    asChild
                  >
                    <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WhatsAppIcon />
                    </a>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {contact.source === 'customer' ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/customers/${contact.sourceId}`}>
                        View Customer
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href={`/sales/leads/add?leadId=${contact.sourceId}`}>
                        View Lead
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

