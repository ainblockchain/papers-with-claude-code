'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Recipe {
  name: string;
  version?: string;
  watch_tags?: string[];
  output_tags?: string[];
  price?: string;
  description?: string;
}

export default function RecipesPage() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [markdown, setMarkdown] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadRecipes() {
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  async function handleRegister() {
    if (!markdown.trim()) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to register recipe' });
      } else {
        setMessage({ type: 'success', text: 'Recipe registered successfully' });
        setMarkdown('');
        await loadRecipes();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete recipe "${name}"?`)) return;

    try {
      const res = await fetch('/api/recipes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete recipe' });
      } else {
        setMessage({ type: 'success', text: 'Recipe deleted' });
        await loadRecipes();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Recipes</h1>
        <p className="text-gray-400">Manage Cogito processing recipes registered on AIN blockchain</p>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Recipe List */}
      <div>
        <h2 className="text-xl font-bold mb-3">Registered Recipes</h2>
        {loading ? (
          <div className="text-gray-500">Loading recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-gray-500 text-center">
            No recipes registered yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recipes.map((recipe) => (
              <div key={recipe.name} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{recipe.name}</div>
                    {recipe.version && (
                      <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                        v{recipe.version}
                      </span>
                    )}
                  </div>
                  {session && (
                    <button
                      onClick={() => handleDelete(recipe.name)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {recipe.description && (
                  <p className="text-xs text-gray-400 mt-2">{recipe.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {recipe.watch_tags?.map((tag) => (
                    <span key={tag} className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      watch: {tag}
                    </span>
                  ))}
                  {recipe.output_tags?.map((tag) => (
                    <span key={tag} className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                      output: {tag}
                    </span>
                  ))}
                </div>
                {recipe.price && (
                  <div className="text-xs text-cogito-purple font-mono mt-2">{recipe.price}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish Form */}
      <div>
        <h2 className="text-xl font-bold mb-3">Publish Recipe</h2>
        {session ? (
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Paste recipe markdown here..."
              rows={12}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cogito-blue resize-y"
            />
            <button
              onClick={handleRegister}
              disabled={submitting || !markdown.trim()}
              className="bg-cogito-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Registering...' : 'Register Recipe'}
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <p className="text-gray-400">Sign in with GitHub to publish recipes</p>
          </div>
        )}
      </div>
    </div>
  );
}
