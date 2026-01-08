const axios = require('axios');
const FormData = require('form-data');

class FaceRecognitionService {
  constructor() {
    this.baseURL = process.env.COMPREFACE_URL || 'http://localhost:8001';
    this.apiKey = process.env.COMPREFACE_API_KEY;
    this.recognitionApiKey = process.env.COMPREFACE_RECOGNITION_API_KEY;
    this.detectionApiKey = process.env.COMPREFACE_DETECTION_API_KEY;
  }

  // Initialize face recognition service
  async initialize() {
    try {
      // Test connection to CompreFace
      await this.healthCheck();
      console.log('✅ CompreFace service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to CompreFace:', error.message);
      return false;
    }
  }

  // Health check for CompreFace service
  async healthCheck() {
    const response = await axios.get(`${this.baseURL}/api/v1/recognition/subjects`, {
      headers: {
        'x-api-key': this.recognitionApiKey
      }
    });
    return response.status === 200;
  }

  // Enroll a new employee face
  async enrollEmployeeFace(employeeId, imageBuffer, employeeName) {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, { filename: 'face.jpg' });

      // First, add the subject (employee)
      await this.addSubject(employeeId, employeeName);

      // Then add the face example
      const response = await axios.post(
        `${this.baseURL}/api/v1/recognition/faces?subject=${employeeId}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.recognitionApiKey,
          },
        }
      );

      return {
        success: true,
        faceId: response.data.image_id,
        subject: employeeId,
        message: 'Employee face enrolled successfully'
      };
    } catch (error) {
      console.error('Face enrollment error:', error.response?.data || error.message);
      throw new Error(`Failed to enroll employee face: ${error.response?.data?.message || error.message}`);
    }
  }

  // Add a subject (employee) to the recognition system
  async addSubject(employeeId, employeeName) {
    try {
      await axios.post(
        `${this.baseURL}/api/v1/recognition/subjects`,
        { subject: employeeId },
        {
          headers: {
            'x-api-key': this.recognitionApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`Subject ${employeeId} (${employeeName}) added successfully`);
    } catch (error) {
      // Subject might already exist, which is fine
      if (error.response?.status !== 409) {
        throw error;
      }
    }
  }

  // Recognize face in attendance photo
  async recognizeFace(imageBuffer, threshold = 0.8) {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, { filename: 'attendance.jpg' });

      const response = await axios.post(
        `${this.baseURL}/api/v1/recognition/recognize?limit=1&prediction_count=1&det_prob_threshold=${threshold}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.recognitionApiKey,
          },
        }
      );

      const result = response.data.result;
      
      if (result && result.length > 0 && result[0].subjects && result[0].subjects.length > 0) {
        const match = result[0].subjects[0];
        
        return {
          success: true,
          recognized: true,
          employeeId: match.subject,
          confidence: match.similarity,
          boundingBox: result[0].box,
          message: 'Face recognized successfully'
        };
      }

      return {
        success: true,
        recognized: false,
        message: 'No matching face found'
      };

    } catch (error) {
      console.error('Face recognition error:', error.response?.data || error.message);
      throw new Error(`Failed to recognize face: ${error.response?.data?.message || error.message}`);
    }
  }

  // Detect faces in image (without recognition)
  async detectFaces(imageBuffer) {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, { filename: 'detection.jpg' });

      const response = await axios.post(
        `${this.baseURL}/api/v1/detection/detect?limit=10&det_prob_threshold=0.8`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.detectionApiKey,
          },
        }
      );

      return {
        success: true,
        faces: response.data.result,
        faceCount: response.data.result.length,
        message: `Detected ${response.data.result.length} face(s)`
      };

    } catch (error) {
      console.error('Face detection error:', error.response?.data || error.message);
      throw new Error(`Failed to detect faces: ${error.response?.data?.message || error.message}`);
    }
  }

  // Verify if two faces are the same person
  async verifyFaces(imageBuffer1, imageBuffer2, threshold = 0.8) {
    try {
      const formData = new FormData();
      formData.append('source_image', imageBuffer1, { filename: 'source.jpg' });
      formData.append('target_image', imageBuffer2, { filename: 'target.jpg' });

      const response = await axios.post(
        `${this.baseURL}/api/v1/verification/verify?limit=1&det_prob_threshold=${threshold}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'x-api-key': this.apiKey,
          },
        }
      );

      const result = response.data.result[0];
      const isMatch = result.similarity >= threshold;

      return {
        success: true,
        isMatch,
        similarity: result.similarity,
        threshold,
        message: isMatch ? 'Faces match' : 'Faces do not match'
      };

    } catch (error) {
      console.error('Face verification error:', error.response?.data || error.message);
      throw new Error(`Failed to verify faces: ${error.response?.data?.message || error.message}`);
    }
  }

  // Remove employee from recognition system
  async removeEmployee(employeeId) {
    try {
      await axios.delete(
        `${this.baseURL}/api/v1/recognition/subjects/${employeeId}`,
        {
          headers: {
            'x-api-key': this.recognitionApiKey,
          },
        }
      );

      return {
        success: true,
        message: 'Employee removed from recognition system'
      };

    } catch (error) {
      console.error('Remove employee error:', error.response?.data || error.message);
      throw new Error(`Failed to remove employee: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get all enrolled employees
  async getEnrolledEmployees() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/recognition/subjects`,
        {
          headers: {
            'x-api-key': this.recognitionApiKey,
          },
        }
      );

      return {
        success: true,
        employees: response.data.subjects,
        count: response.data.subjects.length
      };

    } catch (error) {
      console.error('Get enrolled employees error:', error.response?.data || error.message);
      throw new Error(`Failed to get enrolled employees: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Create singleton instance
const faceRecognitionService = new FaceRecognitionService();

module.exports = {
  faceRecognitionService,
  FaceRecognitionService
};


