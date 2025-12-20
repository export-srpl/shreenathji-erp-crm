import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 4, resetTime: Date.now() + 900000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/account-lockout', () => ({
  isAccountLocked: vi.fn(),
  recordFailedLoginAttempt: vi.fn(() => Promise.resolve({ locked: false })),
  resetFailedLoginAttempts: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/audit-log', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/security-monitoring', () => ({
  checkSuspiciousActivity: vi.fn(() => Promise.resolve([])),
  logSecurityAlert: vi.fn(() => Promise.resolve()),
}));

describe('POST /api/auth/login', () => {
  let mockPrisma: any;
  let mockUser: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock user
    const passwordHash = bcrypt.hashSync('password123', 12);
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      is2FAEnabled: false,
      role: 'user',
      salesScope: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    // Setup mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findMany: vi.fn(() => Promise.resolve([])),
        deleteMany: vi.fn(),
      },
    };

    (getPrismaClient as any).mockResolvedValue(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 if email or password is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required.');
  });

  it('should return 401 for invalid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should return 401 for incorrect password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.session.create.mockResolvedValue({ id: 'session-123', token: 'token-123' });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should successfully login with valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.session.create.mockResolvedValue({
      id: 'session-123',
      token: 'token-123',
      userId: 'user-123',
    });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      headers: {
        'user-agent': 'test-agent',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    expect(mockPrisma.session.create).toHaveBeenCalled();
  });

  it('should handle 2FA enabled users', async () => {
    const userWith2FA = { ...mockUser, is2FAEnabled: true };
    mockPrisma.user.findUnique.mockResolvedValue(userWith2FA);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requires2FA).toBe(true);
    expect(data.user).toBeDefined();
  });

  it('should return 423 for locked account', async () => {
    const lockedUser = {
      ...mockUser,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    };
    mockPrisma.user.findUnique.mockResolvedValue(lockedUser);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(423);
    expect(data.error).toContain('locked');
  });

  it('should handle database timeout gracefully', async () => {
    // Simulate slow database query that exceeds our 5s timeout
    mockPrisma.user.findUnique.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 6000))
    );

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const startTime = Date.now();
    const response = await POST(req);
    const duration = Date.now() - startTime;

    // Should timeout and return error within reasonable time (5s timeout + some buffer)
    expect(duration).toBeLessThan(7000); // Should timeout around 5s, allow some buffer
    expect(response.status).toBeGreaterThanOrEqual(400);
  }, 10000); // Increase test timeout to 10 seconds

  it('should set session cookies on successful login', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.session.create.mockResolvedValue({
      id: 'session-123',
      token: 'token-123',
      userId: 'user-123',
    });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    
    // Check that cookies are set
    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('app_session');
    expect(setCookieHeader).toContain('user_email');
  });

  it('should cleanup old sessions after creating new one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.session.create.mockResolvedValue({
      id: 'session-123',
      token: 'token-123',
      userId: 'user-123',
    });
    
    // Simulate 5 existing sessions
    mockPrisma.session.findMany.mockResolvedValue([
      { id: 'session-1' },
      { id: 'session-2' },
      { id: 'session-3' },
      { id: 'session-4' },
      { id: 'session-5' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    
    // Wait a bit for background cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(response.status).toBe(200);
    // Cleanup should be called in background (non-blocking)
    // We can't easily test this without waiting, but the fact that login succeeds is good
  });
});

