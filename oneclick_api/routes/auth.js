/**
 * Auth Routes
 * Handles token validation for Vercel and Railway platforms
 */

const express = require('express');
const router = express.Router();

/**
 * Validate Vercel token by calling Vercel API
 */
async function validateVercelToken(token) {
  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        platform: 'vercel',
        error: error.error?.message || 'Invalid token',
      };
    }

    const data = await response.json();
    return {
      valid: true,
      platform: 'vercel',
      user: {
        id: data.user.id,
        name: data.user.name || data.user.username,
        email: data.user.email,
        username: data.user.username,
        avatar: data.user.avatar,
      },
    };
  } catch (error) {
    return {
      valid: false,
      platform: 'vercel',
      error: error.message || 'Network error',
    };
  }
}

/**
 * Validate Railway token by calling Railway GraphQL API
 */
async function validateRailwayToken(token) {
  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { me { id email name avatar } }`,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return {
        valid: false,
        platform: 'railway',
        error: data.errors[0]?.message || 'Invalid token',
      };
    }

    if (!data.data?.me) {
      return {
        valid: false,
        platform: 'railway',
        error: 'Invalid token',
      };
    }

    return {
      valid: true,
      platform: 'railway',
      user: {
        id: data.data.me.id,
        name: data.data.me.name || data.data.me.email,
        email: data.data.me.email,
        avatar: data.data.me.avatar,
      },
    };
  } catch (error) {
    return {
      valid: false,
      platform: 'railway',
      error: error.message || 'Network error',
    };
  }
}

/**
 * POST /api/auth/validate
 * Validate a platform token
 * 
 * Body: { platform: 'vercel' | 'railway', token: string }
 */
router.post('/validate', async (req, res) => {
  try {
    const { platform, token } = req.body;

    if (!platform || !token) {
      return res.status(400).json({
        success: false,
        error: 'Platform and token are required',
      });
    }

    if (!['vercel', 'railway'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be "vercel" or "railway"',
      });
    }

    let result;
    if (platform === 'vercel') {
      result = await validateVercelToken(token);
    } else {
      result = await validateRailwayToken(token);
    }

    return res.json({
      success: result.valid,
      data: result,
      error: result.error,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/health
 * Health check for auth service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
