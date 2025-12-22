
export type Payment = {
  id: string;
  clientId: string;
  clientName: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'Bank Transfer' | 'Cheque' | 'Credit Card' | 'Other';
  transactionId?: string;
  status: 'Pending' | 'Cleared';
};


export type Deal = {
  id: string;
  srplId?: string | null;
  title: string;
  company: string;
  value: number;
  stage: 'Prospecting' | 'Technical Discussion' | 'Quotation' | 'Negotiation' | 'Won' | 'Lost';
  contact: {
    name: string;
    avatarUrl: string;
  };
  customerId: string;
};

export type DealStage = 'Prospecting' | 'Technical Discussion' | 'Quotation' | 'Negotiation' | 'Won' | 'Lost';

export type Lead = {
  id: string;
  srplId?: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Disqualified' | 'Converted';
  leadSource: string;
  assignedSalesperson: string;
  // For domestic vs international classification from lead capture
  customerType?: 'domestic' | 'international';
  country: string;
  state?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstNo?: string;
  contactPerson?: {
      name: string;
      email: string;
      designation: string;
      phone: string;
  };
  productInterest?: string;
  createdAt: string;
};

export type Product = {
    id: string;
    srplId?: string | null;
    productName: string;
    category: string;
    sku?: string;
    hsnCode?: string;
};

export type Customer = {
    id: string;
    srplId?: string | null;
    leadId?: string; // Link to the original lead
    customerType: 'domestic' | 'international';
    companyName: string;
    billingAddress: string;
    shippingAddress: string;
    country: string;
    state?: string; // For domestic
    cityState?: string; // For international
    gstNo?: string;
    contactPerson: {
        name: string;
        email: string;
        designation: string;
        phone: string;
    };
};

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Purchase' | 'Production' | 'QC' | 'Sales' | 'Logistics' | 'Finance' | 'Customer';
    status: 'Active' | 'Inactive';
    avatarUrl?: string;
    moduleAccess: {
        [key:string]: boolean;
    };
};

export type LineItem = {
  productId: string;
  productName: string;
  hsnCode: string;
  qty: number;
  rate: number;
  amount: number;
};

export type SalesDocument = {
    id: string;
    customerId: string;
    customerName?: string;
    date?: string;
    currency: string;
    lineItems: LineItem[];
    amount?: number;
    poNumber?: string;
    poDate?: string;
    status?: string;
}

export type SalesOrder = SalesDocument & {
    status: 'Draft' | 'Confirmed' | 'Partially Executed' | 'Completed' | 'Cancelled';
};

export type DispatchRegisterEntry = {
    id: string;
    productName: string;
    orderQty: number;
    dispatchedQty: number;
    wipQty: number;
};
