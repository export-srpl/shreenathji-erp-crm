
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect } from 'react';
import type { User } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';

const roles = ['Admin', 'Purchase', 'Production', 'QC', 'Sales', 'Logistics', 'Finance', 'Customer'];
const modules = ['Sales', 'Purchase', 'Production', 'QC', 'Logistics', 'Finance'];

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSaved: (user: User | Omit<User, 'id' | 'avatarUrl' | 'status'>) => void;
  userToEdit?: User;
};


export function AddUserDialog({ open, onOpenChange, onUserSaved, userToEdit }: AddUserDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});

  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (open) {
        if (isEditMode && userToEdit) {
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setRole(userToEdit.role);
            setModuleAccess(userToEdit.moduleAccess || {});
        } else {
            setName('');
            setEmail('');
            setRole('');
            setModuleAccess(
              modules.reduce((acc, module) => ({ ...acc, [module]: false }), {})
            );
        }
    }
  }, [userToEdit, isEditMode, open]);


  const handleModuleAccessChange = (moduleName: string, checked: boolean) => {
    setModuleAccess(prev => ({...prev, [moduleName]: checked}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if(!name || !email || !role) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all required fields.',
        });
        return;
    }

    const userData = { name, email, role, moduleAccess };

    if (isEditMode && userToEdit) {
      onUserSaved({ ...userToEdit, ...userData });
    } else {
      onUserSaved(userData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
             {isEditMode 
                ? "Update the details and module access for this user." 
                : "Enter the details for the new user. Click save when you're done."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. John Doe"
                className="col-span-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john.doe@example.com"
                className="col-span-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger id="role" className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                    {roles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Separator className="my-2" />
             <div>
                <Label className="font-medium text-center block mb-2">Module Access</Label>
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                    {modules.map(module => (
                        <div className="flex items-center space-x-2" key={module}>
                            <Checkbox 
                                id={`access-${module}`} 
                                checked={!!moduleAccess[module]}
                                onCheckedChange={(checked) => handleModuleAccessChange(module, !!checked)}
                            />
                            <Label htmlFor={`access-${module}`} className="font-normal">{module}</Label>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Save User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
