// ─── Auth Controller ────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { adminRegisterSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';
import { changePasswordSchema } from '../validators/employee.validator';
import { sendSuccess } from '../utils/response';
import env from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export class AuthController {
  /**
   * Company Admin Registration — creates Organization + Admin User
   */
  async adminRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const data = adminRegisterSchema.parse(req.body);
      const result = await authService.registerAdmin(data);

      // Set refresh token cookie
      res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

      sendSuccess(res, {
        access_token: result.accessToken,
        token_type: 'bearer',
        user: result.user,
      }, 'Company admin registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data);

      // Set refresh token cookie
      res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

      sendSuccess(res, {
        access_token: result.accessToken,
        token_type: 'bearer',
        user: result.user,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided',
        });
      }

      const result = await authService.refreshTokens(refreshToken);

      // Rotate cookie
      res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

      sendSuccess(res, {
        access_token: result.accessToken,
        token_type: 'bearer',
      }, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
      }

      res.clearCookie('refresh_token', { path: '/' });
      res.clearCookie('access_token', { path: '/' });

      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const profile = await authService.getProfile(req.user.id);
      sendSuccess(res, profile, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(data.email);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(data);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google OAuth — redirect to Google consent screen
   */
  async googleRedirect(_req: Request, res: Response, next: NextFunction) {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return res.status(501).json({
          success: false,
          message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        });
      }

      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      });

      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google OAuth — handle callback with authorization code
   */
  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      const error = req.query.error as string;

      // User cancelled or there was an error
      if (error || !code) {
        return res.redirect(`${env.FRONTEND_URL}?auth_error=${encodeURIComponent(error || 'Google authentication was cancelled')}`);
      }

      const result = await authService.handleGoogleAuth(code);

      // Set refresh token cookie
      res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

      // Redirect to frontend with the access token
      res.redirect(`${env.FRONTEND_URL}?token=${result.accessToken}`);
    } catch (error) {
      // Redirect to frontend with error
      const message = error instanceof Error ? error.message : 'Google authentication failed';
      res.redirect(`${env.FRONTEND_URL}?auth_error=${encodeURIComponent(message)}`);
    }
  }
  /**
   * Change own password (any authenticated user)
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      const data = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user.id, data);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
