import { useState, useEffect } from 'react'
import UserForm from './components/UserForm'
import PostForm from './components/PostForm'
import UserList from './components/UserList'
import PostList from './components/PostList'
import AnalyticsForm from './components/AnalyticsForm'

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

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

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
          <p className="text-lg text-gray-600">Full-stack TypeScript Application with CRUD</p>
        </header>

        {/* Statistics Dashboard */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            <p className="text-sm text-gray-500 text-center">
              Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Forms Column */}
            <div className="space-y-6">
              <UserForm onUserAdded={handleDataChange} />
              <PostForm onPostAdded={handleDataChange} />
              <AnalyticsForm onAnalyticsAdded={handleDataChange} />
            </div>

            {/* Lists Column */}
            <div className="space-y-6">
              <UserList 
                refreshTrigger={refreshTrigger} 
                onUserDeleted={handleDataChange} 
              />
              <PostList 
                refreshTrigger={refreshTrigger} 
                onPostDeleted={handleDataChange} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App