module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'employee'),
      defaultValue: 'employee',
      allowNull: false
    },
    profilePictureUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['department']
      }
    ],
    hooks: {
      beforeCreate: (user) => {
        if (user.profilePictureUrl) {
          user.profilePictureUrl = user.profilePictureUrl.trim();
        }
      },
      beforeUpdate: (user) => {
        if (user.profilePictureUrl) {
          user.profilePictureUrl = user.profilePictureUrl.trim();
        }
      }
    }
  });

  // Instance methods
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    return values;
  };

  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };

  User.prototype.isEmployee = function() {
    return this.role === 'employee';
  };

  return User;
};
