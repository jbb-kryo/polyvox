import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const CLOB_API_BASE = "https://clob.polymarket.com";

interface ProxyRequest {
  endpoint: string;
  type?: 'gamma' | 'clob';
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    let endpoint: string;
    let apiType: 'gamma' | 'clob' = 'gamma';
    let method = req.method;
    let requestBody: unknown = null;
    let requestHeaders: Record<string, string> = {};

    // Support both query params (GET) and JSON body (POST)
    if (req.method === 'GET') {
      endpoint = url.searchParams.get("endpoint") || '';
      apiType = (url.searchParams.get("type") as 'gamma' | 'clob') || 'gamma';
    } else {
      try {
        const data = await req.json() as ProxyRequest;
        endpoint = data.endpoint || '';
        apiType = data.type || 'gamma';
        method = data.method || req.method;
        requestBody = data.body;
        requestHeaders = data.headers || {};
      } catch {
        endpoint = url.searchParams.get("endpoint") || '';
        apiType = (url.searchParams.get("type") as 'gamma' | 'clob') || 'gamma';
      }
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiBase = apiType === "clob" ? CLOB_API_BASE : GAMMA_API_BASE;
    const targetUrl = `${apiBase}${cleanEndpoint}`;

    console.log(`Proxying ${method} request to: ${targetUrl}`);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...requestHeaders,
      },
    };

    // Add body for POST/PUT/PATCH requests
    if (requestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(targetUrl, fetchOptions);
    
    // Get response content type
    const contentType = response.headers.get('content-type');
    
    // Handle different response types
    let responseData: unknown;
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = { error: 'Failed to parse JSON response' };
      }
    } else {
      responseData = await response.text();
    }

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to proxy request",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});