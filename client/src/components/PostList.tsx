import { useState, useEffect } from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface PostListProps {
  refreshTrigger: number;
  onPostDeleted: () => void;
}

export default function PostList({ refreshTrigger, onPostDeleted }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const postData = await response.json();
        setPosts(postData);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== id));
        onPostDeleted();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading posts...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Posts ({posts.length})</h3>
      {posts.length === 0 ? (
        <p className="text-gray-600">No posts yet. Create the first one!</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{post.title}</h4>
                  <p className="text-gray-700 mb-3 text-sm">{post.content}</p>
                  <div className="text-xs text-gray-500">
                    By {post.author.name} • {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => deletePost(post.id)}
                  className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}