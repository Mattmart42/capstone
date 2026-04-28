'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, X, Map, ArrowRight, Trash2, Pencil, Check, CircleX } from 'lucide-react'

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

  // Edit State
  const [editingPathId, setEditingPathId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<SavedPath | null>(null)
  const [editTempTitle, setEditTempTitle] = useState('')

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

    setPaths(prev => [...prev, pathToAdd]) // Optimistic update

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

  // Handle Update Path
  const handleUpdatePath = async () => {
    if (!editFormData || !editingPathId) return
    setIsSaving(true)

    const updatedPaths = paths.map(p => 
      p.id === editingPathId ? { ...editFormData, title: editFormData.title.trim() } : p
    )

    setPaths(updatedPaths) // Optimistic update

    const { error } = await supabase
      .from('profiles')
      .update({ saved_paths: updatedPaths })
      .eq('id', userId)

    if (error) {
      console.error("Error updating path:", error)
      alert("Failed to update path.")
    }

    setEditingPathId(null)
    setEditFormData(null)
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
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight flex items-center gap-3 font-serif">
            <Map className="text-primary" size={32} />
            My Paths
          </h1>
          <p className="text-secondary-text mt-2 px-2">Saved career trajectories and life blueprints.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-2xl font-semibold flex items-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={18} /> Path
        </button>
      </div>

      {/* Grid Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface h-48 rounded-2xl border border-border shadow-sm"></div>
          ))}
        </div>
      ) : paths.length === 0 ? (
        /* Empty State */
        <div className="bg-surface border border-400 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mb-4">
            <Map size={32} />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">No paths charted yet</h3>
          <p className="text-secondary-text max-w-sm mb-6">
            Ask the AI coach to propose a career path based on your Ikigai board, or map out your own idea manually!
          </p>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-primary font-semibold hover:text-primary-hover flex items-center gap-1"
          >
            Create your first path <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* The Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map(path => {
            const isEditing = editingPathId === path.id
            
            return (
              <div key={path.id} className={`bg-100 border ${isEditing ? 'border-primary ring-2 ring-primary-light shadow-lg' : 'border-border'} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-light ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                
                {isEditing && editFormData ? (
                  /* Edit Form */
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Editing Path</span>
                      <button onClick={() => setEditingPathId(null)} className="text-secondary-text hover:text-text">
                        <CircleX size={18} />
                      </button>
                    </div>

                    <div>
                      <input 
                        className="w-full px-3 py-2 text-sm text-secondary-text font-bold border border-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        placeholder="Path Title"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <input 
                        className="w-full px-3 py-2 text-[11px] text-secondary-text border border-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        value={editFormData.estimated_salary || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, estimated_salary: e.target.value })}
                        placeholder="Salary (e.g. $100k)"
                      />
                      <div className="flex gap-1">
                        <input 
                          className="flex-1 px-3 py-2 text-[11px] text-secondary-text border border-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                          value={editTempTitle}
                          onChange={(e) => setEditTempTitle(e.target.value)}
                          placeholder="Add Title..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (editTempTitle.trim()) {
                                setEditFormData({ 
                                  ...editFormData, 
                                  real_world_titles: [...(editFormData.real_world_titles || []), editTempTitle.trim()] 
                                })
                                setEditTempTitle('')
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {editFormData.real_world_titles && editFormData.real_world_titles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {editFormData.real_world_titles.map((t, i) => (
                          <span key={i} className="bg-100 text-text px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                            {t}
                            <button onClick={() => setEditFormData({ ...editFormData, real_world_titles: editFormData.real_world_titles?.filter((_, idx) => idx !== i) })}>
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <textarea 
                      className="w-full flex-1 px-3 py-2 text-xs text-secondary-text border border-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none leading-relaxed"
                      rows={4}
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Path Description"
                    />

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleUpdatePath}
                        disabled={isSaving || !editFormData.title.trim()}
                        className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingPathId(null)
                          setEditFormData(null)
                        }}
                        className="px-3 py-2 text-xs font-bold text-text hover:bg-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Static View */
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold text-text leading-tight font-serif">{path.title}</h3>
                          {path.estimated_salary && (
                            <span className="bg-primary text-success-light rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {path.estimated_salary}
                            </span>
                          )}
                        </div>

                        {path.real_world_titles && path.real_world_titles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {path.real_world_titles.map((title, idx) => (
                              <span key={idx} className="bg-100 text-text px-1.5 py-0.5 rounded text-[10px] font-medium border border-200">
                                {title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingPathId(path.id)
                            setEditFormData({ ...path })
                          }}
                          className="text-text hover:text-primary hover:bg-primary-light p-1.5 rounded-md transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(path.id)}
                          className="text-text hover:text-red-500 hover:bg-red-500/20 p-1.5 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-text text-sm flex-1 whitespace-pre-wrap leading-relaxed">
                      {path.description}
                    </p>
                    
                    <div className="mt-6 pt-4 border-t border-300 text-xs text-secondary-text font-medium">
                      Mapped on {new Date(path.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Manual Creation Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-700/40 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border animate-in zoom-in-95 duration-200">
            
            <div className="bg-100 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-text">Map a New Path</h3>
              <button onClick={() => setIsAdding(false)} className="text-secondary-text hover:text-text p-1.5 rounded-full hover:bg-300 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-2 bg-100">
              <div className="h-px bg-300 w-full" />
            </div>

            <div className="bg-100 p-4 md:p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">Path Title</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="e.g. Technical Product Manager"
                  className="w-full px-4 py-2.5 border border-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text placeholder-secondary-text font-medium"
                  value={newPath.title}
                  onChange={(e) => setNewPath({ ...newPath, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">Salary Range (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. $120k - $150k"
                    className="w-full px-4 py-2.5 border border-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text placeholder-secondary-text font-medium"
                    value={newPath.estimated_salary}
                    onChange={(e) => setNewPath({ ...newPath, estimated_salary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">Real-World Titles</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Add title..."
                      className="flex-1 min-w-0 px-4 py-2.5 border border-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text placeholder-secondary-text font-medium"
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
                      className="p-2.5 bg-200 hover:bg-300 text-text rounded-xl transition-colors shrink-0"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {newPath.real_world_titles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newPath.real_world_titles.map((t, i) => (
                    <span key={i} className="bg-primary-light text-primary px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-primary-light">
                      {t}
                      <button onClick={() => setNewPath({ ...newPath, real_world_titles: newPath.real_world_titles.filter((_, idx) => idx !== i) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">Description & Strategy</label>
                <textarea 
                  rows={4}
                  placeholder="Combine my SwiftUI skills with my interest in fitness to build tools for..."
                  className="w-full px-4 py-3 border border-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text placeholder-secondary-text font-medium"
                  value={newPath.description}
                  onChange={(e) => setNewPath({ ...newPath, description: e.target.value })}
                />
              </div>
            </div>

            <div className="px-2 bg-100">
              <div className="h-px bg-300 w-full" />
            </div>

            <div className="p-5 bg-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                disabled={isSaving}
                className="text-sm font-semibold text-text hover:text-primary px-4 py-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePath}
                disabled={isSaving || !newPath.title.trim()}
                className="bg-primary hover:bg-primary-hover disabled:bg-300 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center min-w-[120px]"
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