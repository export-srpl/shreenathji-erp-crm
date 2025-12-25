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
import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';

const navItems = [
  { href: '/sales/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Sales',
    icon: IndianRupee,
    items: [
      { href: '/sales/leads', label: 'Leads' },
      { href: '/sales/leads/forms', label: 'Lead Forms' },
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
    label: 'Company',
    icon: Users,
    items: [
      { href: '/customers', label: 'All Companies' },
      { href: '/customers/add', label: 'Add Company' },
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
    label: 'Reports',
    icon: BarChart3,
    items: [
      { href: '/reports/leads', label: 'Leads Reports' },
      { href: '/reports/deals-pipeline', label: 'Deals Pipeline Reports' },
      { href: '/reports/contacts', label: 'Contact Reports' },
      { href: '/reports/customers', label: 'Company Reports' },
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
      { href: '/security/sessions', label: 'Active Sessions' },
      { href: '/security/approvals', label: 'Approvals' },
      { href: '/security/alerts', label: 'Security Alerts' },
      { href: '/security/audit-logs', label: 'Audit Logs' },
    ],
  },
  { href: '/users-roles', label: 'Users & Roles', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Fetch pending approvals count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/approval-requests/count');
        if (res.ok) {
          const data = await res.json();
          setPendingApprovalsCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending approvals count:', error);
      }
    };

    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand the section that contains the current pathname
  // This ensures the correct section is open when navigating between different sections
  useEffect(() => {
    const activeItem = navItems.find(item => 
      item.items && item.items.some(sub => pathname.startsWith(sub.href))
    );
    if (activeItem && openItem !== activeItem.label) {
      // Only update if we're navigating to a different section
      setOpenItem(activeItem.label);
    }
  }, [pathname]);

  const toggleOpen = (label: string) => {
    // If clicking the same item, close it. Otherwise, open the new item (closing the previous one)
    setOpenItem(prev => prev === label ? null : label);
  }

  return (
    <SidebarMenu>
      {navItems.map((item) =>
        item.items ? (
          <SidebarMenuItem key={item.label}>
            <Collapsible open={openItem === item.label} onOpenChange={() => toggleOpen(item.label)}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={item.items.some(sub => pathname.startsWith(sub.href))}
                  data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}-toggle`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${openItem === item.label ? 'rotate-180' : ''}`} />
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
                        data-testid={`sidebar-nav-${subItem.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Link href={subItem.href || '#'} className="flex items-center justify-between w-full">
                          <span>{subItem.label}</span>
                          {subItem.href === '/security/approvals' && pendingApprovalsCount > 0 && (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                              {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
                            </Badge>
                          )}
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
              data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
