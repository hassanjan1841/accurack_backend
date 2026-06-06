import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';


// JWT payload structure
interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  clientId?: string;
  googleId?: string;
  iat?: number;
  exp?: number;
  excludedPermissions?: string[]; // <-- added this line
}

interface ValidatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  clientId: string;
  googleId: string | null;
  status: string;
  businessId?: string;
  stores: string[];
  createdAt: Date;
  updatedAt: Date;
  excludedPermissions?: string[]; // <-- added line
  business?: {
    id: string;
    businessName: string;
    contactNo: string;
    website?: string;
    logoUrl?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req?.cookies?.['accessToken'] ||
          req?.cookies?.['access_token'] ||
          req?.cookies?.['refreshToken'] ||
          req?.cookies?.['refresh_token'] ||
          null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    try {
      let user = await this.prisma.users.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          googleId: true,
          status: true,
          businessId: true,
          createdAt: true,
          updatedAt: true,
          excludedPermissions: true, // <-- added
          stores: {
            select: {
              storeId: true,
            },
          },
          business: {
            select: {
              id: true,
              businessName: true,
              contactNo: true,
              website: true,
              logoUrl: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found or inactive.');
      }

      const storeIds = user.stores.map((s) => s.storeId);

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role ?? null,
        clientId: user.clientId,
        googleId: user.googleId ?? null,
        status: user.status,
        businessId: user.businessId ?? undefined,
        stores: storeIds,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        excludedPermissions: Array.isArray(user.excludedPermissions)
          ? (user.excludedPermissions as string[])
          : Array.isArray(payload.excludedPermissions)
            ? payload.excludedPermissions
            : undefined,

        ...(user.business && {
          business: {
            id: user.business.id,
            businessName: user.business.businessName,
            contactNo: user.business.contactNo,
            website: user.business.website ?? undefined,
            logoUrl: user.business.logoUrl ?? undefined,
          },
        }),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('JWT validation failed.');
    }
  }
}
