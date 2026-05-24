import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from '../user/user.service';
import { ROUTING_KEYS } from '../messaging/messaging.constants';

interface UserRegisteredEvent {
  userId: string;
  tenantId?: string;
  email: string;
  role: string;
  timestamp: string;
}

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly userService: UserService) {}

  @EventPattern(ROUTING_KEYS.AUTH_USER_REGISTERED)
  async onUserRegistered(@Payload() event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`User registered event: userId=${event.userId} email=${event.email}`);
    try {
      await this.userService.bootstrap(event.userId, event.email, event.tenantId ?? 'demo');
    } catch (err) {
      this.logger.error(`Profile bootstrap failed for user ${event.userId}`, err);
    }
  }
}
