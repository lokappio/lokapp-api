import {CanActivate, ExecutionContext, Inject, Injectable} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import ProjectsService from "../projects/projects.service";
import User from "../users/user.entity";
import {ROLES_KEY} from "./role.decorator";
import Role from "./role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject("ProjectsService") private readonly projectsService: ProjectsService) {
  }

  async checkRole(requiredRoles: Role[], projectId: number, userId: string): Promise<boolean> {
    const currentRole: Role = await this.projectsService.getRoleOfUserInProject(userId, projectId);
    if (!currentRole) {
      return false;
    }
    return requiredRoles.includes(currentRole);
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const params = request.params;

    let projectId: number = params.projectId;
    if (!projectId && request.body && request.body.projectId) {
      projectId = request.body.projectId;
    }
    const userId: string = this.getUserId(context);

    return this.checkRole(requiredRoles, projectId, userId);
  }

  private getUserId(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const user = <User>request.user;
    if (!user) {
      return null;
    }
    const userId = user.id;
    if (!userId) {
      return null;
    }
    return userId;
  }
}