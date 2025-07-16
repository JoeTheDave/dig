import { useState, useEffect } from 'react'

interface ApiData {
  message: string;
  timestamp: string;
  data: {
    users: number;
    posts: number;
    views: number;
  };
}

function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dig App</h1>
          <p className="text-lg text-gray-600">Full-stack TypeScript Application</p>
        </header>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Backend Message</h2>
            <p className="text-gray-700 mb-2">{data?.message}</p>
            <p className="text-sm text-gray-500">
              Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{data?.data.users}</div>
                <div className="text-gray-600">Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{data?.data.posts}</div>
                <div className="text-gray-600">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{data?.data.views}</div>
                <div className="text-gray-600">Views</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App