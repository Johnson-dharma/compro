module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Setting key identifier'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Setting value (stored as JSON string)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human readable description of the setting'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general',
      comment: 'Setting category for organization'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this setting can be accessed by non-admin users'
    }
  }, {
    tableName: 'settings',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['key'],
        unique: true
      },
      {
        fields: ['category']
      }
    ]
  });

  // Instance methods
  Setting.prototype.getParsedValue = function() {
    try {
      return JSON.parse(this.value);
    } catch (error) {
      return this.value;
    }
  };

  Setting.prototype.setValue = function(value) {
    this.value = typeof value === 'string' ? value : JSON.stringify(value);
  };

  // Static methods
  Setting.getSetting = async function(key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    if (!setting) return defaultValue;
    return setting.getParsedValue();
  };

  Setting.setSetting = async function(key, value, options = {}) {
    const [setting, created] = await this.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        description: options.description || '',
        category: options.category || 'general',
        isPublic: options.isPublic || false
      }
    });

    if (!created) {
      setting.setValue(value);
      if (options.description) setting.description = options.description;
      if (options.category) setting.category = options.category;
      if (options.isPublic !== undefined) setting.isPublic = options.isPublic;
      await setting.save();
    }

    return setting;
  };

  return Setting;
};
