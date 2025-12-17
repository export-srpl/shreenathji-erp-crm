import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Server-side check: if no valid session cookie, redirect to login
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('app_session');
  const isLoggedIn = sessionCookie?.value === 'valid';

  if (!isLoggedIn) {
    redirect('/login?redirectTo=/sales/dashboard');
  }

  // If logged in, redirect to the actual dashboard
  redirect('/sales/dashboard');
}
