'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Setting key identifier'
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Setting value (stored as JSON string)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human readable description of the setting'
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'general',
        comment: 'Setting category for organization'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this setting can be accessed by non-admin users'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('settings', ['key'], { unique: true });
    await queryInterface.addIndex('settings', ['category']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('settings');
  }
};
