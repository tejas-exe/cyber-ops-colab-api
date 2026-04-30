import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthService } from 'src/auth/auth.service';

@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly authService: AuthService
  ) { }

  // POST /workspace
  @Post()
  createWorkspace(@Request() req, @Body('name') name: string) {
    return this.workspaceService.createWorkspace(req.user.id, name);
  }

  // GET /workspace
  @Get()
  getUserWorkspaces(@Request() req) {
    return this.workspaceService.getUserWorkspaces(req.user.id);
  }

  // GET /workspace/:id
  @Get(':id')
  getWorkspace(@Param('id') id: string, @Request() req) {
    return this.workspaceService.getWorkspace(id, req.user.id);
  }

  // DELETE /workspace/:id
  @Delete(':id')
  deleteWorkspace(@Param('id') id: string, @Request() req) {
    return this.workspaceService.deleteWorkspace(id, req.user.id);
  }

  // POST /workspace/:id/invite
  @Post(':id/invite')
  inviteMember(
    @Param('id') id: string,
    @Request() req,
    @Body('userId') inviteeId: string,
  ) {
    return this.workspaceService.inviteMember(id, req.user.id, inviteeId);
  }

  // DELETE /workspace/:id/member/:memberId
  @Delete(':id/member/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.workspaceService.removeMember(id, req.user.id, memberId);
  }

  // POST /workspace/:id/analysis
  @Post(':id/analyses')
  addAnalysis(
    @Param('id') id: string,
    @Request() req,
    @Body('response') response: object,
  ) {
    console.log("ID", id);
    console.log("USER", req.user.id);
    console.log("RESPONSE", response);
    return this.workspaceService.addAnalysis(id, req.user.id, response);
  }

  // GET /workspace/:id/analysis
  @Get(':id/analysis')
  getAnalyses(@Param('id') id: string, @Request() req) {
    return this.workspaceService.getAnalyses(id, req.user.id);
  }
}