'use client';

import { useEffect, useState } from 'react';

export interface UserPermissions {
  role: string;
  resources: Record<string, {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    fields: Record<string, { view: boolean; edit: boolean }>;
  }>;
}

/**
 * Hook to get current user's permissions
 * Fetches permissions from /api/auth/permissions
 */
export function usePermissions(): { permissions: UserPermissions | null; isLoading: boolean } {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch('/api/auth/permissions');
        if (res.ok) {
          const data = await res.json();
          setPermissions(data);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, isLoading };
}

