// Centralized department configuration
export const ALL_DEPARTMENTS = [
  'IT',
  'HR', 
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
  'Engineering',
  'Support',
  'Design',
  'Product'
];

export type Department = typeof ALL_DEPARTMENTS[number];

// Department options for select components
export const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select Department' },
  ...ALL_DEPARTMENTS.map(dept => ({ value: dept, label: dept }))
];

// Department options for filters (includes "All Departments")
export const DEPARTMENT_FILTER_OPTIONS = [
  { value: '', label: 'All Departments' },
  ...ALL_DEPARTMENTS.map(dept => ({ value: dept, label: dept }))
];
