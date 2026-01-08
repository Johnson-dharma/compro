const { Setting } = require('../models');

/**
 * Get attendance settings
 */
const getAttendanceSettings = async () => {
  try {
    const lateTimeHour = await Setting.getSetting('late_time_hour', 9);
    const lateTimeMinute = await Setting.getSetting('late_time_minute', 0);
    const workingHoursPerDay = await Setting.getSetting('working_hours_per_day', 8);
    const approvalRequired = await Setting.getSetting('attendance_approval_required', true);

    return {
      lateTimeHour: parseInt(lateTimeHour),
      lateTimeMinute: parseInt(lateTimeMinute),
      workingHoursPerDay: parseInt(workingHoursPerDay),
      approvalRequired: Boolean(approvalRequired)
    };
  } catch (error) {
    console.error('Error getting attendance settings:', error);
    // Return default values if there's an error
    return {
      lateTimeHour: 9,
      lateTimeMinute: 0,
      workingHoursPerDay: 8,
      approvalRequired: true
    };
  }
};

/**
 * Check if a given time is late based on current settings
 */
const isLateTime = async (clockInTime) => {
  const settings = await getAttendanceSettings();
  const clockIn = new Date(clockInTime);
  
  const clockInHour = clockIn.getHours();
  const clockInMinute = clockIn.getMinutes();
  
  return clockInHour > settings.lateTimeHour || 
         (clockInHour === settings.lateTimeHour && clockInMinute > settings.lateTimeMinute);
};

/**
 * Get late time threshold as a formatted string
 */
const getLateTimeThreshold = async () => {
  const settings = await getAttendanceSettings();
  const hour = settings.lateTimeHour.toString().padStart(2, '0');
  const minute = settings.lateTimeMinute.toString().padStart(2, '0');
  return `${hour}:${minute}`;
};

module.exports = {
  getAttendanceSettings,
  isLateTime,
  getLateTimeThreshold
};
