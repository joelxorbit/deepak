import {
  loginAdminService,
  fetchAdminDashboardStatsService
} from '../services/adminService.js';
import { ENV } from '../config/env.js';
import { sendSuccess } from '../utils/response.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const authData = await loginAdminService(username, password);

    res.cookie('elite_pitch_token', authData.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, 'Admin authenticated successfully', authData);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('elite_pitch_token', {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production'
    });
    return sendSuccess(res, 'Admin logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const dashboard = async (req, res, next) => {
  try {
    const stats = await fetchAdminDashboardStatsService();
    return sendSuccess(res, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};
