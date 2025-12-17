'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserDialogOpen, setUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | undefined>(undefined);
  const { toast } = useToast();

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load users',
          description: 'Could not fetch users from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);
  
  const handleSaveUser = async (user: User | Omit<User, 'id' | 'avatarUrl' | 'status'>) => {
    try {
      const isEdit = 'id' in user;
      const url = isEdit ? `/api/users/${user.id}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          // Password only for new users or if explicitly provided
          ...(isEdit ? {} : { password: 'TempPassword123!' }), // Default password for new users
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to save user');
      }

      const savedUser = await res.json();

      if (isEdit) {
        setUsers(users.map((u) => (u.id === savedUser.id ? savedUser : u)));
        toast({
          title: 'User Updated',
          description: `User "${savedUser.name}" has been successfully updated.`,
        });
      } else {
        setUsers([...users, savedUser]);
        toast({
          title: 'User Added',
          description: `User "${savedUser.name}" has been successfully added.`,
        });
      }

      setUserDialogOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
      toast({
        variant: 'destructive',
        title: isEdit ? 'Failed to update user' : 'Failed to add user',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    const userName = users.find(u => u.id === userId)?.name || 'User';
    
    if (!confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to delete user');
      }

      setUsers(users.filter((u) => u.id !== userId));
      toast({
        title: 'User Deleted',
        description: `User "${userName}" has been successfully removed.`,
      });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete user',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };
  
  const handleToggleStatus = (userId: string, newStatus: boolean) => {
    // Status toggle is not yet implemented in the database schema
    // This is a placeholder for future implementation
    const status = newStatus ? 'Active' : 'Inactive';
    toast({
      title: 'Status Update',
      description: `Status toggle is not yet implemented. User status would be changed to ${status}.`,
    });
  };

  const openAddDialog = () => {
    setUserToEdit(undefined);
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setUserDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Users &amp; Roles</h1>
          <p className="text-muted-foreground">Manage who can access the ERP and what they can do.</p>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2" />
          Add New User
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Add, edit, or remove users and manage their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No users found. Add your first user to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role / Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person" />
                          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                        <Switch
                            id={`status-${user.id}`}
                            checked={user.status === 'Active'}
                            onCheckedChange={(checked) => handleToggleStatus(user.id, checked)}
                        />
                        <span className={user.status === 'Active' ? 'text-green-600' : 'text-red-600'}>
                            {user.status}
                        </span>
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AddUserDialog
        open={isUserDialogOpen}
        onOpenChange={setUserDialogOpen}
        onUserSaved={handleSaveUser}
        userToEdit={userToEdit}
      />
    </div>
  );
}
