import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

const COOKIE_OPTIONS = (maxAge: number) => ({
    httpOnly: true,
    secure: true, // Must be true for sameSite: 'none'
    sameSite: 'none' as const,
    maxAge,
})

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    //! 
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleLogin() { }
    //! 
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleCallback(@Req() req: Request & { user?: any }, @Res() res: Response) {
        const user = req.user
        const userResult = await this.authService.findOrCreateUser(user)
        const tokens = this.authService.generateAuthTokens(userResult);

        // Set cookies for the backend domain
        res.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS(15 * 60 * 1000));
        res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTIONS(7 * 24 * 60 * 60 * 1000));

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
    }
    //!
    @Post('refresh')
    async refresh(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies?.refresh_token || req.headers.authorization?.split(' ')[1];
        if (!token) throw new UnauthorizedException('No refresh token provided');

        // get fresh user from DB (catches deleted/deactivated users)
        const payload = this.authService.verifyRefreshToken(token);
        const user = await this.authService.getUserById(payload.sub);

        // issue brand new tokens (token rotation — old refresh token is now dead)
        const { accessToken, refreshToken } = this.authService.generateAuthTokens(user);

        res.cookie('access_token', accessToken, COOKIE_OPTIONS(15 * 60 * 1000));
        res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS(7 * 24 * 60 * 60 * 1000));
        // const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
        // const searchUser = await this.authService.getUserById(payload.sub);
        // return this.authService.generateAuthTokens(searchUser);

        return res.json({ message: 'Tokens refreshed' });
    }
    //!  
    @Post("logout")
    async logout(@Res() res: Response) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return res.json({ message: 'Logged out successfully' });
    }
    //! 
    @Get('me')
    async me(@Req() req: Request) {
        const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
        if (!token) throw new UnauthorizedException('Not authenticated');

        const payload = this.authService.verifyAccessToken(token);
        return this.authService.getUserById(payload.sub);
    }
}
