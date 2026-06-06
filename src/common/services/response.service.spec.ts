import { Test, TestingModule } from '@nestjs/testing';
import { ResponseService } from './response.service';

describe('ResponseService', () => {
  let service: ResponseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseService],
    }).compile();

    service = module.get<ResponseService>(ResponseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('success', () => {
    it('should return a success response with data', () => {
      const result = service.success('Operation successful', { id: 1 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation successful');
      expect(result.data).toEqual({ id: 1 });
      expect(result.status).toBe(200);
      expect(result.timestamp).toBeDefined();
    });

    it('should return a success response with custom status', () => {
      const result = service.success('Created', { id: 1 }, 201);

      expect(result.status).toBe(201);
    });

    it('should return a success response without data', () => {
      const result = service.success('No content');

      expect(result.data).toBeUndefined();
    });
  });

  describe('error', () => {
    it('should return an error response', () => {
      const result = service.error('Something went wrong', 400);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Something went wrong');
      expect(result.data).toBeNull();
      expect(result.status).toBe(400);
    });

    it('should include error details when provided', () => {
      const result = service.error('Validation failed', 422, 'Invalid email');

      expect(result.error).toBe('Invalid email');
    });
  });

  describe('created', () => {
    it('should return a 201 response', () => {
      const result = service.created('Resource created', { id: 1 });

      expect(result.status).toBe(201);
      expect(result.success).toBe(true);
    });
  });

  describe('deleted', () => {
    it('should return a success response with null data', () => {
      const result = service.deleted();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.status).toBe(200);
    });
  });

  describe('notFound', () => {
    it('should return a 404 error response', () => {
      const result = service.notFound();

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('unauthorized', () => {
    it('should return a 401 error response', () => {
      const result = service.unauthorized();

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('forbidden', () => {
    it('should return a 403 error response', () => {
      const result = service.forbidden();

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
    });
  });
});
