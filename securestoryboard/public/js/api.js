// API helper functions

// API call wrapper with improved error handling
async function apiCall(endpoint, method = 'GET', body = null, retries = 2, timeoutMs = 180000) {
  console.log(`[API Call] Attempting to call endpoint: ${endpoint}, Method: ${method}, Timeout: ${timeoutMs}ms`);
  if (body) {
    console.log(`[API Call] Request body for ${endpoint}:`, JSON.stringify(body, null, 2));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    console.log(`[API Call] Attempt #${attempt + 1} for ${endpoint}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal // Add signal for abort support
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`/.netlify/functions/${endpoint}`, options);
      clearTimeout(timeoutId); // Clear timeout if request completes
      
      console.log(`[API Call] Response status for ${endpoint} (Attempt #${attempt + 1}): ${response.status}`);
      
      // Try to parse JSON, but handle cases where response might not be JSON
      const responseText = await response.text();
      let data;
      try {
          data = JSON.parse(responseText);
      } catch (e) {
          // If JSON parsing fails, create a structured error response
          const isHtml = responseText.toLowerCase().includes('<html') || responseText.toLowerCase().includes('<!doctype');
          
          if (!response.ok) {
              // If we got HTML (like an error page), provide a cleaner error
              if (isHtml) {
                  throw new Error(`Server error (${response.status}): The server returned an error page instead of JSON. This often happens during cold starts or timeouts.`);
              }
              throw new Error(responseText || `API call failed with status ${response.status}`);
          }
          // If it was OK but not JSON, this is unexpected
          console.warn("API response was not JSON:", responseText);
          data = {responseText}; 
      }
      
      if (!response.ok) {
        // Check if it's a rate limit error
        if (response.status === 429 && attempt < retries) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
          const waitTime = Math.max(retryAfter, Math.pow(2, attempt + 1)) * 1000; // Exponential backoff
          console.log(`[API Call] Rate limited on ${endpoint}. Retrying after ${waitTime}ms... (Attempt #${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry
        }
        
        // Check if it's a timeout or network error that might benefit from retry
        if ((response.status === 504 || response.status === 502 || response.status === 499) && attempt < retries) {
          const waitTime = Math.pow(2, attempt + 1) * 1000; // Exponential backoff: 2s, 4s
          console.log(`[API Call] Network/timeout error (${response.status}) on ${endpoint}. Retrying after ${waitTime}ms... (Attempt #${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry
        }
        
        // Format error message based on the response
        let errorMessage = data.message || data.error || response.statusText || 'API call failed';
        
        // Add context for specific error types
        if (response.status === 499) {
          errorMessage = 'Request was cancelled or timed out. The service might be starting up. Please try again.';
        } else if (data.type === 'timeout_error') {
          errorMessage = 'The request took too long. The server might be starting up. Please try again.';
        } else if (data.type === 'network_error') {
          errorMessage = 'Network connection failed. Please check your internet and try again.';
        } else if (data.type === 'configuration_error') {
          errorMessage = 'The service is not properly configured. Please contact support.';
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.type = data.type;
        error.details = data;
        throw error;
      }
      
      return data;

    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout on error
        console.error(`[API Call] Error during attempt #${attempt + 1} for ${endpoint}:`, error);
        
        // Handle timeout/abort errors specifically
        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000} seconds. The operation may still be processing on the server.`);
          timeoutError.type = 'timeout_error';
          timeoutError.status = 408; // Request Timeout
          
          if (attempt === retries) {
            console.error(`[API Call] Request timed out after ${retries + 1} attempts`);
            throw timeoutError;
          } else {
            console.log(`[API Call] Request timed out, retrying... (Attempt #${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt + 1) * 1000));
            continue;
          }
        }
        
        // If it's a network error and we have retries left, try again
        if (error.name === 'TypeError' && error.message.includes('fetch') && attempt < retries) {
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          console.log(`[API Call] Network error on ${endpoint}. Retrying after ${waitTime}ms... (Attempt #${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // On final attempt, log and rethrow
        if (attempt === retries) {
          console.error(`[API Call] API call to ${endpoint} failed after ${retries + 1} attempts. Status: ${error.status}, Type: ${error.type}, Details:`, error.details, 'Full error object:', error);
          throw error;
        }
    }
  }
}

/* Get tool instructions (will be fetched from Netlify function) */
let toolInstructionsText = 'Loading tool instructions...'; // Placeholder
async function fetchToolInstructions() {
  try {
    const data = await apiCall('get-tool-instructions', 'GET', null, 0); // No retries for this
    if (data && data.instructions) {
      toolInstructionsText = data.instructions;
    } else {
      toolInstructionsText = 'Error: Could not load tool instructions. Defaulting to basic mode.';
      console.error("Failed to fetch tool instructions or data was invalid:", data);
    }
  } catch (error) {
    toolInstructionsText = 'Tool instructions unavailable. The tool will work with reduced functionality.';
    console.error('Error fetching tool instructions:', error);
    // Don't show error to user for this non-critical feature
  }
}

// Fetch tool instructions when the script is loaded
fetchToolInstructions();