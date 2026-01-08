import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  User, 
  Mail, 
  Building, 
  Camera, 
  Save, 
  Key, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils';
import FileInput from '@/components/ui/FileInput';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch user profile data
  const { data: profileData, isLoading } = useQuery(
    ['user-profile'],
    usersAPI.getProfile,
    {
      enabled: !!user,
    }
  );

  const profile = profileData?.data?.user || user;

  // Profile update mutation
  const updateProfileMutation = useMutation(
    (data: any) => usersAPI.updateProfile(data),
    {
      onSuccess: (response) => {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        queryClient.invalidateQueries(['user-profile']);
        updateProfile(response.data.user);
        setTimeout(() => setMessage(null), 3000);
      },
      onError: (error: any) => {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error?.message || 'Failed to update profile' 
        });
        setTimeout(() => setMessage(null), 5000);
      },
    }
  );

  // Password change mutation
  const changePasswordMutation = useMutation(
    (data: any) => authAPI.changePassword(data),
    {
      onSuccess: () => {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setIsPasswordModalOpen(false);
        setTimeout(() => setMessage(null), 3000);
      },
      onError: (error: any) => {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error?.message || 'Failed to change password' 
        });
        setTimeout(() => setMessage(null), 5000);
      },
    }
  );

  // Profile picture update mutation
  const updatePhotoMutation = useMutation(
    (photoUrl: string) => usersAPI.updateProfilePicture(profile?.id || '', photoUrl),
    {
      onSuccess: (response) => {
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        queryClient.invalidateQueries(['user-profile']);
        updateProfile(response.data.user);
        setIsPhotoModalOpen(false);
        setTimeout(() => setMessage(null), 3000);
      },
      onError: (error: any) => {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error?.message || 'Failed to update profile picture' 
        });
        setTimeout(() => setMessage(null), 5000);
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
          Profile
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your account settings
        </p>
      </div>

      {/* Message display */}
      {message && (
        <div className={cn(
          'p-4 rounded-lg border',
          message.type === 'success' 
            ? 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-700 dark:text-success-300'
            : 'bg-danger-50 border-danger-200 text-danger-800 dark:bg-danger-900/20 dark:border-danger-700 dark:text-danger-300'
        )}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Profile information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile picture and basic info */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-4xl font-bold text-primary-700 dark:text-primary-300">
                {profile?.profilePictureUrl ? (
                  <img
                    src={profile.profilePictureUrl}
                    alt={profile?.name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  profile?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
              {profile?.name}
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              {profile?.role === 'admin' ? 'Administrator' : 'Employee'}
            </p>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile details */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Profile Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Full Name
                </label>
                <p className="text-secondary-900 dark:text-white">{profile?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Email Address
                </label>
                <p className="text-secondary-900 dark:text-white">{profile?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Department
                </label>
                <p className="text-secondary-900 dark:text-white">
                  {profile?.department || 'Not assigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Role
                </label>
                <p className="text-secondary-900 dark:text-white capitalize">
                  {profile?.role}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Account Status
                </label>
                <span className={cn(
                  'badge',
                  profile?.isActive ? 'badge-success' : 'badge-danger'
                )}>
                  {profile?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Member Since
                </label>
                <p className="text-secondary-900 dark:text-white">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Security section */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50 dark:bg-secondary-700">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-white">Email Verification</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {profile?.emailVerified ? 'Email is verified' : 'Email not verified'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'badge',
                  profile?.emailVerified ? 'badge-success' : 'badge-warning'
                )}>
                  {profile?.emailVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50 dark:bg-secondary-700">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-white">Password</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Last changed recently
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSubmit={(data) => updateProfileMutation.mutate(data)}
        isLoading={updateProfileMutation.isLoading}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={(data) => changePasswordMutation.mutate(data)}
        isLoading={changePasswordMutation.isLoading}
      />

      {/* Update Photo Modal */}
              <UpdatePhotoModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onSubmit={(photoUrl) => updatePhotoMutation.mutate(photoUrl)}
          onFileUpload={(file) => {
            // Convert file to data URL for profile picture update
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                updatePhotoMutation.mutate(e.target.result as string);
              }
            };
            reader.readAsDataURL(file);
          }}
          isLoading={updatePhotoMutation.isLoading}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, profile, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    department: profile?.department || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Department"
          name="department"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        />
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Change Password Modal Component
const ChangePasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (formData.newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters long' });
      return;
    }

    onSubmit({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current Password"
          name="currentPassword"
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          required
        />
        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          error={errors.newPassword}
          required
        />
        <Input
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
          required
        />
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="flex-1"
          >
            <Key className="w-4 h-4 mr-2" />
            Change Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Update Photo Modal Component
const UpdatePhotoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoUrl: string) => void;
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
}> = ({ isOpen, onClose, onSubmit, onFileUpload, isLoading, selectedFile, onFileSelect }) => {
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMethod === 'url' && photoUrl.trim()) {
      onSubmit(photoUrl.trim());
    } else if (uploadMethod === 'file' && selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const handleFileUpload = (file: File) => {
    onFileSelect(file);
  };

  const handleFileRemove = () => {
    onFileSelect(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Profile Picture" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload Method Selection */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
            Choose Upload Method
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMethod"
                value="file"
                checked={uploadMethod === 'file'}
                onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                className="text-primary-600"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">Upload File</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMethod"
                value="url"
                checked={uploadMethod === 'url'}
                onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                className="text-primary-600"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">Photo URL</span>
            </label>
          </div>
        </div>

        {/* URL Input */}
        {uploadMethod === 'url' && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Photo URL
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="input w-full"
              required={uploadMethod === 'url'}
            />
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Enter a valid URL for your profile picture
            </p>
          </div>
        )}

        {/* File Upload */}
        {uploadMethod === 'file' && (
          <div>
            <FileInput
              label="Profile Picture"
              name="profilePicture"
              accept="image/*"
              value={selectedFile}
              onChange={handleFileUpload}
              onRemove={handleFileRemove}
            />
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={uploadMethod === 'url' ? !photoUrl.trim() : !selectedFile}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Update Photo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Profile;
