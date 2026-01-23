import { useState, useEffect } from 'react';
import { getAuthToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function NewsSourcesPanel() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    source_type: 'rss',
    url: '',
    scrape_interval_minutes: 60,
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/news/sources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch sources');

      const data = await response.json();
      setSources(data.sources || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/news/sources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSource),
      });

      if (!response.ok) throw new Error('Failed to add source');

      await fetchSources();
      setShowAddForm(false);
      setNewSource({
        name: '',
        source_type: 'rss',
        url: '',
        scrape_interval_minutes: 60,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/news/sources/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete source');

      await fetchSources();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTriggerScrape = async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/news/sources/${id}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to trigger scrape');

      alert('Scrape job enqueued successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (source) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/news/sources/${source.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !source.is_active,
        }),
      });

      if (!response.ok) throw new Error('Failed to update source');

      await fetchSources();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-black/40 border border-cyan-500/30 rounded">
        <h3 className="text-cyan-400 text-sm font-mono mb-2">NEWS SOURCES</h3>
        <p className="text-gray-400 text-xs">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black/40 border border-cyan-500/30 rounded">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-cyan-400 text-sm font-mono">NEWS SOURCES</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-500/30 transition-colors"
        >
          {showAddForm ? 'CANCEL' : '+ ADD SOURCE'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSource} className="mb-4 p-4 bg-black/60 border border-cyan-500/30 rounded space-y-3">
          <div>
            <label className="block text-cyan-400 text-xs font-mono mb-1">Name</label>
            <input
              type="text"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              className="w-full px-2 py-1 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-400 text-xs font-mono mb-1">Source Type</label>
            <select
              value={newSource.source_type}
              onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}
              className="w-full px-2 py-1 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
            >
              <option value="rss">RSS Feed</option>
              <option value="api">News API</option>
              <option value="web">Web Scraping</option>
            </select>
          </div>

          <div>
            <label className="block text-cyan-400 text-xs font-mono mb-1">URL</label>
            <input
              type="url"
              value={newSource.url}
              onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
              className="w-full px-2 py-1 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
              placeholder="https://example.com/rss"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-400 text-xs font-mono mb-1">Scrape Interval (minutes)</label>
            <input
              type="number"
              value={newSource.scrape_interval_minutes}
              onChange={(e) => setNewSource({ ...newSource, scrape_interval_minutes: parseInt(e.target.value) })}
              className="w-full px-2 py-1 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
              min="1"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-500/30 transition-colors"
          >
            ADD SOURCE
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sources.length === 0 ? (
          <p className="text-gray-400 text-xs">No news sources configured. Click "+ ADD SOURCE" to get started.</p>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="p-3 bg-black/60 border border-cyan-500/30 rounded">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="text-cyan-400 text-xs font-mono font-bold">{source.name}</h4>
                  <p className="text-gray-400 text-xs mt-1 break-all">{source.url}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-mono rounded ${
                  source.is_active 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                }`}>
                  {source.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="flex gap-2 text-xs">
                <span className="text-gray-400">Type: <span className="text-cyan-400">{source.source_type.toUpperCase()}</span></span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">Interval: <span className="text-cyan-400">{source.scrape_interval_minutes}m</span></span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleToggleActive(source)}
                  className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-500/30 transition-colors"
                >
                  {source.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                </button>
                <button
                  onClick={() => handleTriggerScrape(source.id)}
                  className="px-2 py-1 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-mono rounded hover:bg-green-500/30 transition-colors"
                >
                  SCRAPE NOW
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-mono rounded hover:bg-red-500/30 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
