import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { google } from 'googleapis';
import { MailService } from '../mail/mail.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  GoogleProfileDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  SignupSuperAdminDto,
  CreateClientWithSuperAdminDto,
  LoginDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { Role, Status } from '@prisma/client';

import * as crypto from 'crypto';


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly permissionsService: PermissionsService,
    private readonly multiTenantService: MultiTenantService,
  ) {}
  async googleLogin(googleUser: GoogleProfileDto): Promise<AuthResponseDto> {
    try {
      // Try to find user by Google ID or email across all databases
      let user = await this.findUserAcrossDatabases(googleUser.email, {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        clientId: true,
        googleId: true,
        stores: { select: { storeId: true } },
      });

      // If not found by googleId, check by email and link googleId if needed
      if (!user) {
        user = await this.findUserAcrossDatabases(googleUser.email, {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          googleId: true,
          stores: { select: { storeId: true } },
        });
        // If user exists with same email but no googleId, link the accounts
        if (user && !user.googleId) {
          await this.prisma.users.update({
            where: { id: user.id },
            data: {
              googleId: googleUser.id,
              googleRefreshToken: googleUser.refreshToken || null,
            },
          });
          user.googleId = googleUser.id;
        }
      }

      // If no user exists, throw error (or handle creation if desired)
      if (!user) {
        throw new BadRequestException('Failed to create or find user');
      }

      // Update refresh token if provided
      if (googleUser.refreshToken && user) {
        await this.prisma.users.update({
          where: { id: user.id },
          data: { googleRefreshToken: googleUser.refreshToken },
        });
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) =>
              typeof s === 'string' ? s : s.storeId,
            )
            : [];

      // Include excludedPermissions in JWT payload for super_admin
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        stores: stores,
        googleId: user.googleId, // Optionally include for Google-specific logic
        excludedPermissions: user.excludedPermissions ?? [],
      };

      // Generate access token (15 minutes)
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      // Generate refresh token (7 days)
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      let userPermissions: any = null;
      try {
        userPermissions = await this.permissionsService.getUserPermissions(
          user.id,
        );
      } catch (error) {
        console.error(
          'Failed to get user permissions during Google login:',
          error,
        );
        userPermissions = {
          userId: user.id,
          permissions: [],
          roleTemplates: [],
        };
      }

      try {
        await this.prisma.auditLogs.create({
          data: {
            userId: user.id,
            clientId: user.clientId,
            action: 'google_login',
            resource: 'auth',
            details: { email: user.email },
          },
        });
      } catch (error) {
        console.error('Failed to create audit log for Google login:', error);
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || undefined,
          clientId: user.clientId,
          stores: stores,
          permissions: userPermissions,
          provider: 'google',
          googleId: user.googleId,
        },
        message: 'Google authentication successful',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Google authentication failed');
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }

  private getDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('Database URL is not configured');
    }
    return databaseUrl;
  }

  private generateOtp(): string {
    // In production, use a more secure random number generator
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async validateInput(dto: SignupSuperAdminDto): Promise<void> {
    const { firstName, lastName, email, password, clientId } = dto;

    if (!firstName || !lastName || !email || !password || !clientId) {
      throw new BadRequestException('All fields are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter and one number',
      );
    }

    // Validate UUID format for clientId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      throw new BadRequestException('Invalid client ID format');
    }
  }

  async signupSuperAdmin(dto: SignupSuperAdminDto) {
    try {
      // Validate input
      await this.validateInput(dto);

      const { firstName, lastName, email, password, clientId } = dto;

      // Check if the client/tenant exists
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, status: true },
      });

      if (!client) {
        throw new BadRequestException('Invalid client ID - tenant not found');
      }

      if (client.status !== 'active') {
        throw new BadRequestException('Client/tenant is not active');
      }

      // Check for existing user
      const existingUser = await this.prisma.users.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate OTP
      const otp = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

      // Create user only (client already exists)
      const user = await this.prisma.users.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash,
          role: Role.super_admin,
          clientId: clientId, // Use provided clientId
          status: Status.active,
          otp,
          otpExpiresAt,
          isOtpUsed: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new InternalServerErrorException('Failed to create user');
      }

      // Send OTP email
      await this.mailService.sendMail({
        to: email,
        subject: 'Your OTP Code - Accurack',
        html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
      });

      // Assign default permissions for super admin
      try {
        await this.permissionsService.assignDefaultPermissions(user.id);
      } catch (error) {
        console.error(
          'Failed to assign default permissions to super admin:',
          error,
        );
      }

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: clientId,
          action: 'user_created',
          resource: 'auth',
          details: {
            role: Role.super_admin,
            email,
            clientId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        message: 'Super Admin created successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          clientId: clientId,
        },
      };
    } catch (error) {
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        throw new BadRequestException('Email already exists');
      }

      // Log error for debugging (in production, use proper logging service)
      console.error('Super admin signup error:', error);

      // Throw appropriate error
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to create Super Admin');
    }
  }

  private async validateOtpInput(email: string, otp: string): Promise<void> {
    // Validate email
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate OTP
    if (!otp) {
      throw new BadRequestException('OTP is required');
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException('OTP must be a 6-digit number');
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    try {
      // Validate input
      await this.validateOtpInput(email, otp);

      // Find user with OTP
      const user = await this.prisma.users.findFirst({
        where: {
          email,
          otp,
          otpExpiresAt: { gt: new Date() },
          isOtpUsed: false,
        },
        select: {
          id: true,
          clientId: true,
          otpExpiresAt: true,
        },
      });

      // Verify OTP existence and validity
      if (!user) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Mark OTP as used
      await this.prisma.users.update({
        where: { id: user.id },
        data: { isOtpUsed: true, otp: null, otpExpiresAt: null },
      });

      // Log OTP verification
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'otp_verified',
          resource: 'auth',
          details: {
            email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { message: 'OTP verified successfully' };
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      console.error('OTP verification error:', error);

      // Handle specific errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to verify OTP');
    }
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    try {
      // Validate email
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Find user with this email
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          email: true,
          status: true,
          isOtpUsed: true,
          clientId: true,
        },
      });

      if (!user) {
        // Silently return to prevent email enumeration
        return {
          message:
            'If an account exists, a new OTP has been sent to your email.',
        };
      }

      if (user.status !== Status.active) {
        throw new BadRequestException('User account is not active');
      }

      // Check if OTP is already verified
      if (user.isOtpUsed) {
        throw new BadRequestException(
          'Account is already verified. Please login instead.',
        );
      }

      // Generate new OTP
      const otp = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

      // Update user with new OTP
      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          otp,
          otpExpiresAt,
          isOtpUsed: false,
        },
      });

      // Send OTP email
      await this.mailService.sendMail({
        to: email,
        subject: 'Your New OTP Code - Accurack',
        html: `
          <h2>Your New OTP Code</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a new OTP code. Here is your verification code:</p>
          <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${otp}</h3>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'otp_resent',
          resource: 'auth',
          details: {
            email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { message: 'A new OTP has been sent to your email address.' };
    } catch (error) {
      // Log error for debugging
      console.error('Resend OTP error:', error);

      // Handle specific errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to resend OTP');
    }
  }

  /**
   * Helper method to find user across master and tenant databases
   */
  public async findUserAcrossDatabases(
    email: string,
    selectFields: any = {},
  ): Promise<any | null> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: selectFields,
    });

    return user;
  }

  /**
   * Helper method to find user by ID across master and tenant databases
   */
  private async findUserByIdAcrossDatabases(
    userId: string,
    _clientId?: string,
    selectFields: any = {},
  ): Promise<any | null> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: selectFields,
    });

    return user;
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      stores: { storeId: string }[] | string[];
      permissions: any;
    };
  }> {
    const { email, password } = dto;

    // First, try to find user in master database (for super_admin, admin, etc.)
    let user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      clientId: true,
      stores: { select: { storeId: true } },
      excludedPermissions: true,
    });

    // Add type guard
    if (Array.isArray(user)) {
      throw new Error('Unexpected: findUserAcrossDatabases returned an array');
    }

    if (!user || user.status !== Status.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Fix stores property handling
    const stores =
      user.role === Role.super_admin
        ? ['*']
        : Array.isArray(user.stores)
          ? user.stores.map((s: any) => (typeof s === 'string' ? s : s.storeId))
          : [];

    // Include excludedPermissions for super_admin
    const payload: any = {
      id: user.id,
      role: user.role,
      email: user.email,
      clientId: user.clientId,
      stores: stores,
    };
    if (user.role === Role.super_admin && user.excludedPermissions) {
      payload.excludedPermissions = user.excludedPermissions;
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    try {
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'login',
          resource: 'auth',
          details: { email },
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }

    let userPermissions: any = null;
    try {
      userPermissions = await this.permissionsService.getUserPermissions(
        user.id,
      );
    } catch (error) {
      console.error('Failed to get user permissions during login:', error);
      userPermissions = {
        userId: user.id,
        permissions: [],
        roleTemplates: [],
      };
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role ?? 'employee',
        stores: stores,
        permissions: userPermissions,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET, // Use same secret as access token
      });

      // First, try to find user in master database
      let user = await this.findUserByIdAcrossDatabases(
        decoded.id,
        decoded.clientId,
        {
          id: true,
          role: true,
          email: true,
          clientId: true,
          status: true,
          stores: { select: { storeId: true } },
          excludedPermissions: true,
        },
      );

      // Add type guard
      if (Array.isArray(user)) {
        throw new Error(
          'Unexpected: findUserByIdAcrossDatabases returned an array',
        );
      }

      if (!user || user.status !== Status.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) =>
              typeof s === 'string' ? s : s.storeId,
            )
            : [];

      const payload = {
        id: user.id,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        stores: stores,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    // First, try to find user in master database
    let user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      email: true,
      clientId: true,
      role: true,
      excludedPermissions: true,
    });

    // Add type guard
    if (Array.isArray(user)) {
      throw new Error('Unexpected: findUserAcrossDatabases returned an array');
    }

    if (!user) {
      // Silently return to prevent email enumeration
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    console.log(
      `Password reset requested for user: ${user.email} (role: ${user.role}, clientId: ${user.clientId})`,
    );

    try {
      // Invalidate existing tokens
      await this.prisma.passwordResetTokens.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetTokens.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
          clientId: user.clientId,
        },
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      console.log(`Reset link: ${resetLink}`);

      await this.mailService.sendMail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `<p>Hi ${user.firstName},</p>
               <p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. The link expires in 1 hour.</p>
               <p>If you didn't request this, please ignore this email.</p>`,
      });

      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'password_reset_requested',
          resource: 'auth',
          details: { email },
        },
      });
    } catch (error) {
      console.error('Failed to process password reset:', error);
    }

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  /**
   * Helper method to find reset token across master and tenant databases
   */
  private async findResetTokenAcrossDatabases(token: string): Promise<{
    resetToken: any;
    user: any;
    isTenantUser: boolean;
    clientId?: string;
  } | null> {
    const resetToken = await this.prisma.passwordResetTokens.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken) return null;

    const user = await this.prisma.users.findUnique({
      where: { id: resetToken.userId },
      select: { id: true, email: true, clientId: true, role: true },
    });

    if (!user) return null;

    return {
      resetToken,
      user,
      isTenantUser: false,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    // Find reset token across all databases
    const tokenData = await this.findResetTokenAcrossDatabases(token);

    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { resetToken, user, isTenantUser, clientId } = tokenData;

    // Validate token
    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token already used');
    }
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token expired');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      // Update password in unified database
      await this.prisma.users.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Mark token as used
      await this.prisma.passwordResetTokens.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'password_reset',
          resource: 'auth',
          details: { email: user.email },
        },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async invite(
    dto: InviteDto,
    userId: string,
    userRole: Role,
    userStores: { storeId: string }[],
  ) {
    const { email, storeId, role } = dto;

    if (role === Role.admin && userRole !== Role.super_admin) {
      throw new ForbiddenException('Only Super Admin can invite Admins');
    }

    const store = await this.prisma.stores.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, clientId: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (
      userRole === Role.admin &&
      !userStores.some((s) => s.storeId === storeId)
    ) {
      throw new ForbiddenException('No access to this store');
    }

    const existingInvite = await this.prisma.inviteLinks.findFirst({
      where: {
        email,
        userId,
        status: Status.pending,
      },
      select: { id: true },
    });
    if (existingInvite) {
      throw new BadRequestException(
        'Active invite already exists for this email',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    const invite = await this.prisma.inviteLinks.create({
      data: {
        token,
        email,
        role,
        userId,
        storeId,
        status: Status.pending,
        clientId: store.clientId,
      },
      select: { id: true, token: true },
    });

    const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;
    try {
      await this.mailService.sendMail({
        to: email,
        subject: `Invitation to join ${store.name} as ${role}`,
        html: `<p>Click <a href="${inviteLink}">here</a> to create your account.</p>`,
      });
    } catch (error) {
      await this.prisma.inviteLinks.delete({ where: { id: invite.id } });
      throw new BadRequestException('Failed to send invitation email');
    }

    await this.prisma.auditLogs.create({
      data: {
        userId,
        clientId: store.clientId,
        action: 'invite_sent',
        resource: 'auth',
        details: { email, role, storeId },
      },
    });

    return { message: 'Invite link generated', inviteLink };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const { token, firstName, lastName, password } = dto;

    const invite = await this.prisma.inviteLinks.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        userId: true,
        storeId: true,
      },
    });
    if (!invite) {
      throw new BadRequestException('Invalid invite link');
    }
    if (invite.status !== Status.pending) {
      throw new BadRequestException('Invite link already used or invalid');
    }
    if (!invite.storeId) {
      throw new BadRequestException('Invite link is missing store assignment');
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const inviter = await this.prisma.users.findUnique({
      where: { id: invite.userId },
      select: { id: true, clientId: true },
    });
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email: invite.email,
        passwordHash,
        role: invite.role,
        clientId: inviter.clientId,
        status: Status.active,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    await this.prisma.userStoreMap.create({
      data: {
        userId: user.id,
        storeId: invite.storeId,
        clientId: inviter.clientId,
      },
    });

    // Assign default permissions using the new permission system
    try {
      await this.permissionsService.assignDefaultPermissions(
        user.id,
        invite.storeId,
      );
    } catch (error) {
      console.error('Failed to assign default permissions:', error);
      // Continue without throwing error since user is already created
    }

    if (invite.role === Role.employee) {
      await this.prisma.notifications.create({
        data: {
          userId: invite.userId,
          clientId: inviter.clientId,
          title: 'Account Created',
          message: `${firstName} ${lastName} has created an account as an employee.`,
          read: false,
        },
      });
    }

    await this.prisma.inviteLinks.update({
      where: { token },
      data: { status: Status.active },
    });

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        clientId: inviter.clientId,
        action: 'user_created',
        resource: 'auth',
        details: { role: invite.role, email: invite.email },
      },
    });

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getUserWithPermissions(reqUser: any) {
    try {
      // First, try to find user in master database
      const user = await this.findUserByIdAcrossDatabases(
        reqUser?.id,
        reqUser?.clientId,
        {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          googleId: true,
          status: true,
          stores: { select: { storeId: true } },
          excludedPermissions: true,
        },
      );

      // Add type guard
      if (Array.isArray(user)) {
        throw new Error(
          'Unexpected: findUserByIdAcrossDatabases returned an array',
        );
      }

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) =>
                typeof s === 'string' ? s : s.storeId,
              )
            : [];

      // Get user permissions
      let userPermissions: any = null;
      try {
        userPermissions = await this.permissionsService.getUserPermissions(
          user.id,
        );
      } catch (error) {
        console.error('Failed to get user permissions:', error);
        userPermissions = {
          userId: user.id,
          permissions: [],
          roleTemplates: [],
        };
      }

      const effectiveExclusions =
        await this.permissionsService.getEffectiveExclusionsForUser(
          this.prisma,
          user.id,
        );
      // console.log('effectiveExclusions', effectiveExclusions);
      return {
        ...user,
        stores: stores,
        permissions: userPermissions,
        excludedPermissions: effectiveExclusions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to get user with permissions',
      );
    }
  }

  async getPermissions(userId: string, storeId: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          stores: { select: { storeId: true } },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const storeAccess = user.stores.find((s) => s.storeId === storeId);
      if (!storeAccess && user.role !== Role.super_admin) {
        throw new ForbiddenException('No access to this store');
      }

      // Use the new PermissionsService to get user permissions
      const userPermissions = await this.permissionsService.getUserPermissions(
        userId,
        storeId,
      );

      // For super_admin and admin, they have broader access
      if (user.role === Role.super_admin || user.role === Role.admin) {
        return {
          role: user.role,
          permissions: userPermissions.permissions,
          roleTemplates: userPermissions.roleTemplates,
          hasFullAccess: true,
        };
      }

      // For employees and managers, use user data directly since employee fields are now in User model
      // Check if user has access to this store
      const userStoreAccess = await this.prisma.userStoreMap.findFirst({
        where: {
          userId: user.id,
          storeId: storeId,
        },
      });

      if (!userStoreAccess) {
        throw new ForbiddenException('No access to this store');
      }

      if (user.status !== Status.active) {
        throw new ForbiddenException('User account is not active');
      }

      return {
        role: user.role,
        permissions: userPermissions.permissions,
        roleTemplates: userPermissions.roleTemplates,
        userInfo: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          status: user.status,
          employeeCode: (user as any).employeeCode,
          position: (user as any).position,
          department: (user as any).department,
        },
        hasFullAccess: false,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get user permissions');
    }
  }

  async getGoogleUserInfo(user: any) {
    try {
      // Check if the user has a Google access token stored
      if (!user.googleAccessToken) {
        throw new UnauthorizedException(
          'No Google access token available. Please re-authenticate with Google.',
        );
      }

      // Make request to Google's userinfo endpoint with the access token
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.googleAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthorizedException(
            'Google access token is invalid or expired. Please re-authenticate.',
          );
        }
        throw new BadRequestException(
          `Failed to fetch Google user info: ${response.statusText}`,
        );
      }

      const googleUserInfo = await response.json();

      return {
        message: 'Google user information retrieved successfully',
        data: googleUserInfo,
        tokenUsed: user.googleAccessToken.substring(0, 10) + '...', // Show first 10 chars for debugging
      };
    } catch (error) {
      console.error('Error fetching Google user info:', error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve Google user information',
      );
    }
  }

  async refreshGoogleToken(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { googleRefreshToken: true },
      });

      if (!user?.googleRefreshToken) {
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:4000/api/v1/auth/google/callback',
      );

      oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // If a new refresh token is provided, update it in the database
      if (credentials.refresh_token) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { googleRefreshToken: credentials.refresh_token },
        });
      }

      return credentials.access_token || null;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }

  /**
   * Alternative approach: Handle different Google user scenarios
   * You can configure this behavior based on your needs
   */
  private async handleGoogleUserCreation(googleUser: GoogleProfileDto) {
    // Strategy 1: Create with default client (current implementation)
    // Strategy 2: Require invitation (uncomment the line below)
    // throw new BadRequestException('Google authentication requires an invitation. Please contact your administrator.');

    // Strategy 3: Allow self-registration with limited permissions
    // Create user with a specific "guest" client

    const defaultClient = await this.getOrCreateDefaultClient();

    const newUser = await this.prisma.users.create({
      data: {
        googleId: googleUser.id,
        firstName: googleUser.firstName || '', // Handle missing first name
        lastName: googleUser.lastName || '', // Handle missing last name
        email: googleUser.email,
        passwordHash: '', // Empty for Google users
        googleRefreshToken: googleUser.refreshToken || null,
        role: Role.employee, // You can change this to 'guest' or another role
        clientId: defaultClient.id,
        status: Status.active,
      },
      include: { client: true },
    });

    // Assign default permissions for new Google user
    try {
      await this.permissionsService.assignDefaultPermissions(newUser.id);
    } catch (error) {
      console.error(
        'Failed to assign default permissions to Google user:',
        error,
      );
      // Continue without throwing error since user is created
    }

    return newUser;
  }

  private async getOrCreateDefaultClient() {
    let defaultClient = await this.prisma.clients.findFirst({
      where: { email: 'default@accurack.com' },
    });

    if (!defaultClient) {
      defaultClient = await this.prisma.clients.create({
        data: {
          name: 'Default Client',
          email: 'default@accurack.com',
          tier: 'free',
        },
      });
    }

    return defaultClient;
  }

  async createClientWithSuperAdmin(dto: CreateClientWithSuperAdminDto) {
    const rollbackActions: (() => Promise<void>)[] = [];
    let client: any;
    let user: any;

    try {
      // Step 1: Validate user and client don't exist
      await this.validateUserAndClientExistence(dto);

      // Step 2: Create client record
      client = await this.createClientRecord(dto);
      rollbackActions.push(() => this.rollbackClientRecord(client.id));

      // Step 3: Create super admin user
      user = await this.createSuperAdminUser(dto, client.id);
      rollbackActions.push(() => this.rollbackUserRecord(user.id));

      // Step 4: Assign permissions and send email
      await this.assignPermissionsAndSendEmail(user, dto);

      // Step 5: Activate user
      await this.activateUser(user.id, client.id);

      return {
        success: true,
        message:
          'Client and super admin account created successfully. Please check your email for OTP verification.',
        data: {
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
          },
          user: { ...user, status: Status.active, otp: null },
        },
      };
    } catch (error) {
      console.error('Create client with super admin error:', error);
      await this.executeRollbacks(rollbackActions);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create client and user account: ' + error.message,
      );
    }
  }

  private async validateUserAndClientExistence(
    dto: CreateClientWithSuperAdminDto,
  ) {
    const { email, companyEmail } = dto;

    // Check for existing user in all databases
    const existingUserAnywhere = await this.findUserAcrossDatabases(email, {
      id: true,
      status: true,
    });
    if (existingUserAnywhere) {
      throw new BadRequestException('User email already exists in the system');
    }

    // Check for existing client
    const clientEmailToUse = companyEmail || email;
    const existingClient = await this.prisma.clients.findUnique({
      where: { email: clientEmailToUse },
      select: { id: true, name: true },
    });

    if (existingClient) {
      throw new BadRequestException(
        `Company email '${clientEmailToUse}' already exists for client '${existingClient.name}'`,
      );
    }
  }

  private async createClientRecord(dto: CreateClientWithSuperAdminDto) {
    const { companyName, companyEmail, companyPhone, companyAddress, email } =
      dto;
    const clientEmailToUse = companyEmail || email;

    return await this.prisma.clients.create({
      data: {
        name: companyName,
        email: clientEmailToUse,
        phone: companyPhone,
        address: companyAddress,
        status: Status.active,
        tier: 'free',
      },
    });
  }

  private async createSuperAdminUser(
    dto: CreateClientWithSuperAdminDto,
    clientId: string,
  ) {
    const { firstName, lastName, email, password, companyPhone } = dto;
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const exclusions = [{ resource: 'msa', action: '*' }];

    return await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: 'super_admin',
        clientId,
        status: 'pending',
        otp,
        phone: companyPhone,
        otpExpiresAt,
        isOtpUsed: false,
        excludedPermissions: exclusions,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone:true,
        role: true,
        clientId: true,
        status: true,
        otp: true,
      },
    });
  }

  private async assignPermissionsAndSendEmail(
    user: any,
    dto: CreateClientWithSuperAdminDto,
  ) {
    await this.permissionsService.assignDefaultPermissions(user.id, undefined, user.clientId);

    await this.mailService.sendMail({
      to: user.email,
      subject: 'Welcome to Accurack - Complete Your Setup',
      html: `
        <h2>Welcome to Accurack!</h2>
        <p>Your account has been created successfully for <strong>${dto.companyName}</strong>.</p>
        <p>To complete your setup, please verify your email with this OTP code:</p>
        <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${user.otp}</h3>
        <p>This code will expire in 10 minutes.</p>
        <p>Once verified, you can start managing your business with Accurack!</p>
      `,
    });
  }

  private async activateUser(userId: string, clientId: string) {
    await this.prisma.users.update({
      where: { id: userId },
      data: { status: Status.active },
    });
  }

  private async executeRollbacks(rollbackActions: (() => Promise<void>)[]) {
    // Execute rollbacks in reverse order
    for (let i = rollbackActions.length - 1; i >= 0; i--) {
      try {
        await rollbackActions[i]();
      } catch (rollbackError) {
        console.error(`Rollback action ${i} failed:`, rollbackError);
      }
    }
  }

  private async rollbackClientRecord(clientId: string) {
    try {
      await this.prisma.clients.delete({ where: { id: clientId } });
      console.log(`Rolled back client record: ${clientId}`);
    } catch (error) {
      console.error(`Failed to rollback client record ${clientId}:`, error);
    }
  }

  private async rollbackUserRecord(userId: string) {
    try {
      await this.prisma.users.delete({ where: { id: userId } });
      console.log(`Rolled back user record: ${userId}`);
    } catch (error) {
      console.error(`Failed to rollback user record ${userId}:`, error);
    }
  }

  /**
   * Fix permissions for existing super admin users who don't have them
   * This is a one-time fix method
   */
  async fixSuperAdminPermissions(email: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: { id: true, role: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'super_admin') {
        throw new BadRequestException('User is not a super admin');
      }

      // Assign default permissions
      await this.permissionsService.assignDefaultPermissions(user.id);

      return {
        success: true,
        message: `Permissions successfully assigned to super admin ${user.email}`,
        data: {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Fix super admin permissions error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix super admin permissions: ' + error.message,
      );
    }
  }

  /**
   * Fix missing client record in tenant database
   */
  async fixClientRecord(clientId: string) {
    try {
      // Get client data from master database
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          tier: true,
        },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${clientId} not found`);
      }

      // Ensure client record exists in tenant database
      await this.multiTenantService.ensureClientRecordExists(clientId, client);

      return {
        success: true,
        message: `Client record synchronized successfully for ${client.name}`,
        data: {
          clientId: client.id,
          clientName: client.name,
          email: client.email,
        },
      };
    } catch (error) {
      console.error('Fix client record error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix client record: ' + error.message,
      );
    }
  }

  /**
   * Fix missing user record in tenant database
   */
  async fixUserRecord(userId: string) {
    try {
      // Validate userId parameter
      if (!userId || typeof userId !== 'string') {
        throw new BadRequestException('Valid userId is required');
      }

      // Get user data from master database
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          passwordHash: true,
          role: true,
          clientId: true,
          status: true,
          otp: true,
          otpExpiresAt: true,
          isOtpUsed: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if user exists in tenant database first
      const userExists = await this.multiTenantService.validateUserExists(
        user.clientId,
        user.id,
      );

      if (userExists) {
        return {
          success: true,
          message: `User record already exists in tenant database for ${user.firstName} ${user.lastName}`,
          data: {
            userId: user.id,
            email: user.email,
            clientId: user.clientId,
            alreadyExists: true,
          },
        };
      }

      // Ensure user record exists in tenant database
      await this.multiTenantService.ensureUserRecordExists(user.clientId, user);

      // Verify the user was actually inserted
      const userExistsAfter = await this.multiTenantService.validateUserExists(
        user.clientId,
        user.id,
      );

      return {
        success: true,
        message: `User record synchronized successfully for ${user.firstName} ${user.lastName}`,
        data: {
          userId: user.id,
          email: user.email,
          clientId: user.clientId,
          wasInserted: userExistsAfter,
        },
      };
    } catch (error) {
      console.error('Fix user record error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix user record: ' + error.message,
      );
    }
  }

  /**
   * Test method to verify super admin can access all stores in tenant
   */
  async testSuperAdminAccess(user: any) {
    try {
      const tenantInfo = user.clientId
        ? `Single DB mode — user belongs to client ${user.clientId}`
        : 'No tenant context';
      return {
        success: true,
        message: 'Super admin access test completed',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
            stores: user.stores, // Should be ['*'] for super admin
          },
          tenantInfo,
          canAccessAllStores:
            user.role === 'super_admin' || user.stores?.includes('*'),
          instructions: [
            'Super admin should have stores: ["*"]',
            'This allows access to any store ID in the tenant database',
            'Try calling /stores endpoint to see all stores in tenant',
            'Try calling /products/create with any storeId from tenant DB',
          ],
        },
      };
    } catch (error) {
      console.error('Test super admin access error:', error);
      throw new InternalServerErrorException(
        'Failed to test super admin access: ' + error.message,
      );
    }
  }

  async changePassword(
    reqUser: any,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const userId = reqUser?.id;
    try {
      // Validate that new passwords match
      if (newPassword !== confirmPassword) {
        throw new BadRequestException(
          'New password and confirm password do not match',
        );
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new BadRequestException(
          'New password must be at least 8 characters long',
        );
      }

      if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new BadRequestException(
          'New password must contain at least one uppercase letter and one number',
        );
      }

      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          status: true,
          role: true,
          clientId: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status !== Status.active) {
        throw new ForbiddenException('User account is not active');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash,
      );
      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await this.prisma.users.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          clientId: user.clientId,
          action: 'password_changed',
          resource: 'auth',
          details: {
            email: user.email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        message: 'Password changed successfully',
        success: true,
      };
    } catch (error) {
      // Log error for debugging
      console.error('Change password error:', error);

      // Handle specific errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to change password');
    }
  }

  /**
   * Test method to verify multi-tenant authentication
   */
  async testMultiTenantAuth(email: string) {
    console.log(`🔍 Testing multi-tenant authentication for: ${email}`);

    const user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      clientId: true,
      status: true,
    });

    if (user) {
      console.log(`✅ User found:`, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        status: user.status,
        database: user.clientId ? `tenant_${user.clientId}` : 'master',
      });
      return user;
    } else {
      console.log(`❌ User not found: ${email}`);
      return null;
    }
  }
}
