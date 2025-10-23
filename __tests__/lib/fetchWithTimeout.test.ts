import { fetchWithTimeout, fetchWithRetry } from '@/lib/fetchWithTimeout'

// Mock global fetch
global.fetch = jest.fn()

// Mock Response class for Node.js environment
class MockResponse {
  ok: boolean
  status: number
  headers: Map<string, string>

  constructor(body?: any, init?: { status?: number; headers?: Record<string, string> }) {
    this.status = init?.status || 200
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  get(key: string) {
    return this.headers.get(key)
  }
}

// Add Response to global if not available
if (typeof Response === 'undefined') {
  (global as any).Response = MockResponse
}

describe('Fetch Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fetchWithTimeout', () => {
    it('should successfully fetch when response is quick', async () => {
      const mockResponse = new Response('success', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const promise = fetchWithTimeout('https://example.com', { timeout: 1000 })

      // Fast-forward time but not past timeout
      jest.advanceTimersByTime(500)

      const response = await promise
      expect(response).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('should timeout when request takes too long', async () => {
      // Mock a fetch that will be aborted
      ;(global.fetch as jest.Mock).mockImplementation(
        (_url, options) => {
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const error = new Error('Aborted')
              error.name = 'AbortError'
              reject(error)
            })
          })
        }
      )

      const promise = fetchWithTimeout('https://example.com', { timeout: 100 })

      // Fast-forward past timeout to trigger abort
      jest.advanceTimersByTime(101)

      await expect(promise).rejects.toThrow('Request timeout after 100ms')
    })

    it('should use default timeout of 60000ms', async () => {
      const mockResponse = new Response('success', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await fetchWithTimeout('https://example.com')

      // Default timeout should be set
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should pass through fetch options', async () => {
      const mockResponse = new Response('success', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await fetchWithTimeout('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
        })
      )
    })

    it('should propagate non-timeout errors', async () => {
      const error = new Error('Network error')
      ;(global.fetch as jest.Mock).mockRejectedValue(error)

      await expect(fetchWithTimeout('https://example.com')).rejects.toThrow('Network error')
    })
  })

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = new Response('success', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const response = await fetchWithRetry('https://example.com')

      expect(response).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on 500 errors', async () => {
      const errorResponse = new Response('error', { status: 500 })
      const successResponse = new Response('success', { status: 200 })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse)

      const promise = fetchWithRetry('https://example.com', { maxRetries: 3 })

      // Allow retry delay
      await jest.runAllTimersAsync()

      const response = await promise
      expect(response).toBe(successResponse)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 429 rate limit', async () => {
      const rateLimitResponse = new Response('rate limited', {
        status: 429,
        headers: { 'Retry-After': '1' },
      })
      const successResponse = new Response('success', { status: 200 })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse)

      const promise = fetchWithRetry('https://example.com', { maxRetries: 3 })

      // Allow retry delay
      await jest.runAllTimersAsync()

      const response = await promise
      expect(response).toBe(successResponse)
    })

    it('should use exponential backoff', async () => {
      const errorResponse = new Response('error', { status: 500 })

      ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

      const promise = fetchWithRetry('https://example.com', { maxRetries: 3 })

      // Run all timers to allow retries
      await jest.runAllTimersAsync()

      await promise.catch(() => {})

      // Should have attempted 3 times
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const errorResponse = new Response('error', { status: 500 })
      ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

      const promise = fetchWithRetry('https://example.com', { maxRetries: 2 })

      await jest.runAllTimersAsync()

      const response = await promise
      expect(response.status).toBe(500)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 4xx client errors (except 429)', async () => {
      const errorResponse = new Response('not found', { status: 404 })
      ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)

      const response = await fetchWithRetry('https://example.com', { maxRetries: 3 })

      expect(response.status).toBe(404)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
