import { useState } from 'react';

interface AnalyticsFormProps {
  onAnalyticsAdded: () => void;
}

export default function AnalyticsForm({ onAnalyticsAdded }: AnalyticsFormProps) {
  const [users, setUsers] = useState('');
  const [posts, setPosts] = useState('');
  const [views, setViews] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!users || !posts || !views) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: parseInt(users),
          posts: parseInt(posts),
          views: parseInt(views),
        }),
      });

      if (response.ok) {
        setUsers('');
        setPosts('');
        setViews('');
        onAnalyticsAdded();
      } else {
        console.error('Failed to create analytics entry');
      }
    } catch (error) {
      console.error('Error creating analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Analytics Entry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="users" className="block text-sm font-medium text-gray-700">
            Users Count
          </label>
          <input
            type="number"
            id="users"
            value={users}
            onChange={(e) => setUsers(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            required
            min="0"
          />
        </div>
        <div>
          <label htmlFor="posts" className="block text-sm font-medium text-gray-700">
            Posts Count
          </label>
          <input
            type="number"
            id="posts"
            value={posts}
            onChange={(e) => setPosts(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            required
            min="0"
          />
        </div>
        <div>
          <label htmlFor="views" className="block text-sm font-medium text-gray-700">
            Views Count
          </label>
          <input
            type="number"
            id="views"
            value={views}
            onChange={(e) => setViews(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            required
            min="0"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Analytics Entry'}
        </button>
      </form>
    </div>
  );
}