import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateSRPLId } from '../src/lib/srpl-id-generator';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users with different roles
  console.log('👤 Creating test users...');
  
  const adminPassword = await bcrypt.hash('admin123', 12);
  const salesPassword = await bcrypt.hash('sales123', 12);
  const financePassword = await bcrypt.hash('finance123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shreenathjirasayan.com' },
    update: {},
    create: {
      email: 'admin@shreenathjirasayan.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash: adminPassword,
      firebaseUid: 'test-admin-uid',
    },
  });

  // Create test user for TestSprite tests
  const testSalesPassword = await bcrypt.hash('Cre8ive#2025', 12);
  const testSalesUser = await prisma.user.upsert({
    where: { email: 'sales.ex@shreenathjirasayan.com' },
    update: {},
    create: {
      email: 'sales.ex@shreenathjirasayan.com',
      name: 'Test Sales User',
      role: 'sales',
      salesScope: 'domestic_sales',
      passwordHash: testSalesPassword,
      firebaseUid: 'test-sales-ex-uid',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@shreenathjirasayan.com' },
    update: {},
    create: {
      email: 'sales@shreenathjirasayan.com',
      name: 'Sales User',
      role: 'sales',
      salesScope: 'domestic_sales',
      passwordHash: salesPassword,
      firebaseUid: 'test-sales-uid',
    },
  });

  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@shreenathjirasayan.com' },
    update: {},
    create: {
      email: 'finance@shreenathjirasayan.com',
      name: 'Finance User',
      role: 'finance',
      passwordHash: financePassword,
      firebaseUid: 'test-finance-uid',
    },
  });

  console.log('✅ Created test users');

  // Create sample products
  console.log('📦 Creating sample products...');
  
  const products = [
    {
      name: 'SHREEBOND HM385',
      sku: 'SRB-HM385',
      hsnCode: '35069100',
      description: 'High-performance adhesive for industrial applications',
      unitPrice: 1250.00,
      currency: 'INR',
      stockQty: 500,
    },
    {
      name: 'SHREEBOND HM386',
      sku: 'SRB-HM386',
      hsnCode: '35069100',
      description: 'Premium adhesive variant',
      unitPrice: 1350.00,
      currency: 'INR',
      stockQty: 300,
    },
    {
      name: 'SHREEBOND HM387',
      sku: 'SRB-HM387',
      hsnCode: '35069100',
      description: 'Specialty adhesive for export markets',
      unitPrice: 15.50,
      currency: 'USD',
      stockQty: 200,
    },
    {
      name: 'SHREEBOND HM388',
      sku: 'SRB-HM388',
      hsnCode: '35069100',
      description: 'Heavy-duty industrial adhesive',
      unitPrice: 1450.00,
      currency: 'INR',
      stockQty: 400,
    },
    {
      name: 'SHREEBOND HM389',
      sku: 'SRB-HM389',
      hsnCode: '35069100',
      description: 'Waterproof adhesive solution',
      unitPrice: 1550.00,
      currency: 'INR',
      stockQty: 350,
    },
    {
      name: 'SHREEBOND HM390',
      sku: 'SRB-HM390',
      hsnCode: '35069100',
      description: 'High-temperature resistant adhesive',
      unitPrice: 1650.00,
      currency: 'INR',
      stockQty: 250,
    },
    {
      name: 'SHREEBOND HM391',
      sku: 'SRB-HM391',
      hsnCode: '35069100',
      description: 'Fast-curing adhesive',
      unitPrice: 1750.00,
      currency: 'INR',
      stockQty: 180,
    },
    {
      name: 'SHREEBOND HM392',
      sku: 'SRB-HM392',
      hsnCode: '35069100',
      description: 'Flexible bonding solution',
      unitPrice: 18.00,
      currency: 'USD',
      stockQty: 150,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log('✅ Created sample products');

  // Create sample customers
  console.log('🏢 Creating sample customers...');
  
  const customers = [
    {
      companyName: 'Srivilas Hydrotech Pvt. Ltd.',
      contactName: 'Rajesh Kumar',
      contactEmail: 'rajesh@srivilas.com',
      contactPhone: '+91-9876543210',
      customerType: 'domestic' as const,
      country: 'India',
      state: 'Gujarat',
      billingAddress: '123 Industrial Area\nAhmedabad, Gujarat 380001\nIndia',
      shippingAddress: '123 Industrial Area\nAhmedabad, Gujarat 380001\nIndia',
      gstNo: '24AABCU9603R1ZX',
    },
    {
      companyName: 'Shreenathji Rasayan Pvt. Ltd.',
      contactName: 'Priya Sharma',
      contactEmail: 'priya@shreenathjirasayan.com',
      contactPhone: '+91-9876543211',
      customerType: 'domestic' as const,
      country: 'India',
      state: 'Gujarat',
      billingAddress: '456 Chemical Zone\nVadodara, Gujarat 390001\nIndia',
      shippingAddress: '456 Chemical Zone\nVadodara, Gujarat 390001\nIndia',
      gstNo: '24AABCU9603R1ZY',
    },
    {
      companyName: 'Global Chemicals Inc.',
      contactName: 'John Smith',
      contactEmail: 'john@globalchemicals.com',
      contactPhone: '+1-555-123-4567',
      customerType: 'international' as const,
      country: 'United States',
      state: 'California',
      billingAddress: '789 Business Park\nLos Angeles, CA 90001\nUnited States',
      shippingAddress: '789 Business Park\nLos Angeles, CA 90001\nUnited States',
    },
    {
      companyName: 'European Adhesives Ltd.',
      contactName: 'Maria Garcia',
      contactEmail: 'maria@euadhesives.com',
      contactPhone: '+44-20-1234-5678',
      customerType: 'international' as const,
      country: 'United Kingdom',
      state: 'London',
      billingAddress: '321 Manufacturing Street\nLondon, UK SW1A 1AA\nUnited Kingdom',
      shippingAddress: '321 Manufacturing Street\nLondon, UK SW1A 1AA\nUnited Kingdom',
    },
    {
      companyName: 'Asian Industrial Solutions',
      contactName: 'Li Wei',
      contactEmail: 'liwei@asianindustrial.com',
      contactPhone: '+86-10-1234-5678',
      customerType: 'international' as const,
      country: 'China',
      state: 'Beijing',
      billingAddress: '555 Tech District\nBeijing, 100000\nChina',
      shippingAddress: '555 Tech District\nBeijing, 100000\nChina',
    },
  ];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    // Check if customer already exists by company name
    const existing = await prisma.customer.findFirst({
      where: { companyName: customer.companyName },
    });

    if (existing) {
      // Update existing customer (preserve existing srplId if it exists)
      await prisma.customer.update({
        where: { id: existing.id },
        data: customer,
      });
    } else {
      // Generate SRPL ID for new customer
      const srplId = await generateSRPLId({ 
        moduleCode: 'CUST',
        prisma,
      });
      // Create new customer with SRPL ID
      await prisma.customer.create({
        data: {
          ...customer,
          srplId,
        },
      });
    }
  }

  console.log('✅ Created sample customers');

  // Create sample leads
  console.log('📋 Creating sample leads...');
  
  const allProducts = await prisma.product.findMany();
  const allCustomers = await prisma.customer.findMany();

  if (allProducts.length > 0 && allCustomers.length > 0) {
    const leadSources = ['Website', 'Referral', 'Exhibition', 'Cold Call', 'IndiaMART', 'Other'];
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted'];

    const leads = [
      {
        companyName: 'Tech Solutions India',
        contactName: 'Amit Patel',
        email: 'amit@techsolutions.in',
        phone: '+91-9876543220',
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
        status: 'New',
        source: 'Website',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Industrial Adhesives Co.',
        contactName: 'Vikram Singh',
        email: 'vikram@indadhesives.com',
        phone: '+91-9876543221',
        country: 'India',
        state: 'Delhi',
        city: 'New Delhi',
        status: 'Contacted',
        source: 'IndiaMART',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Chemical Distributors LLC',
        contactName: 'David Johnson',
        email: 'david@chemdist.com',
        phone: '+1-555-234-5678',
        country: 'United States',
        state: 'Texas',
        city: 'Houston',
        status: 'Qualified',
        source: 'Exhibition',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Bonding Solutions Ltd.',
        contactName: 'Sarah Williams',
        email: 'sarah@bondingsolutions.co.uk',
        phone: '+44-20-2345-6789',
        country: 'United Kingdom',
        state: 'Manchester',
        city: 'Manchester',
        status: 'New',
        source: 'Referral',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Adhesive Manufacturers Inc.',
        contactName: 'Robert Brown',
        email: 'robert@adhesivemfg.com',
        phone: '+1-555-345-6789',
        country: 'United States',
        state: 'New York',
        city: 'New York',
        status: 'Contacted',
        source: 'Cold Call',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Chemical Supply Chain',
        contactName: 'Anjali Mehta',
        email: 'anjali@chemsupply.in',
        phone: '+91-9876543222',
        country: 'India',
        state: 'Karnataka',
        city: 'Bangalore',
        status: 'Qualified',
        source: 'Website',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Global Adhesive Partners',
        contactName: 'Michael Chen',
        email: 'michael@globaladhesive.com',
        phone: '+86-10-2345-6789',
        country: 'China',
        state: 'Shanghai',
        city: 'Shanghai',
        status: 'New',
        source: 'Exhibition',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Industrial Bonding Solutions',
        contactName: 'Emma Wilson',
        email: 'emma@indbonding.com',
        phone: '+44-20-3456-7890',
        country: 'United Kingdom',
        state: 'Birmingham',
        city: 'Birmingham',
        status: 'Contacted',
        source: 'Referral',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Premium Adhesives Pvt. Ltd.',
        contactName: 'Rahul Verma',
        email: 'rahul@premiumadhesives.in',
        phone: '+91-9876543223',
        country: 'India',
        state: 'Punjab',
        city: 'Chandigarh',
        status: 'Qualified',
        source: 'IndiaMART',
        ownerId: testSalesUser.id,
      },
      {
        companyName: 'Chemical Innovations Corp.',
        contactName: 'Jennifer Lee',
        email: 'jennifer@cheminnovations.com',
        phone: '+1-555-456-7890',
        country: 'United States',
        state: 'Illinois',
        city: 'Chicago',
        status: 'New',
        source: 'Website',
        ownerId: testSalesUser.id,
      },
    ];

    for (const lead of leads) {
      // Generate SRPL ID for each lead
      const srplId = await generateSRPLId({ 
        moduleCode: 'LEAD',
        prisma,
      });
      await prisma.lead.create({
        data: {
          ...lead,
          srplId,
        },
      });
    }

    console.log('✅ Created sample leads');
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@shreenathjirasayan.com / admin123');
  console.log('   Sales: sales@shreenathjirasayan.com / sales123');
  console.log('   Finance: finance@shreenathjirasayan.com / finance123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

