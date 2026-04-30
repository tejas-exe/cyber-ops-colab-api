import * as jwt from 'jsonwebtoken'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }
    //! 
    generateAuthTokens(user: any) {
        const payload = {
            sub: user.id,
            emails: user.email
        }
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: (process.env.ACCESS_EXPIRE_TIME || "7m") as any
        })

        const refreshToken = jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: (process.env.REFRESH_EXPIRE_TIME || "14d") as any
        })
        return { accessToken, refreshToken }
    }
    //! 
    async findOrCreateUser(googleUser: any) {
        const { email, name } = googleUser;
        let user = await this.prisma.db.user.findUnique({
            where: { email },
        });
        if (!user) {
            user = await this.prisma.db.user.create({
                data: {
                    email,
                    name,
                    provider: 'google',
                },
            });
        }
        return user;
    }
    //!
    async getUserById(id: string) {
        const user = await this.prisma.db.user.findUnique({
            where: {
                id: id
            }
        })
        if (!user) {
            throw Error("NO USER FOUND")
        }
        return user
    }
    //!
    verifyAccessToken(token: string) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET!) as {
                sub: string;
                email: string;
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }
    //!  
    verifyRefreshToken(token: string) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET!) as {
                sub: string;
                email: string;
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token — please login again');
        }
    }
}
