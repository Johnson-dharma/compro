module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    clockInTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    clockOutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    clockInPhotoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clockOutPhotoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clockInPhotoData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded photo data for clock in'
    },
    clockOutPhotoData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded photo data for clock out'
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Admin approval status for attendance'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin who approved/rejected the attendance'
    },
    approvalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes for approval/rejection'
    },
    clockInLocation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Stores {latitude: number, longitude: number}'
    },
    clockOutLocation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Stores {latitude: number, longitude: number}'
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'remote', 'invalid'),
      defaultValue: 'present',
      allowNull: false
    },
    locationStatus: {
      type: DataTypes.ENUM('valid', 'invalid', 'remote'),
      defaultValue: 'valid',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isManualEntry: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True if attendance was manually entered by admin'
    },
    manualEntryReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for manual entry if applicable'
    },
    workingHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Total working hours for the day'
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Overtime hours for the day'
    }
  }, {
    tableName: 'attendances',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['userId', 'date'],
        unique: true
      },
      {
        fields: ['date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['locationStatus']
      },
      {
        fields: ['userId']
      }
    ],
    hooks: {
      beforeCreate: (attendance) => {
        // Set default date if not provided
        if (!attendance.date) {
          attendance.date = new Date().toISOString().split('T')[0];
        }
      },
      beforeUpdate: (attendance) => {
        // Calculate working hours when clocking out
        if (attendance.clockOutTime && attendance.clockInTime) {
          const diffMs = new Date(attendance.clockOutTime) - new Date(attendance.clockInTime);
          const diffHours = diffMs / (1000 * 60 * 60);
          attendance.workingHours = Math.round(diffHours * 100) / 100;
          
          // Calculate overtime (assuming 8 hours is standard workday)
          if (diffHours > 8) {
            attendance.overtimeHours = Math.round((diffHours - 8) * 100) / 100;
          }
        }
      }
    }
  });

  // Instance methods
  Attendance.prototype.isClockedIn = function() {
    return !!this.clockInTime && !this.clockOutTime;
  };

  Attendance.prototype.isClockedOut = function() {
    return !!this.clockInTime && !!this.clockOutTime;
  };

  Attendance.prototype.getWorkingHours = function() {
    if (this.workingHours) return this.workingHours;
    
    if (this.clockInTime && this.clockOutTime) {
      const diffMs = new Date(this.clockOutTime) - new Date(this.clockInTime);
      return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
    
    return 0;
  };

  Attendance.prototype.isLate = async function() {
    if (!this.clockInTime) return false;
    
    // Use the configurable settings utility
    const { isLateTime } = require('../utils/settings');
    return await isLateTime(this.clockInTime);
  };

  return Attendance;
};
