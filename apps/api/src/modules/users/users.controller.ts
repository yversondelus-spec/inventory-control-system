import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(@Body() body: {
    email: string;
    nombre: string;
    apellido: string;
    role: string;
    password: string;
  }) {
    return this.usersService.create(body);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMINISTRADOR)
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.usersService.updateRole(id, body.role);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ADMINISTRADOR)
  toggleActive(@Param('id') id: string, @Body() body: { activo: boolean }) {
    return this.usersService.toggleActive(id, body.activo);
  }
}