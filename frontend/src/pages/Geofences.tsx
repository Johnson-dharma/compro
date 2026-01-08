import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Play,
  CheckCircle,
  XCircle,
  Filter,
  Download
} from 'lucide-react';
import { geofencesAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import { cn, formatDate } from '@/utils';

const Geofences: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    page: 1,
  });

  // Fetch geofences
  const { data: geofencesData, isLoading } = useQuery(
    ['geofences', filters],
    () => geofencesAPI.getAll(filters),
    {
      keepPreviousData: true,
    }
  );

  // Create geofence mutation
  const createGeofenceMutation = useMutation(
    (data: any) => geofencesAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['geofences']);
        setIsCreateModalOpen(false);
      },
      onError: (error: any) => {
        console.error('Create geofence failed:', error);
        alert('Failed to create geofence. Please try again.');
      },
    }
  );

  // Update geofence mutation
  const updateGeofenceMutation = useMutation(
    (data: any) => geofencesAPI.update(selectedGeofence?.id || '', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['geofences']);
        setIsEditModalOpen(false);
        setSelectedGeofence(null);
      },
      onError: (error: any) => {
        console.error('Update geofence failed:', error);
        alert('Failed to update geofence. Please try again.');
      },
    }
  );

  // Delete geofence mutation
  const deleteGeofenceMutation = useMutation(
    (id: string) => geofencesAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['geofences']);
      },
      onError: (error: any) => {
        console.error('Delete geofence failed:', error);
        alert('Failed to delete geofence. Please try again.');
      },
    }
  );

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleEdit = (geofence: any) => {
    setSelectedGeofence(geofence);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      deleteGeofenceMutation.mutate(id);
    }
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: row.color || '#6B7280' }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-secondary-900 dark:text-white">{value}</p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">{row.description || 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <span className={cn(
          'badge',
          value === 'circle' ? 'badge-primary' : 'badge-secondary'
        )}>
          {value === 'circle' ? 'Circle' : 'Polygon'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <span className={cn(
          'badge',
          value ? 'badge-success' : 'badge-danger'
        )}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 text-secondary-500 hover:text-warning-600 transition-colors"
            title="Edit Geofence"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-secondary-500 hover:text-danger-600 transition-colors"
            title="Delete Geofence"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Geofences
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Manage location boundaries and geofencing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Geofence
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Geofences</p>
              <p className="stat-value">{geofencesData?.data?.pagination?.totalItems || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary-500 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Active</p>
              <p className="stat-value">
                {geofencesData?.data?.geofences?.filter((g: any) => g.isActive).length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-success-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Circle Type</p>
              <p className="stat-value">
                {geofencesData?.data?.geofences?.filter((g: any) => g.type === 'circle').length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-warning-500 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search"
            name="search"
            placeholder="Search by name or description"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <Select
            label="Type"
            name="type"
            options={[
              { value: '', label: 'All Types' },
              { value: 'circle', label: 'Circle' },
              { value: 'polygon', label: 'Polygon' },
            ]}
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          />
          <Select
            label="Status"
            name="status"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setFilters({ search: '', type: '', status: '', page: 1 })}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Geofences table */}
      <div className="card">
        <Table
          columns={columns}
          data={geofencesData?.data?.geofences || []}
          loading={isLoading}
          pagination={geofencesData?.data?.pagination}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Create Geofence Modal */}
      <CreateGeofenceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createGeofenceMutation.mutate(data)}
        isLoading={createGeofenceMutation.isLoading}
      />

      {/* Edit Geofence Modal */}
      <EditGeofenceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedGeofence(null);
        }}
        geofence={selectedGeofence}
        onSubmit={(data) => updateGeofenceMutation.mutate(data)}
        isLoading={updateGeofenceMutation.isLoading}
      />
    </div>
  );
};

// Create Geofence Modal Component
const CreateGeofenceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'circle',
    center: { latitude: 0, longitude: 0 },
    radius: 100,
    color: '#3B82F6',
    timezone: 'UTC',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Geofence" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Type"
            name="type"
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'polygon', label: 'Polygon' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          />
        </div>
        <Input
          label="Description"
          name="description"
          placeholder="Optional description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Color"
            name="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
          <Input
            label="Timezone"
            name="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          />
        </div>
        
        {formData.type === 'circle' && (
          <div className="space-y-4">
            <h4 className="font-medium text-secondary-900 dark:text-white">Circle Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                placeholder="37.7749"
                value={formData.center.latitude}
                onChange={(e) => setFormData({
                  ...formData,
                  center: { ...formData.center, latitude: parseFloat(e.target.value) || 0 }
                })}
                required
              />
              <Input
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                placeholder="-122.4194"
                value={formData.center.longitude}
                onChange={(e) => setFormData({
                  ...formData,
                  center: { ...formData.center, longitude: parseFloat(e.target.value) || 0 }
                })}
                required
              />
              <Input
                label="Radius (meters)"
                name="radius"
                type="number"
                min="1"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })}
                required
              />
            </div>
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
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Geofence
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Geofence Modal Component
const EditGeofenceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  geofence: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, geofence, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'circle',
    center: { latitude: 0, longitude: 0 },
    radius: 100,
    color: '#3B82F6',
    timezone: 'UTC',
  });

  React.useEffect(() => {
    if (geofence) {
      setFormData({
        name: geofence.name || '',
        description: geofence.description || '',
        type: geofence.type || 'circle',
        center: geofence.center || { latitude: 0, longitude: 0 },
        radius: geofence.radius || 100,
        color: geofence.color || '#3B82F6',
        timezone: geofence.timezone || 'UTC',
      });
    }
  }, [geofence]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!geofence) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Geofence" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Type"
            name="type"
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'polygon', label: 'Polygon' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          />
        </div>
        <Input
          label="Description"
          name="description"
          placeholder="Optional description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Color"
            name="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
          <Input
            label="Timezone"
            name="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          />
        </div>
        
        {formData.type === 'circle' && (
          <div className="space-y-4">
            <h4 className="font-medium text-secondary-900 dark:text-white">Circle Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                placeholder="37.7749"
                value={formData.center.latitude}
                onChange={(e) => setFormData({
                  ...formData,
                  center: { ...formData.center, latitude: parseFloat(e.target.value) || 0 }
                })}
                required
              />
              <Input
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                placeholder="-122.4194"
                value={formData.center.longitude}
                onChange={(e) => setFormData({
                  ...formData,
                  center: { ...formData.center, longitude: parseFloat(e.target.value) || 0 }
                })}
                required
              />
              <Input
                label="Radius (meters)"
                name="radius"
                type="number"
                min="1"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })}
                required
              />
            </div>
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
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Geofence
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Geofences;
