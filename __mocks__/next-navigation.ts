/**
 * Mock Next.js navigation hooks for testing
 */

export const useRouter = jest.fn().mockReturnValue({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
})

export const usePathname = jest.fn().mockReturnValue('/')

export const useSearchParams = jest.fn().mockReturnValue({
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
  toString: jest.fn(),
})

export const useParams = jest.fn().mockReturnValue({})

export const redirect = jest.fn()

export const notFound = jest.fn()
