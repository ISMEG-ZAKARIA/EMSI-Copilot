export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Always get fresh token from localStorage inside the function
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Set default Content-Type if not provided and not using FormData or URLSearchParams
  if (!headers['Content-Type'] && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
  }

  const fullUrl = `${API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  console.log(`[apiFetch] Calling: ${fullUrl}`);

  try {
    console.log(`[apiFetch] Method: ${options.method || 'GET'}`);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    console.log(`[apiFetch] Response Status: ${response.status}`);

    if (response.status === 401) {
      console.error('[apiFetch] 401 Unauthorized');
      // Only clear session and redirect if we're not already on the login page
      // to avoid interrupting the login flow or masking credential errors.
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        localStorage.removeItem('token');
        window.location.href = '/?error=session_expired';
      }
    }

    if (!response.ok) {
      let errorMessage = 'Une erreur est survenue';
      let errorData: { detail?: string; message?: string } = {};
      try {
        errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (err: unknown) {
        console.warn('[apiFetch] Could not parse error JSON', err);
      }
      
      console.error(`[apiFetch] Response Error (${response.status}): ${errorMessage}`);
      
      // Senior approach: return structured error instead of throwing if it's a known non-critical error
      // or if we want the UI to handle it gracefully without a catch block.
      // But for consistency with existing code, we throw.
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[apiFetch] Response Success:`, data);
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[apiFetch] Fetch Failed:`, message);
    throw err;
  }
};

/**
 * Senior function to fetch files with proper authentication
 * and handle them as blobs for browser viewing/downloading.
 */
export const apiFetchBlob = async (endpoint: string, options: RequestInit = {}): Promise<{ blob: Blob; contentType: string; filename: string }> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const fullUrl = `${API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  console.log(`[apiFetchBlob] Calling: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        localStorage.removeItem('token');
        window.location.href = '/?error=session_expired';
      }
      throw new Error('Non authentifié');
    }

    if (!response.ok) {
      let errorMessage = `Erreur lors de la récupération du fichier (${response.status})`;
      try {
        const errorData: { detail?: string; message?: string } = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (err: unknown) {
        console.warn('[apiFetchBlob] Could not parse error JSON', err);
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'document';

    return { blob, contentType, filename };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[apiFetchBlob] Failed:`, message);
    throw err;
  }
};
