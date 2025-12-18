'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  KanbanSquare,
  FlaskConical,
  Users,
  Building2,
  FileText,
  Truck,
  IndianRupee,
  ShoppingBag,
  Factory,
  BarChart3,
  Folder,
  Globe,
  BrainCircuit,
  Smartphone,
  Shield,
  HeartHandshake,
  ChevronDown,
  Contact,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Sales',
    icon: IndianRupee,
    items: [
      { href: '/sales/leads', label: 'Leads' },
      { href: '/deals', label: 'Deals Pipeline' },
      { href: '/sales/quote', label: 'Quote' },
      { href: '/sales/proforma-invoice', label: 'Proforma Invoice' },
      { href: '/sales/sales-order', label: 'Sales Order' },
      { href: '/sales/create-invoice', label: 'Invoices' },
      { href: '/sales/dashboard', label: 'Sales Dashboard' },
    ],
  },
  // { href: '/qc/coa-generator', label: 'COA Generator', icon: FlaskConical },
    {
    label: 'Customers',
    icon: Users,
    items: [
      { href: '/customers', label: 'All Customers' },
      { href: '/customers/add', label: 'Add Customer' },
      { href: '/contacts', label: 'Contacts' },
    ],
  },
    {
    label: 'Inventory',
    icon: Building2,
    items: [
      { href: '/inventory/products', label: 'Products' },
    ],
  },
  {
    label: 'Logistics',
    icon: Truck,
     items: [
      { href: '/logistics/dispatch-register', label: 'Dispatch Register' },
    ],
  },
  {
    label: 'Finance',
    icon: FileText,
    items: [
      { href: '/finance/payments-received', label: 'Payments Received' },
    ],
  },
  {
    label: 'Mobile',
    icon: Smartphone,
    items: [
      { href: '/mobile/notifications', label: 'Push Notifications' },
      { href: '/mobile/geo-logs', label: 'Geo-location Logs' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { href: '/reports/leads', label: 'Leads Reports' },
      { href: '/reports/deals-pipeline', label: 'Deals Pipeline Reports' },
      { href: '/reports/contacts', label: 'Contact Reports' },
      { href: '/reports/customers', label: 'Customer Reports' },
      { href: '/analytics/global-presence', label: 'Global Presence' },
    ],
  },
  { href: '/documents', label: 'Documents', icon: Folder },
  {
    label: 'Security',
    icon: Shield,
    items: [
      { href: '/security', label: 'Overview' },
      { href: '/security/2fa', label: '2FA' },
    ],
  },
  { href: '/users-roles', label: 'Users & Roles', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleOpen = (label: string) => {
    setOpenItems(prev => prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]);
  }

  return (
    <SidebarMenu>
      {navItems.map((item) =>
        item.items ? (
          <SidebarMenuItem key={item.label}>
            <Collapsible open={openItems.includes(item.label)} onOpenChange={() => toggleOpen(item.label)}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={item.items.some(sub => pathname.startsWith(sub.href))}
                  className="w-full font-semibold"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <item.icon />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" data-state={openItems.includes(item.label) ? 'open' : 'closed'}/>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu className="ml-7 my-1 space-y-1 border-l pl-2">
                  {item.items.map((subItem) => (
                    <SidebarMenuItem key={subItem.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === subItem.href || pathname.startsWith(`${subItem.href}/`)}
                        disabled={(subItem as any).disabled}
                        tooltip={subItem.label}
                        className="font-normal"
                      >
                        <Link href={subItem.href || '#'}>
                          <span>{subItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              disabled={(item as any).disabled}
              tooltip={item.label}
            >
              <Link href={item.href || '#'}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  );
}
