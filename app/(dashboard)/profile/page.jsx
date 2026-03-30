'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/api/endpoints/auth';
import { toast } from 'sonner';
import { Save, Lock, User, Mail, Phone, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  
  // Account Information Form State
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    phoneAreaCode: user?.phoneAreaCode || '',
  });

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Update form state when user data changes
  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        phoneAreaCode: user?.phoneAreaCode || '',
      });
    }
  }, [user]);

  const handleAccountChange = (field, value) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAccount = async () => {
    try {
      setIsSavingAccount(true);
      const updatedUser = await authService.updateUser(user.id || user._id, accountForm);
      setUser(updatedUser.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information and security preferences.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Account Information Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your name and contact details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={accountForm.name}
                onChange={(e) => handleAccountChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={accountForm.email}
                onChange={(e) => handleAccountChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <input
                  type="text"
                  placeholder="+44"
                  value={accountForm.phoneAreaCode}
                  onChange={(e) => handleAccountChange('phoneAreaCode', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <input
                  type="tel"
                  value={accountForm.phone}
                  onChange={(e) => handleAccountChange('phone', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveAccount}
              disabled={isSavingAccount}
              className="mt-4 gap-2"
            >
              <Save className="h-4 w-4" />
              {isSavingAccount ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Ensure your account is using a secure password.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              variant="outline"
              className="mt-4 gap-2 border-amber-200 hover:bg-amber-50 text-amber-700"
            >
              <Lock className="h-4 w-4" />
              {isChangingPassword ? 'Changing...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
