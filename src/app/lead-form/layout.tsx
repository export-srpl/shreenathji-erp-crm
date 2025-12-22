export default function LeadFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render children directly without any layout wrapper
  // This ensures customers only see the form, no navigation or sidebar
  return <>{children}</>;
}

