import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@repo/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
