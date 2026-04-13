'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, X, Map, ArrowRight, Trash2 } from 'lucide-react'

type SavedPath = {
  id: string
  title: string
  description: string
  created_at: string
  real_world_titles?: string[]
  estimated_salary?: string
}

export default function SavedPaths({ userId }: { userId: string }) {
  const [paths, setPaths] = useState<SavedPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal State
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newPath, setNewPath] = useState({ 
    title: '', 
    description: '', 
    estimated_salary: '', 
    real_world_titles: [] as string[] 
  })
  const [tempTitle, setTempTitle] = useState('')

  const supabase = createClient()

  // Fetch Paths on Mount
  useEffect(() => {
    const fetchPaths = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('saved_paths')
        .eq('id', userId)
        .single()

      if (!error && data?.saved_paths) {
        setPaths(data.saved_paths)
      }
      setIsLoading(false)
    }
    fetchPaths()
  }, [userId, supabase])

  // Handle Manual Creation
  const handleSavePath = async () => {
    if (!newPath.title.trim()) return
    setIsSaving(true)

    const pathToAdd: SavedPath = {
      id: Date.now().toString(),
      title: newPath.title.trim(),
      description: newPath.description.trim(),
      estimated_salary: newPath.estimated_salary.trim() || undefined,
      real_world_titles: newPath.real_world_titles.length > 0 ? newPath.real_world_titles : undefined,
      created_at: new Date().toISOString()
    }

    setPaths(updatedNodes => [...updatedNodes, pathToAdd]) // Optimistic update

    // Fetch the latest paths from the database to prevent race conditions
    const { data } = await supabase
      .from('profiles')
      .select('saved_paths')
      .eq('id', userId)
      .single()

    const currentPaths = data?.saved_paths || []
    const updatedPaths = [...currentPaths, pathToAdd]

    await supabase
      .from('profiles')
      .update({ saved_paths: updatedPaths })
      .eq('id', userId)

    setNewPath({ title: '', description: '', estimated_salary: '', real_world_titles: [] })
    setTempTitle('')
    setIsAdding(false)
    setIsSaving(false)
  }

  // Handle Deletion
  const handleDelete = async (idToDelete: string) => {
    const updatedPaths = paths.filter(p => p.id !== idToDelete)
    setPaths(updatedPaths)
    await supabase
      .from('profiles')
      .update({ saved_paths: updatedPaths })
      .eq('id', userId)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Map className="text-indigo-600" size={32} />
            My Paths
          </h1>
          <p className="text-slate-500 mt-2">Saved career trajectories and life blueprints.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-semibold shadow-sm flex items-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={18} /> Add Path
        </button>
      </div>

      {/* Grid Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white h-48 rounded-2xl border border-slate-100 shadow-sm"></div>
          ))}
        </div>
      ) : paths.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Map size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No paths charted yet</h3>
          <p className="text-slate-500 max-w-sm mb-6">
            Ask the AI coach to propose a career path based on your Ikigai board, or map out your own idea manually!
          </p>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
          >
            Create your first path <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* The Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map(path => (
            <div key={path.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{path.title}</h3>
                    {path.estimated_salary && (
                      <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
                        {path.estimated_salary}
                      </span>
                    )}
                  </div>

                  {path.real_world_titles && path.real_world_titles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {path.real_world_titles.map((title, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-100">
                          {title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleDelete(path.id)}
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <p className="text-slate-600 text-sm flex-1 whitespace-pre-wrap leading-relaxed">
                {path.description}
              </p>
              
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
                Mapped on {new Date(path.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Creation Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Map a New Path</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Path Title</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="e.g. Technical Product Manager"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
                  value={newPath.title}
                  onChange={(e) => setNewPath({ ...newPath, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salary Range (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. $120k - $150k"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 text-sm"
                    value={newPath.estimated_salary}
                    onChange={(e) => setNewPath({ ...newPath, estimated_salary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Real-World Titles</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Add title..."
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 text-sm"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (tempTitle.trim()) {
                            setNewPath({ ...newPath, real_world_titles: [...newPath.real_world_titles, tempTitle.trim()] })
                            setTempTitle('')
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (tempTitle.trim()) {
                          setNewPath({ ...newPath, real_world_titles: [...newPath.real_world_titles, tempTitle.trim()] })
                          setTempTitle('')
                        }
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {newPath.real_world_titles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newPath.real_world_titles.map((t, i) => (
                    <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-100">
                      {t}
                      <button onClick={() => setNewPath({ ...newPath, real_world_titles: newPath.real_world_titles.filter((_, idx) => idx !== i) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description & Strategy</label>
                <textarea 
                  rows={4}
                  placeholder="Combine my SwiftUI skills with my interest in fitness to build tools for..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 resize-none text-sm leading-relaxed"
                  value={newPath.description}
                  onChange={(e) => setNewPath({ ...newPath, description: e.target.value })}
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                disabled={isSaving}
                className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePath}
                disabled={isSaving || !newPath.title.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-[120px]"
              >
                {isSaving ? <span className="animate-pulse">Saving...</span> : 'Save Path'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}