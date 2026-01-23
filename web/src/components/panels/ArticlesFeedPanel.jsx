import { useState, useEffect } from 'react';
import { getAuthToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ArticlesFeedPanel() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    try {
      const token = getAuthToken();
      let url = `${API_BASE_URL}/api/v1/news/articles?limit=50`;
      
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch articles');

      const data = await response.json();
      setArticles(data.articles || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchArticles();
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/news/articles/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-4 bg-black/40 border border-cyan-500/30 rounded">
        <h3 className="text-cyan-400 text-sm font-mono mb-2">NEWS FEED</h3>
        <p className="text-gray-400 text-xs">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black/40 border border-cyan-500/30 rounded">
      <h3 className="text-cyan-400 text-sm font-mono mb-4">NEWS FEED</h3>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="flex-1 px-3 py-2 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-500/30 transition-colors"
          >
            SEARCH
          </button>
        </div>
      </form>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-cyan-400 text-xs font-mono mb-2">Filter by Category:</label>
        <div className="flex gap-2 flex-wrap">
          {['', 'technology', 'business', 'politics', 'sports', 'science'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                selectedCategory === category
                  ? 'bg-cyan-500/30 border-cyan-500 text-cyan-400'
                  : 'bg-black/40 border-cyan-500/30 text-gray-400 hover:border-cyan-500/50'
              }`}
            >
              {category || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {articles.length === 0 ? (
          <p className="text-gray-400 text-xs">
            No articles found. Add news sources to start collecting articles.
          </p>
        ) : (
          articles.map((article, index) => (
            <div
              key={article.id || index}
              className="p-3 bg-black/60 border border-cyan-500/30 rounded hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-cyan-400 text-sm font-mono font-bold flex-1 pr-2">
                  {article.title}
                </h4>
                {article.source && (
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-mono rounded border border-cyan-500/30 whitespace-nowrap">
                    {article.source}
                  </span>
                )}
              </div>

              {article.summary && (
                <p className="text-gray-300 text-xs mb-2 line-clamp-3">{article.summary}</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs mb-2">
                {article.author && (
                  <span className="text-gray-400">
                    By <span className="text-cyan-400">{article.author}</span>
                  </span>
                )}
                {article.published_at && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{formatDate(article.published_at)}</span>
                  </>
                )}
                {article.word_count && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{article.word_count} words</span>
                  </>
                )}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {article.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-mono rounded border border-gray-500/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-500/30 transition-colors"
                >
                  READ MORE →
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {articles.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-xs">
            Showing {articles.length} article{articles.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
