import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    lateTimeHour: 9,
    lateTimeMinute: 0,
    workingHoursPerDay: 8,
    attendanceApprovalRequired: true
  });

  const isAdmin = user?.role === 'admin';

  // Fetch settings
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery(
    ['settings', 'attendance'],
    () => settingsAPI.getAll({ category: 'attendance' }),
    {
      enabled: isAdmin,
      onSuccess: (data) => {
        if (data.success && data.data.settings) {
          const settings = data.data.settings.reduce((acc: any, setting: any) => {
            acc[setting.key] = setting.value;
            return acc;
          }, {});

          setFormData({
            lateTimeHour: settings.late_time_hour || 9,
            lateTimeMinute: settings.late_time_minute || 0,
            workingHoursPerDay: settings.working_hours_per_day || 8,
            attendanceApprovalRequired: settings.attendance_approval_required !== false
          });
        }
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (updates: any) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        settingsAPI.update(key, { 
          value, 
          description: getSettingDescription(key),
          category: 'attendance',
          isPublic: key !== 'attendance_approval_required'
        })
      );
      await Promise.all(promises);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settings']);
        // Show success message
        console.log('Settings updated successfully');
      },
      onError: (error: any) => {
        console.error('Failed to update settings:', error);
      },
    }
  );

  const getSettingDescription = (key: string) => {
    const descriptions: { [key: string]: string } = {
      late_time_hour: 'Hour after which attendance is considered late (24-hour format)',
      late_time_minute: 'Minute after which attendance is considered late',
      working_hours_per_day: 'Standard working hours per day for overtime calculation',
      attendance_approval_required: 'Whether attendance submissions require admin approval'
    };
    return descriptions[key] || '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      late_time_hour: formData.lateTimeHour,
      late_time_minute: formData.lateTimeMinute,
      working_hours_per_day: formData.workingHoursPerDay,
      attendance_approval_required: formData.attendanceApprovalRequired
    };

    updateSettingsMutation.mutate(updates);
  };

  const handleReset = () => {
    if (settingsData?.success && settingsData.data.settings) {
      const settings = settingsData.data.settings.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      setFormData({
        lateTimeHour: settings.late_time_hour || 9,
        lateTimeMinute: settings.late_time_minute || 0,
        workingHoursPerDay: settings.working_hours_per_day || 8,
        attendanceApprovalRequired: settings.attendance_approval_required !== false
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Access Denied
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            You need admin privileges to access settings.
          </p>
        </div>
      </div>
    );
  }

  if (isSettingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Settings
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Configure system settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={updateSettingsMutation.isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Settings form */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
            Attendance Settings
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Late Time Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning-500" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                Late Time Configuration
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Late Time Hour"
                name="lateTimeHour"
                type="number"
                min="0"
                max="23"
                value={formData.lateTimeHour}
                onChange={(e) => setFormData({ ...formData, lateTimeHour: parseInt(e.target.value) || 0 })}
                description="Hour after which attendance is considered late (24-hour format)"
                required
              />
              
              <Input
                label="Late Time Minute"
                name="lateTimeMinute"
                type="number"
                min="0"
                max="59"
                value={formData.lateTimeMinute}
                onChange={(e) => setFormData({ ...formData, lateTimeMinute: parseInt(e.target.value) || 0 })}
                description="Minute after which attendance is considered late"
                required
              />
            </div>

            <div className="p-4 bg-info-50 border border-info-200 rounded-lg dark:bg-info-900/20 dark:border-info-800">
              <p className="text-sm text-info-700 dark:text-info-300">
                <strong>Current Late Threshold:</strong> {formData.lateTimeHour.toString().padStart(2, '0')}:{formData.lateTimeMinute.toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-info-600 dark:text-info-400 mt-1">
                Employees clocking in after this time will be marked as late.
              </p>
            </div>
          </div>

          {/* Working Hours Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
              Working Hours Configuration
            </h3>
            
            <Input
              label="Standard Working Hours Per Day"
              name="workingHoursPerDay"
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={formData.workingHoursPerDay}
              onChange={(e) => setFormData({ ...formData, workingHoursPerDay: parseFloat(e.target.value) || 8 })}
              description="Used for overtime calculation"
              required
            />
          </div>

          {/* Approval Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
              Approval Configuration
            </h3>
            
            <Select
              label="Attendance Approval Required"
              name="attendanceApprovalRequired"
              options={[
                { value: 'true', label: 'Yes - All submissions require admin approval' },
                { value: 'false', label: 'No - Auto-approve valid submissions' }
              ]}
              value={formData.attendanceApprovalRequired.toString()}
              onChange={(e) => setFormData({ ...formData, attendanceApprovalRequired: e.target.value === 'true' })}
              description="Whether attendance submissions require manual admin approval"
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-6 border-t border-secondary-200 dark:border-secondary-700">
            <Button
              type="submit"
              variant="primary"
              loading={updateSettingsMutation.isLoading}
              className="min-w-[120px]"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>

        {/* Success message */}
        {updateSettingsMutation.isSuccess && (
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg dark:bg-success-900/20 dark:border-success-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-500" />
              <p className="text-sm text-success-700 dark:text-success-300">
                Settings updated successfully!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
