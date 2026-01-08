module.exports = (sequelize, DataTypes) => {
  const Geofence = sequelize.define('Geofence', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('circle', 'polygon'),
      defaultValue: 'circle',
      allowNull: false
    },
    center: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Stores {latitude: number, longitude: number} for circle center'
    },
    radius: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Radius in meters for circular geofences'
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array of coordinates for polygon geofences'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#007BFF',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC',
      comment: 'Timezone for this geofence location'
    },
    workingHours: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Working hours configuration for this location'
    }
  }, {
    tableName: 'geofences',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['isActive']
      },
      {
        fields: ['type']
      },
      {
        fields: ['createdBy']
      }
    ],
    hooks: {
      beforeCreate: (geofence) => {
        // Validate geofence data based on type
        if (geofence.type === 'circle') {
          if (!geofence.center || !geofence.radius) {
            throw new Error('Circle geofence requires center and radius');
          }
        } else if (geofence.type === 'polygon') {
          if (!geofence.coordinates || !Array.isArray(geofence.coordinates) || geofence.coordinates.length < 3) {
            throw new Error('Polygon geofence requires at least 3 coordinates');
          }
        }
      },
      beforeUpdate: (geofence) => {
        // Validate geofence data based on type
        if (geofence.type === 'circle') {
          if (!geofence.center || !geofence.radius) {
            throw new Error('Circle geofence requires center and radius');
          }
        } else if (geofence.type === 'polygon') {
          if (!geofence.coordinates || !Array.isArray(geofence.coordinates) || geofence.coordinates.length < 3) {
            throw new Error('Polygon geofence requires at least 3 coordinates');
          }
        }
      }
    }
  });

  // Instance methods
  Geofence.prototype.isPointInside = function(latitude, longitude) {
    if (!this.isActive) return false;
    
    if (this.type === 'circle') {
      return this.isPointInsideCircle(latitude, longitude);
    } else if (this.type === 'polygon') {
      return this.isPointInsidePolygon(latitude, longitude);
    }
    
    return false;
  };

  Geofence.prototype.isPointInsideCircle = function(latitude, longitude) {
    if (!this.center || !this.radius) return false;
    
    const R = 6371000; // Earth's radius in meters
    const lat1 = this.center.latitude * Math.PI / 180;
    const lat2 = latitude * Math.PI / 180;
    const deltaLat = (latitude - this.center.latitude) * Math.PI / 180;
    const deltaLon = (longitude - this.center.longitude) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance <= this.radius;
  };

  Geofence.prototype.isPointInsidePolygon = function(latitude, longitude) {
    if (!this.coordinates || !Array.isArray(this.coordinates)) return false;
    
    // Ray casting algorithm
    let inside = false;
    const x = longitude;
    const y = latitude;
    
    for (let i = 0, j = this.coordinates.length - 1; i < this.coordinates.length; j = i++) {
      const xi = this.coordinates[i].longitude;
      const yi = this.coordinates[i].latitude;
      const xj = this.coordinates[j].longitude;
      const yj = this.coordinates[j].latitude;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  Geofence.prototype.getDistanceFromCenter = function(latitude, longitude) {
    if (!this.center) return null;
    
    const R = 6371000; // Earth's radius in meters
    const lat1 = this.center.latitude * Math.PI / 180;
    const lat2 = latitude * Math.PI / 180;
    const deltaLat = (latitude - this.center.latitude) * Math.PI / 180;
    const deltaLon = (longitude - this.center.longitude) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  };

  return Geofence;
};
