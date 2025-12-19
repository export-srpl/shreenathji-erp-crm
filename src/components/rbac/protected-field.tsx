'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

interface ProtectedFieldProps {
  resource: string;
  field: string;
  mode?: 'view' | 'edit';
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}

/**
 * Component that conditionally renders or disables fields based on permissions
 */
export function ProtectedField({
  resource,
  field,
  mode = 'view',
  children,
  className,
  fallback,
  hideIfNoAccess = false,
}: ProtectedFieldProps) {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) {
    return <div className={cn('opacity-50', className)}>{children}</div>;
  }

  if (!permissions) {
    // No permissions = hide or show fallback
    return hideIfNoAccess ? null : (fallback || null);
  }

  const resourcePerms = permissions.resources?.[resource as keyof typeof permissions.resources];
  if (!resourcePerms) {
    return hideIfNoAccess ? null : (fallback || null);
  }

  const fieldPerm = resourcePerms.fields?.[field];
  if (!fieldPerm) {
    // No field permission = allow (default behavior)
    return <div className={className}>{children}</div>;
  }

  const canView = fieldPerm.view !== false; // Default to true if not explicitly set
  const canEdit = fieldPerm.edit === true;

  if (mode === 'view' && !canView) {
    return hideIfNoAccess ? null : (fallback || <div className={cn('text-muted-foreground italic', className)}>Hidden</div>);
  }

  if (mode === 'edit' && !canEdit) {
    // Show field but disable it
    return (
      <div className={cn('opacity-60', className)}>
        {typeof children === 'object' && 'props' in children && children.props
          ? { ...children, props: { ...children.props, disabled: true, readOnly: true } }
          : children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

