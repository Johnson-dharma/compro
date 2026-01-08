'use strict';

const { Setting } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Initialize default settings
    await Setting.setSetting('late_time_hour', 9, {
      description: 'Hour after which attendance is considered late (24-hour format)',
      category: 'attendance',
      isPublic: true
    });

    await Setting.setSetting('late_time_minute', 0, {
      description: 'Minute after which attendance is considered late',
      category: 'attendance',
      isPublic: true
    });

    await Setting.setSetting('working_hours_per_day', 8, {
      description: 'Standard working hours per day for overtime calculation',
      category: 'attendance',
      isPublic: true
    });

    await Setting.setSetting('attendance_approval_required', true, {
      description: 'Whether attendance submissions require admin approval',
      category: 'attendance',
      isPublic: false
    });
  },

  async down(queryInterface, Sequelize) {
    await Setting.destroy({ where: { category: 'attendance' } });
  }
};
