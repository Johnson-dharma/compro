'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // This seeder is intentionally empty for production deployment
    // Demo data should be created through the application interface
    console.log('Database seeded with empty data - ready for production use');
  },

  async down(queryInterface, Sequelize) {
    // No data to remove since no demo data was inserted
    console.log('No demo data to remove');
  }
};
