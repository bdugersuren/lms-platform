import { Test, TestingModule } from '@nestjs/testing';
import { EventListenerService } from './event-listener.service';
import { UserService } from '../user/user.service';

const mockUserService = {
  bootstrap: jest.fn(),
};

describe('EventListenerService', () => {
  let service: EventListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventListenerService,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<EventListenerService>(EventListenerService);
    jest.clearAllMocks();
  });

  describe('onUserRegistered', () => {
    const event = {
      userId:    'user-uuid-1',
      email:     'testuser@example.com',
      role:      'STUDENT',
      timestamp: new Date().toISOString(),
    };

    it('calls userService.bootstrap with userId and email from the event', async () => {
      mockUserService.bootstrap.mockResolvedValue(undefined);

      await service.onUserRegistered(event);

      expect(mockUserService.bootstrap).toHaveBeenCalledWith('user-uuid-1', 'testuser@example.com');
    });

    it('does not throw when bootstrap fails — errors are swallowed to protect the queue', async () => {
      mockUserService.bootstrap.mockRejectedValue(new Error('DB down'));

      await expect(service.onUserRegistered(event)).resolves.not.toThrow();
    });
  });
});
