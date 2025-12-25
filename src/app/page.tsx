import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Server-side check: if no valid session cookie, redirect to login
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('app_session');
  // Check if session cookie exists and has a value (actual validation happens in API routes)
  const isLoggedIn = !!sessionCookie?.value && sessionCookie.value.length > 0;

  if (!isLoggedIn) {
    redirect('/login?redirectTo=/sales/dashboard');
  }

  // If logged in, redirect to the actual dashboard
  redirect('/sales/dashboard');
}
