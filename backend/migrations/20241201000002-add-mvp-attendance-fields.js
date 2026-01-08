'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns for MVP attendance system
    await queryInterface.addColumn('attendances', 'clockInPhotoData', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Base64 encoded photo data for clock in'
    });

    await queryInterface.addColumn('attendances', 'clockOutPhotoData', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Base64 encoded photo data for clock out'
    });

    await queryInterface.addColumn('attendances', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Admin approval status for attendance'
    });

    await queryInterface.addColumn('attendances', 'approvedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin who approved/rejected the attendance'
    });

    await queryInterface.addColumn('attendances', 'approvalNotes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Admin notes for approval/rejection'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('attendances', ['approvalStatus']);
    await queryInterface.addIndex('attendances', ['approvedBy']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('attendances', ['approvedBy']);
    await queryInterface.removeIndex('attendances', ['approvalStatus']);

    // Remove columns
    await queryInterface.removeColumn('attendances', 'approvalNotes');
    await queryInterface.removeColumn('attendances', 'approvedBy');
    await queryInterface.removeColumn('attendances', 'approvalStatus');
    await queryInterface.removeColumn('attendances', 'clockOutPhotoData');
    await queryInterface.removeColumn('attendances', 'clockInPhotoData');

    // Remove enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_attendances_approvalStatus";');
  }
};
