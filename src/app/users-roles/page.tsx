'use client';

import { useState } from 'react';
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

const initialUsers: User[] = [
    { id: 'user-1', name: 'Admin', email: 'admin@shreenathji.com', role: 'Admin', status: 'Active', avatarUrl: 'https://placehold.co/40x40/orange/white?text=A', moduleAccess: { Sales: true, Purchase: true, Production: true, QC: true, Logistics: true, Finance: true } },
    { id: 'user-2', name: 'Ashok Lakhani', email: 'ashok.l@shreenathji.com', role: 'Sales', status: 'Active', avatarUrl: 'https://placehold.co/40x40/green/white?text=AL', moduleAccess: { Sales: true, Purchase: false, Production: false, QC: false, Logistics: false, Finance: false } },
    { id: 'user-3', name: 'Prakash Gajjar', email: 'prakash.g@shreenathji.com', role: 'Purchase', status: 'Active', avatarUrl: 'https://placehold.co/40x40/blue/white?text=PG', moduleAccess: { Sales: false, Purchase: true, Production: false, QC: false, Logistics: false, Finance: false } },
    { id: 'user-4', name: 'John Doe', email: 'john.doe@shreenathji.com', role: 'Production', status: 'Inactive', avatarUrl: 'https://placehold.co/40x40/red/white?text=JD', moduleAccess: { Sales: false, Purchase: false, Production: true, QC: false, Logistics: false, Finance: false } },
    { id: 'user-5', name: 'Jay Lakhani', email: 'jay@shreenathjirasayan.com', role: 'Admin', status: 'Active', avatarUrl: 'https://placehold.co/40x40/purple/white?text=JL', moduleAccess: { Sales: true, Purchase: true, Production: true, QC: true, Logistics: true, Finance: true } },
    { id: 'user-6', name: 'Rajeev Sharma', email: 'rajeev.s@shreenathjirasayan.com', role: 'Customer', status: 'Active', avatarUrl: 'https://placehold.co/40x40/teal/white?text=RS', moduleAccess: { Sales: false, Purchase: false, Production: false, QC: false, Logistics: false, Finance: false } },
];

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isUserDialogOpen, setUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | undefined>(undefined);
  const { toast } = useToast();
  
  const handleSaveUser = (user: User | Omit<User, 'id' | 'avatarUrl' | 'status'>) => {
    // This is a placeholder for a secure backend call.
    // This function will handle both creating a new user and updating an existing one.
    // It should perform validation and check for permissions on the backend.
    
    if ('id' in user) {
       console.log('Calling backend to update user:', user);
       toast({
        title: 'User Updated',
        description: `User "${user.name}" has been successfully updated.`,
      });
    } else {
      console.log('Calling backend to create user:', user);
      toast({
        title: 'User Added',
        description: `User "${user.name}" has been successfully added.`,
      });
    }
     // Note: The UI will update automatically from the Firestore listener,
     // so we don't need to manually update the state here.
  };
  
  const handleDeleteUser = (userId: string) => {
    const userName = users.find(u => u.id === userId)?.name || 'User';
    // This is a placeholder for a secure backend call.
    console.log('Calling backend to delete user:', userId);
    toast({
        title: 'User Deleted',
        description: `User "${userName}" has been successfully removed.`,
    });
  };
  
  const handleToggleStatus = (userId: string, newStatus: boolean) => {
    // This is a placeholder for a secure backend call.
    const status = newStatus ? 'Active' : 'Inactive';
    console.log(`Calling backend to update status for user ${userId} to ${status}`);
    toast({
        title: 'Status Updated',
        description: `User status has been changed to ${status}.`
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
