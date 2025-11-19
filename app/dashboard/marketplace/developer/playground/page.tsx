// app/dashboard/marketplace/developer/playground/page.tsx
// API Playground - Interactive API Testing

'use client';

import { useState } from 'react';

export default function APIPlaygroundPage() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/v1/marketplace/apps');
  const [headers, setHeaders] = useState('{\n  "Authorization": "Bearer key_your_api_key",\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{}');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const commonEndpoints = [
    { value: '/api/v1/marketplace/apps', label: 'List Apps' },
    { value: '/api/v1/marketplace/keys', label: 'List API Keys' },
    { value: '/api/v1/marketplace/analytics/usage', label: 'Get Usage Analytics' },
    { value: '/api/v1/marketplace/webhooks', label: 'List Webhooks' },
  ];

  const handleSendRequest = async () => {
    setLoading(true);
    setResponse('');
    setStatusCode(null);
    setResponseTime(null);

    const startTime = Date.now();

    try {
      const parsedHeaders = JSON.parse(headers);
      const options: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && method !== 'HEAD') {
        options.body = body;
      }

      const res = await fetch(endpoint, options);
      const endTime = Date.now();

      setResponseTime(endTime - startTime);
      setStatusCode(res.status);

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
      setStatusCode(500);
    } finally {
      setLoading(false);
    }
  };

  const generateCodeSnippet = (lang: string) => {
    let code = '';

    if (lang === 'curl') {
      const parsedHeaders = JSON.parse(headers);
      const headerFlags = Object.entries(parsedHeaders)
        .map(([key, value]) => `-H "${key}: ${value}"`)
        .join(' \\\n  ');

      code = `curl -X ${method} "${endpoint}" \\\n  ${headerFlags}`;

      if (method !== 'GET' && body && body !== '{}') {
        code += ` \\\n  -d '${body}'`;
      }
    } else if (lang === 'javascript') {
      code = `const response = await fetch('${endpoint}', {
  method: '${method}',
  headers: ${headers},`;

      if (method !== 'GET' && body && body !== '{}') {
        code += `\n  body: JSON.stringify(${body}),`;
      }

      code += `\n});\n\nconst data = await response.json();`;
    } else if (lang === 'python') {
      code = `import requests\n\nresponse = requests.${method.toLowerCase()}(
    '${endpoint}',
    headers=${headers.replace(/"/g, "'")}`;

      if (method !== 'GET' && body && body !== '{}') {
        code += `,\n    json=${body.replace(/"/g, "'")}`;
      }

      code += `\n)\n\ndata = response.json()`;
    }

    return code;
  };

  const [codeTab, setCodeTab] = useState('curl');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">API Playground</h1>
          <p className="mt-2 text-lg text-gray-600">
            Test API endpoints interactively and generate code snippets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Request</h2>

              {/* Method & Endpoint */}
              <div className="flex gap-3 mb-4">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="/api/v1/..."
                />
              </div>

              {/* Common Endpoints */}
              <select
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="" disabled>
                  Or select a common endpoint...
                </option>
                {commonEndpoints.map((ep) => (
                  <option key={ep.value} value={ep.value}>
                    {ep.label}
                  </option>
                ))}
              </select>

              {/* Headers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headers
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              {/* Body (for POST/PUT/PATCH) */}
              {method !== 'GET' && method !== 'HEAD' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>

            {/* Code Generation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Code Generation
              </h2>

              <div className="flex gap-2 mb-4">
                {['curl', 'javascript', 'python'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeTab(lang)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      codeTab === lang
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                  </button>
                ))}
              </div>

              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateCodeSnippet(codeTab)}</code>
              </pre>
            </div>
          </div>

          {/* Response Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Response</h2>

              {/* Status */}
              {statusCode !== null && (
                <div className="flex gap-4 mb-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      statusCode >= 200 && statusCode < 300
                        ? 'bg-green-100 text-green-800'
                        : statusCode >= 400
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {statusCode}
                  </div>

                  {responseTime !== null && (
                    <div className="text-sm text-gray-600">
                      Response time: {responseTime}ms
                    </div>
                  )}
                </div>
              )}

              {/* Response Body */}
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                  <code>{response || 'No response yet. Send a request to see the response.'}</code>
                </pre>

                {response && (
                  <button
                    onClick={() => navigator.clipboard.writeText(response)}
                    className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>

            {/* Saved Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Saved Collections
              </h2>
              <p className="text-gray-600 text-sm">
                Save your favorite requests for quick access (coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
