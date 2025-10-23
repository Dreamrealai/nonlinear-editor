/**
 * Mock Supabase client for testing
 */

export const mockSupabaseClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
    updateUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  }),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      }),
      remove: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  },
}

export const createClient = jest.fn().mockReturnValue(mockSupabaseClient)

export const createBrowserClient = jest.fn().mockReturnValue(mockSupabaseClient)

export const createServerClient = jest.fn().mockReturnValue(mockSupabaseClient)
