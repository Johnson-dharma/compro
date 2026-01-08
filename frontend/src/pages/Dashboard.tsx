import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  MapPin,
  Camera,
  X,
  Building
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { reportsAPI, attendanceAPI, usersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import { cn, formatTime, formatWorkingHours, getStatusColor } from '@/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    ['dashboard'],
    reportsAPI.getDashboard,
    {
      enabled: isAdmin,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch users list for the total employees modal
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['users'],
    () => usersAPI.getAll({ limit: 1000 }), // Get all users without pagination
    {
      enabled: isAdmin,
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  const { data: attendanceStatus, isLoading: statusLoading } = useQuery(
    ['attendanceStatus'],
    attendanceAPI.getStatus,
    {
      enabled: !isAdmin,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (dashboardLoading || statusLoading || (isAdmin && usersLoading)) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      {isAdmin ? <AdminDashboard data={dashboardData?.data || {}} usersData={usersData?.data} /> : <EmployeeDashboard status={attendanceStatus?.data} />}
    </div>
  );
};

const AdminDashboard: React.FC<{ data: any; usersData: any }> = ({ data, usersData }) => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  if (!data) return null;

  const { today, totalEmployees, recentAttendances, departmentStats } = data;

  // Convert departmentStats object to array if it's an object
  const departmentStatsArray = departmentStats && typeof departmentStats === 'object' && !Array.isArray(departmentStats)
    ? Object.entries(departmentStats).map(([name, stats]: [string, any]) => ({
        name,
        total: stats.totalUsers || 0,
        present: stats.present || 0,
        late: stats.late || 0,
        absent: stats.absent || 0,
      }))
    : Array.isArray(departmentStats) ? departmentStats : [];

  // Ensure recentAttendances is an array
  const recentAttendancesArray = Array.isArray(recentAttendances) ? recentAttendances : [];

  const stats = [
    {
      name: 'Total Employees',
      value: totalEmployees || 0,
      icon: Users,
      color: 'bg-primary-500',
      change: '+2 this week',
      key: 'totalEmployees',
      data: usersData?.users || [],
    },
    {
      name: 'Present Today',
      value: today?.present || 0,
      icon: CheckCircle,
      color: 'bg-success-500',
      change: totalEmployees ? `${Math.round(((today?.present || 0) / totalEmployees) * 100)}%` : '0%',
      key: 'present',
      data: data.presentUsers || [],
    },
    {
      name: 'Late Today',
      value: today?.late || 0,
      icon: AlertCircle,
      color: 'bg-warning-500',
      change: totalEmployees ? `${Math.round(((today?.late || 0) / totalEmployees) * 100)}%` : '0%',
      key: 'late',
      data: data.lateUsers || [],
    },
    {
      name: 'Absent Today',
      value: today?.absent || 0,
      icon: XCircle,
      color: 'bg-danger-500',
      change: totalEmployees ? `${Math.round(((today?.absent || 0) / totalEmployees) * 100)}%` : '0%',
      key: 'absent',
      data: data.absentUsers || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div 
            key={stat.name} 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              setSelectedStat(stat.key);
              setIsModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">{stat.name}</p>
                <p className="stat-value">{stat.value}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                  {stat.change}
                </p>
              </div>
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', stat.color)}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Status Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Today's Attendance Status
          </h3>
          <div className="h-64">
            <Doughnut
              data={{
                labels: ['Present', 'Late', 'Absent'],
                datasets: [
                  {
                    data: [
                      today?.present || 0,
                      today?.late || 0,
                      today?.absent || 0,
                    ],
                    backgroundColor: [
                      'rgb(34, 197, 94)', // green
                      'rgb(251, 191, 36)', // yellow
                      'rgb(239, 68, 68)',  // red
                    ],
                    borderWidth: 2,
                    borderColor: 'white',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'rgb(107, 114, 128)',
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = (today?.present || 0) + (today?.late || 0) + (today?.absent || 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Department Performance Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Department Performance
          </h3>
          <div className="h-64">
            <Bar
              data={{
                labels: departmentStatsArray.map(dept => dept.name),
                datasets: [
                  {
                    label: 'Present',
                    data: departmentStatsArray.map(dept => dept.present),
                    backgroundColor: 'rgb(34, 197, 94)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Late',
                    data: departmentStatsArray.map(dept => dept.late),
                    backgroundColor: 'rgb(251, 191, 36)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Absent',
                    data: departmentStatsArray.map(dept => dept.absent),
                    backgroundColor: 'rgb(239, 68, 68)',
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'rgb(107, 114, 128)',
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                scales: {
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)',
                    },
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgb(229, 231, 235)',
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent activity and department breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent attendance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Recent Attendance
          </h3>
          <div className="space-y-3">
            {recentAttendancesArray && recentAttendancesArray.length > 0 ? (
              recentAttendancesArray.slice(0, 5).map((attendance: any) => (
                <div key={attendance.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-700">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {attendance.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-secondary-900 dark:text-white">
                      {attendance.user?.name}
                    </p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {attendance.clockInTime ? formatTime(attendance.clockInTime) : 'Not clocked in'}
                    </p>
                  </div>
                  <span className={cn(
                    'badge',
                    getStatusColor(attendance.status)
                  )}>
                    {attendance.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                <p className="text-secondary-500 dark:text-secondary-400">
                  No recent attendance data
                </p>
                <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-2">
                  Recent attendance records will appear here when available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Department breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Department Breakdown
          </h3>
          <div className="space-y-3">
            {departmentStatsArray && departmentStatsArray.length > 0 ? (
              departmentStatsArray.map((dept: any) => (
                <div key={dept.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary-50 dark:bg-secondary-700">
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-white">{dept.name}</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {dept.total} employees
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-secondary-900 dark:text-white">
                      {dept.present}/{dept.total}
                    </p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {Math.round((dept.present / dept.total) * 100)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                <p className="text-secondary-500 dark:text-secondary-400">
                  No department data available
                </p>
                <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-2">
                  Department statistics will appear here when available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStat(null);
        }}
        title={getModalTitle(selectedStat)}
        size="xl"
      >
                 <div className="space-y-4">
           <StatsDetailTable statKey={selectedStat} data={data} usersData={usersData} />
         </div>
      </Modal>
    </div>
  );
};

const getModalTitle = (statKey: string | null): string => {
  switch (statKey) {
    case 'totalEmployees':
      return 'All Employees';
    case 'present':
      return 'Present Today';
    case 'late':
      return 'Late Today';
    case 'absent':
      return 'Absent Today';
    default:
      return 'Details';
  }
};

const StatsDetailTable: React.FC<{ statKey: string | null; data: any; usersData?: any }> = ({ statKey, data, usersData }) => {
  if (!statKey || !data) return null;

  const getTableData = () => {
    switch (statKey) {
      case 'totalEmployees':
        return usersData?.users || [];
      case 'present':
        return data.presentUsers || [];
      case 'late':
        return data.lateUsers || [];
      case 'absent':
        return data.absentUsers || [];
      default:
        return [];
    }
  };

  const getColumns = () => {
    const baseColumns = [
      {
        key: 'name',
        label: 'Name',
        render: (value: string, row: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {value?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium">{value}</span>
          </div>
        ),
      },
      {
        key: 'department',
        label: 'Department',
        render: (value: string) => value || 'Not assigned',
      },
      {
        key: 'role',
        label: 'Role',
        render: (value: string) => (
          <span className={cn(
            'badge',
            value === 'admin' ? 'badge-warning' : 'badge-success'
          )}>
            {value === 'admin' ? 'Administrator' : 'Employee'}
          </span>
        ),
      },
    ];

    if (statKey === 'present' || statKey === 'late') {
      baseColumns.push({
        key: 'clockInTime',
        label: 'Clock In Time',
        render: (value: string) => value ? formatTime(value) : '-',
      });
    }

    return baseColumns;
  };

  const tableData = getTableData();
  const columns = getColumns();

  // Debug logging
  console.log('StatsDetailTable - statKey:', statKey);
  console.log('StatsDetailTable - data:', data);
  console.log('StatsDetailTable - tableData:', tableData);

  if (!tableData || tableData.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
          No data available
        </h3>
        <p className="text-secondary-500 dark:text-secondary-400">
          {statKey === 'totalEmployees' 
            ? 'No employees found in the system'
            : `No ${statKey} users found for today`
          }
        </p>
        <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-2">
          This might be because the backend server is not running or there's no data available.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-secondary-600 dark:text-secondary-400">
          Showing {tableData.length} {statKey === 'totalEmployees' ? 'employees' : 'users'} 
          {statKey !== 'totalEmployees' && ` (${statKey} today)`}
        </p>
      </div>
      
      <Table
        columns={columns}
        data={tableData}
        loading={false}
      />
    </div>
  );
};

const EmployeeDashboard: React.FC<{ status: any }> = ({ status }) => {
  if (!status) return null;

  const { status: attendanceStatus, attendance, workingHours } = status;
  const currentTime = new Date().toLocaleTimeString();

  return (
    <div className="space-y-6">
      {/* Time and status */}
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-secondary-900 dark:text-white mb-2">
          {currentTime}
        </div>
        <div className="text-lg text-secondary-600 dark:text-secondary-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Attendance status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Clock className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Status
          </h3>
          <span className={cn(
            'badge text-lg px-4 py-2',
            attendanceStatus === 'clocked_in' ? 'badge-success' :
            attendanceStatus === 'clocked_out' ? 'badge-secondary' :
            'badge-danger'
          )}>
            {attendanceStatus === 'clocked_in' ? 'Clocked In' :
             attendanceStatus === 'clocked_out' ? 'Clocked Out' :
             'Not Started'}
          </span>
        </div>

        <div className="card text-center">
          <Calendar className="w-12 h-12 text-success-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Working Hours
          </h3>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">
            {workingHours ? formatWorkingHours(workingHours) : '0h 0m'}
          </p>
        </div>

        <div className="card text-center">
          <MapPin className="w-12 h-12 text-warning-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Location
          </h3>
          <span className={cn(
            'badge',
            attendance?.locationStatus === 'valid' ? 'badge-success' :
            attendance?.locationStatus === 'remote' ? 'badge-warning' :
            'badge-danger'
          )}>
            {attendance?.locationStatus === 'valid' ? 'Office' :
             attendance?.locationStatus === 'remote' ? 'Remote' :
             'Unknown'}
          </span>
        </div>
      </div>

      {/* Today's summary */}
      {attendance && (
        <div className="card">  
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Today's Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Clock In</p>
              <p className="font-medium text-secondary-900 dark:text-white">
                {attendance.clockInTime ? formatTime(attendance.clockInTime) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Clock Out</p>
              <p className="font-medium text-secondary-900 dark:text-white">
                {attendance.clockOutTime ? formatTime(attendance.clockOutTime) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
