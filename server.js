require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { SelfBackendVerifier, getUniversalLink } = require('@selfxyz/core');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

class ConfigStorage {
  async getConfig(configId) {
    return {
      olderThan: 18,
      ofac: true
    };
  }
}

const configStorage = new ConfigStorage();
let verifier = null;

// Initialize verifier with error handling
try {
  verifier = new SelfBackendVerifier({
    appScope: 'passport-verify',
    endpoint: process.env.VERIFICATION_ENDPOINT || 'http://localhost:3000/verify',
    allowedTypes: ['passport', 'eu_id_card'],
    userIdType: 'uuid',
    configStorage
  });
  console.log('SelfBackendVerifier initialized successfully');
} catch (error) {
  console.error('Error initializing SelfBackendVerifier:', error.message);
  console.log('Server will run without verification capability');
}

app.post('/verify', async (req, res) => {
  try {
    if (!verifier) {
      return res.status(503).json({ 
        error: 'Verification service unavailable',
        message: 'SelfBackendVerifier is not initialized' 
      });
    }

    const { attestationId, proof, publicSignals, userContext } = req.body;
    
    if (!attestationId || !proof || !publicSignals) {
      return res.status(400).json({ 
        error: 'Missing required fields: attestationId, proof, publicSignals' 
      });
    }

    const result = await verifier.verify(attestationId, proof, publicSignals, userContext);
    
    res.json({
      success: true,
      verification: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      message: error.message 
    });
  }
});

app.post('/generate-deeplink', async (req, res) => {
  try {
    const { 
      appName = 'Passport Verification App',
      userId = uuidv4(),
      minimumAge = 18,
      requireName = true,
      excludedCountries = [],
      checkOfac = true,
      userDefinedData
    } = req.body;

    if (!userDefinedData || userDefinedData.length !== 128) {
      return res.status(400).json({ 
        error: 'userDefinedData must be a 64-byte hex string (128 characters)' 
      });
    }

    // Create a basic app configuration object
    const appConfig = {
      appName,
      scope: 'passport-verify',
      endpoint: process.env.VERIFICATION_ENDPOINT || 'https://your-domain.com/verify',
      userId,
      version: 2,
      userDefinedData,
      disclosures: {
        minimumAge,
        name: requireName,
        excludedCountries,
        ofac: checkOfac
      }
    };

    const deeplink = getUniversalLink(appConfig);
    
    res.json({
      success: true,
      deeplink,
      userId,
      appConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Deeplink generation error:', error);
    res.status(500).json({ 
      error: 'Deeplink generation failed',
      message: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Verification endpoint: http://localhost:${PORT}/verify`);
  console.log(`Deeplink generation: http://localhost:${PORT}/generate-deeplink`);
});