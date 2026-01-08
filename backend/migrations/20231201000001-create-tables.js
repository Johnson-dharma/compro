'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('admin', 'employee'),
        defaultValue: 'employee',
        allowNull: false
      },
      profilePictureUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      resetPasswordToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      resetPasswordExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });


    // Create Attendances table
    await queryInterface.createTable('attendances', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      clockInTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      clockOutTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      clockInPhotoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      clockOutPhotoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      clockInLocation: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      clockOutLocation: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'remote', 'invalid'),
        defaultValue: 'present',
        allowNull: false
      },
      locationStatus: {
        type: Sequelize.ENUM('valid', 'invalid', 'remote'),
        defaultValue: 'valid',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isManualEntry: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      manualEntryReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      workingHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      overtimeHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['department']);
    
    await queryInterface.addIndex('attendances', ['userId', 'date'], { unique: true });
    await queryInterface.addIndex('attendances', ['date']);
    await queryInterface.addIndex('attendances', ['status']);
    await queryInterface.addIndex('attendances', ['locationStatus']);
    
    await queryInterface.addIndex('geofences', ['isActive']);
    await queryInterface.addIndex('geofences', ['type']);
    await queryInterface.addIndex('geofences', ['createdBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendances');
    await queryInterface.dropTable('geofences');
    await queryInterface.dropTable('users');
  }
};
