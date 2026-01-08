import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Calendar, 
  Download, 
  Filter, 
  Search,
  Building,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react';
import { reportsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn, formatTime } from '@/utils';
import Checkbox from '@/components/ui/Checkbox';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Reports: React.FC = () => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch dashboard data for overview
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery(
    ['dashboard'],
    reportsAPI.getDashboard,
    {
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  // Fetch attendance report
  const { data: attendanceReport, isLoading: isAttendanceLoading } = useQuery(
    ['attendance-report', filters],
    () => {
      // Transform filters to match backend expectations
      const apiParams = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      return reportsAPI.getAttendance(apiParams);
    },
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (type: string) => {
    try {
      switch (type) {
        case 'attendance-report':
          await reportsAPI.exportAttendanceReport(filters);
          break;
        case 'attendance-distribution':
        case 'weekly-trend':
        case 'department-performance':
        case 'monthly-trend':
        case 'department-overview':
        case 'recent-attendance':
        case 'comprehensive':
        case 'summary':
        case 'detailed':
          // For now, export the main attendance report for all chart exports
          await reportsAPI.exportAttendanceReport(filters);
          break;
        default:
          console.warn(`Export type ${type} not implemented yet`);
          alert(`Export type ${type} not implemented yet`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const generateChartData = (data: any) => {
    if (!data) return [];
    
    return [
      { name: 'Present', value: data.present || 0, color: '#10B981' },
      { name: 'Late', value: data.late || 0, color: '#F59E0B' },
      { name: 'Absent', value: data.absent || 0, color: '#EF4444' },
      { name: 'Remote', value: data.remote || 0, color: '#8B5CF6' },
      { name: 'Invalid', value: data.invalid || 0, color: '#6B7280' },
    ];
  };

  const generateWeeklyData = (data: any) => {
    if (!data || !data.weeklyStats) return [];
    
    // Generate weekly data from API response
    return data.weeklyStats.map((week: any) => ({
      name: week.day,
      present: week.present || 0,
      late: week.late || 0,
      absent: week.absent || 0
    }));
  };

  // Define type for weekly data items
  interface WeeklyDataItem {
    name: string;
    present: number;
    late: number;
    absent: number;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Reports
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Generate and view attendance reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Basic Date Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Report Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            name="endDate"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Attendance Report Table */}
      {attendanceReport?.data && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Attendance Report
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-600 dark:text-secondary-400">
                {attendanceReport.data.pagination?.totalItems || 0} records
              </span>
              <Button variant="outline" size="sm" onClick={() => handleExport('attendance-report')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {isAttendanceLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 dark:bg-secondary-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Working Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {attendanceReport.data.attendances?.map((attendance: any) => (
                    <tr key={attendance.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700">
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                              {attendance.user?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{attendance.user?.name}</div>
                            <div className="text-xs text-secondary-500">{attendance.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        {attendance.user?.department || 'Not assigned'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        {new Date(attendance.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(
                          'badge',
                          attendance.status === 'present' ? 'badge-success' :
                          attendance.status === 'late' ? 'badge-warning' :
                          attendance.status === 'absent' ? 'badge-danger' :
                          attendance.status === 'remote' ? 'badge-secondary' : 'badge-danger'
                        )}>
                          {attendance.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        {attendance.clockInTime ? formatTime(attendance.clockInTime) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        {attendance.clockOutTime ? formatTime(attendance.clockOutTime) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                        {attendance.workingHours ? `${attendance.workingHours.toFixed(2)}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {attendanceReport.data.attendances?.length === 0 && (
                <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
                  No attendance records found for the selected filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Summary */}
      {attendanceReport?.data?.summary && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Filter Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                {attendanceReport.data.summary.present || 0}
              </div>
              <div className="text-sm text-success-600 dark:text-success-400">Present</div>
            </div>
            <div className="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                {attendanceReport.data.summary.late || 0}
              </div>
              <div className="text-sm text-warning-600 dark:text-warning-400">Late</div>
            </div>
            <div className="text-center p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
              <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                {attendanceReport.data.summary.absent || 0}
              </div>
              <div className="text-sm text-danger-600 dark:text-danger-400">Absent</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                {attendanceReport.data.summary.total || 0}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      {dashboardData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              setSelectedStat('totalEmployees');
              setIsStatsModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Total Employees</p>
                <p className="stat-value">{dashboardData.data.totalEmployees || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              setSelectedStat('present');
              setIsStatsModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Present Today</p>
                <p className="stat-value">{dashboardData.data.today?.present || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              setSelectedStat('late');
              setIsStatsModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Late Today</p>
                <p className="stat-value">{dashboardData.data.today?.late || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => {
              setSelectedStat('absent');
              setIsStatsModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Absent Today</p>
                <p className="stat-value">{dashboardData.data.today?.absent || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-danger-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Distribution Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Attendance Distribution
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('attendance-distribution')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="h-64">
            <Doughnut
              data={{
                labels: ['Present', 'Late', 'Absent', 'Remote', 'Invalid'],
                datasets: [
                  {
                    data: [
                      dashboardData?.data?.today?.present || 0,
                      dashboardData?.data?.today?.late || 0,
                      dashboardData?.data?.today?.absent || 0,
                      dashboardData?.data?.today?.remote || 0,
                      dashboardData?.data?.today?.invalid || 0,
                    ],
                    backgroundColor: [
                      'rgb(34, 197, 94)',   // green
                      'rgb(251, 191, 36)',  // yellow
                      'rgb(239, 68, 68)',   // red
                      'rgb(139, 92, 246)',  // purple
                      'rgb(107, 114, 128)', // gray
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
                        const total = (dashboardData?.data?.today?.present || 0) + 
                                    (dashboardData?.data?.today?.late || 0) + 
                                    (dashboardData?.data?.today?.absent || 0) + 
                                    (dashboardData?.data?.today?.remote || 0) + 
                                    (dashboardData?.data?.today?.invalid || 0);
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

        {/* Weekly Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Weekly Trend
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('weekly-trend')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: generateWeeklyData(dashboardData?.data?.week).map((item: WeeklyDataItem) => item.name),
                datasets: [
                  {
                    label: 'Present',
                    data: generateWeeklyData(dashboardData?.data?.week).map((item: WeeklyDataItem) => item.present),
                    backgroundColor: 'rgb(34, 197, 94)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Late',
                    data: generateWeeklyData(dashboardData?.data?.week).map((item: WeeklyDataItem) => item.late),
                    backgroundColor: 'rgb(251, 191, 36)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Absent',
                    data: generateWeeklyData(dashboardData?.data?.week).map((item: WeeklyDataItem) => item.absent),
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
                      color: 'rgb(229, 231, 235)',
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

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Department Performance
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('department-performance')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: Object.keys(dashboardData?.data?.departmentStats || {}),
                datasets: [
                  {
                    label: 'Present',
                    data: Object.values(dashboardData?.data?.departmentStats || {}).map((dept: any) => dept.present || 0),
                    backgroundColor: 'rgb(34, 197, 94)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Late',
                    data: Object.values(dashboardData?.data?.departmentStats || {}).map((dept: any) => dept.late || 0),
                    backgroundColor: 'rgb(251, 191, 36)',
                    borderRadius: 4,
                  },
                  {
                    label: 'Absent',
                    data: Object.values(dashboardData?.data?.departmentStats || {}).map((dept: any) => dept.absent || 0),
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
                      color: 'rgb(229, 231, 235)',
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

        {/* Monthly Attendance Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Monthly Attendance Trend
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('monthly-trend')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="h-64">
            <Line
              data={{
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [
                  {
                    label: 'Attendance Rate',
                    data: [85, 90, 88, 92],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                  },
                  {
                    label: 'Late Rate',
                    data: [15, 10, 12, 8],
                    borderColor: 'rgb(251, 191, 36)',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    tension: 0.4,
                    fill: true,
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
                      color: 'rgb(229, 231, 235)',
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)',
                    },
                  },
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgb(229, 231, 235)',
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)',
                      callback: function(value) {
                        return value + '%';
                      }
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Department Overview */}
      {dashboardData?.data?.departmentStats && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Department Overview
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('department-overview')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 dark:bg-secondary-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Present
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Late
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    Attendance Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                {Object.entries(dashboardData.data.departmentStats).map(([dept, stats]: [string, any]) => (
                  <tr key={dept} className="hover:bg-secondary-50 dark:hover:bg-secondary-700">
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-secondary-500" />
                        {dept}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      {stats.totalUsers}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      <span className="badge badge-success">{stats.present}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      <span className="badge badge-warning">{stats.late}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      <span className="badge badge-danger">{stats.absent}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white">
                      {Math.round(((stats.present + stats.late) / stats.totalUsers) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Attendance */}
      {dashboardData?.data?.recentAttendances && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Recent Attendance
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport('recent-attendance')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="space-y-3">
            {dashboardData.data.recentAttendances.slice(0, 10).map((attendance: any) => (
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
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">
                    {attendance.clockInTime ? `Clocked in at ${formatTime(attendance.clockInTime)}` : 'No clock in'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'badge',
                    attendance.status === 'present' ? 'badge-success' :
                    attendance.status === 'late' ? 'badge-warning' :
                    attendance.status === 'absent' ? 'badge-danger' :
                    attendance.status === 'remote' ? 'badge-secondary' : 'badge-danger'
                  )}>
                    {attendance.status}
                  </span>
                  <span className={cn(
                    'badge',
                    attendance.locationStatus === 'valid' ? 'badge-success' :
                    attendance.locationStatus === 'remote' ? 'badge-warning' : 'badge-danger'
                  )}>
                    {attendance.locationStatus === 'valid' ? 'Office' : 
                     attendance.locationStatus === 'remote' ? 'Remote' : 'Invalid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => handleExport('comprehensive')}
          >
            <Download className="w-6 h-6" />
            <span>Comprehensive Report</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => handleExport('summary')}
          >
            <BarChart3 className="w-6 h-6" />
            <span>Summary Report</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => handleExport('detailed')}
          >
            <TrendingUp className="w-6 h-6" />
            <span>Detailed Analysis</span>
          </Button>
        </div>
      </div>

      {/* Stats Detail Modal */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          setSelectedStat(null);
        }}
        title={getReportsStatsModalTitle(selectedStat)}
        size="xl"
      >
        <div className="space-y-4">
          <ReportsStatsDetailTable statKey={selectedStat} data={dashboardData?.data} />
        </div>
      </Modal>
    </div>
  );
};

const getReportsStatsModalTitle = (statKey: string | null): string => {
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

const ReportsStatsDetailTable: React.FC<{ statKey: string | null; data: any }> = ({ statKey, data }) => {
  if (!statKey || !data) return null;

  const getTableData = () => {
    switch (statKey) {
      case 'totalEmployees':
        return data.users || [];
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

export default Reports;
