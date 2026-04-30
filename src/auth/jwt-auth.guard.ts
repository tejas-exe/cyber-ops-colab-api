import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        
        // Try to get token from cookies or Authorization header
        const token = request.cookies?.access_token || 
                      request.headers.authorization?.split(' ')[1];

        if (!token) throw new UnauthorizedException('Not authenticated');

        // verify and attach user to request
        const payload = this.authService.verifyAccessToken(token);
        request.user = { id: payload.sub, email: payload.email };

        return true;
    }
}