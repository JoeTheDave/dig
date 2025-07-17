import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  posts: Array<{
    id: string;
    title: string;
  }>;
}

interface UserListProps {
  refreshTrigger: number;
  onUserDeleted: () => void;
}

export default function UserList({ refreshTrigger, onUserDeleted }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== id));
        onUserDeleted();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading users...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Users ({users.length})</h3>
      {users.length === 0 ? (
        <p className="text-gray-600">No users yet. Add the first one!</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
              <div>
                <h4 className="font-medium text-gray-900">{user.name}</h4>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {user.posts.length} posts • Created {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteUser(user.id)}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}