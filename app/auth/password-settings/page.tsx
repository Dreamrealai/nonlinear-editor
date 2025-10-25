'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { toast, Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import {
  calculatePasswordStrength,
  getPasswordStrengthColor,
} from '@/lib/validation/password';

export default function PasswordSettingsPage() {
  const { supabaseClient } = useSupabase();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(newPassword));
  }, [newPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!supabaseClient) {
      toast.error('Authentication client not available');
      setLoading(false);
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Password updated successfully');
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Toaster position="bottom-center" />
      <div>
        <h3 className="text-xl font-medium">Change password</h3>
        <p className="text-sm text-gray-500">Update your password here.</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-6">
        <div className="space-y-1">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            New password
          </label>
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                <span>Password strength: {passwordStrength.feedback}</span>
              </div>
              <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getPasswordStrengthColor(
                    passwordStrength.score
                  )}`}
                  style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm new password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating password...' : 'Update password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
