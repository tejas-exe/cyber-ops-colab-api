import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class WorkspaceService {
    constructor(private readonly prisma: PrismaService) { }

    //!Create Workspace
    async createWorkspace(userId: string, name: string) {
        const workspace = await this.prisma.db.workspace.create({
            data: {
                name,
                createdById: userId,
                members: {
                    create: {
                        userId,
                    },
                },
            },
            include: {
                members: true,
            },
        });
        return workspace;
    }
    //!Get Workspace by ID
    async getWorkspace(workspaceId: string, userId: string) {
        const workspace = await this.prisma.db.workspace.findFirst({
            where: {
                id: workspaceId,
                deletedAt: null,
                members: {
                    some: {
                        userId,
                        deletedAt: null,
                    },
                },
            },
            include: {
                members: {
                    where: { deletedAt: null },
                    include: { user: true },
                },
                analyses: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found or access denied');
        }

        return workspace;
    }
    //!Get All Workspaces for a User
    async getUserWorkspaces(userId: string) {
        return this.prisma.db.workspace.findMany({
            where: {
                deletedAt: null,
                members: {
                    some: {
                        userId,
                        deletedAt: null,
                    },
                },
            },
            include: {
                members: {
                    where: { deletedAt: null },
                    include: { user: true },
                },
                _count: {
                    select: { analyses: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    //!Invite Member
    async inviteMember(workspaceId: string, requesterId: string, inviteeId: string) {
        const workspace = await this.prisma.db.workspace.findFirst({
            where: { id: workspaceId, deletedAt: null },
            include: {
                members: { where: { deletedAt: null } },
            },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        // only the creator can invite
        if (workspace.createdById !== requesterId) {
            throw new ForbiddenException('Only the workspace owner can invite members');
        }

        // enforce 5-member limit (owner + 5 others = 6 max)
        const activeMembers = workspace.members.length;
        if (activeMembers >= 6) {
            throw new BadRequestException(
                'Workspace is full — max 6 members (owner + 5)',
            );
        }

        // check if already a member
        const alreadyMember = workspace.members.some((m) => m.userId === inviteeId);
        if (alreadyMember) {
            throw new BadRequestException('User is already a member of this workspace');
        }

        // check invitee exists
        const invitee = await this.prisma.db.user.findUnique({
            where: { id: inviteeId },
        });

        if (!invitee) {
            throw new NotFoundException('User to invite not found');
        }

        return this.prisma.db.workspaceMember.create({
            data: {
                workspaceId,
                userId: inviteeId,
            },
            include: { user: true },
        });
    }
    //! Remove Member
    async removeMember(workspaceId: string, requesterId: string, memberId: string) {
        const workspace = await this.prisma.db.workspace.findFirst({
            where: { id: workspaceId, deletedAt: null },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        if (workspace.createdById !== requesterId) {
            throw new ForbiddenException('Only the workspace owner can remove members');
        }

        if (memberId === workspace.createdById) {
            throw new BadRequestException('Cannot remove the workspace owner');
        }

        const member = await this.prisma.db.workspaceMember.findFirst({
            where: { workspaceId, userId: memberId, deletedAt: null },
        });

        if (!member) {
            throw new NotFoundException('Member not found in workspace');
        }

        // soft delete
        return this.prisma.db.workspaceMember.update({
            where: { id: member.id },
            data: { deletedAt: new Date() },
        });
    }
    //!Delete Workspace
    async deleteWorkspace(workspaceId: string, userId: string) {
        const workspace = await this.prisma.db.workspace.findFirst({
            where: { id: workspaceId, deletedAt: null },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        if (workspace.createdById !== userId) {
            throw new ForbiddenException('Only the workspace owner can delete it');
        }

        // soft delete workspace and all its members
        await this.prisma.db.$transaction([
            this.prisma.db.workspaceMember.updateMany({
                where: { workspaceId, deletedAt: null },
                data: { deletedAt: new Date() },
            }),
            this.prisma.db.workspace.update({
                where: { id: workspaceId },
                data: { deletedAt: new Date() },
            }),
        ]);

        return { message: 'Workspace deleted successfully' };
    }

    // ─── Add Analysis (Log) ───────────────────────────────────────────────────────

    async addAnalysis(workspaceId: string, userId: string, response: object) {
        // verify user is a member of the workspace
        const member = await this.prisma.db.workspaceMember.findFirst({
            where: { workspaceId, userId, deletedAt: null },
        });

        if (!member) {
            throw new ForbiddenException('You are not a member of this workspace');
        }

        return this.prisma.db.analysis.create({
            data: {
                workspaceId,
                loggedById: userId,
                response,
            },
        });
    }

    //!Get Analyses for Workspace
    async getAnalyses(workspaceId: string, userId: string) {
        // verify membership
        const member = await this.prisma.db.workspaceMember.findFirst({
            where: { workspaceId, userId, deletedAt: null },
        });

        if (!member) {
            throw new ForbiddenException('You are not a member of this workspace');
        }

        return this.prisma.db.analysis.findMany({
            where: { workspaceId, deletedAt: null },
            include: { loggedBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }
}