import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  welcome(): { message: string } {
    return { message: 'Welcome to the Taskly API' };
  }
}
