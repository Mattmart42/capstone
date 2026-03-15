'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, X, Trash2, Plus } from 'lucide-react'

type IkigaiNode = {
  concept: string
  emoji?: string
  ik: boolean // Love
  i: boolean  // Good At
  g: boolean  // World Needs
  ai: boolean // Paid For
}

// Configuration for our Venn Diagram Math
const BOARD_SIZE = 800
const CIRCLE_RADIUS = 220
const CENTERS = {
  ik: { x: 400, y: 250 }, 
  i:  { x: 250, y: 400 }, 
  g:  { x: 550, y: 400 }, 
  ai: { x: 400, y: 550 }, 
}

const ZONE_TITLES: Record<string, string> = {
  ikigai: "Your Ikigai",
  satisfaction: "Satisfaction / Uselessness", comfortable: "Comfortable / Emptiness", excitement: "Excitement / Uncertainty", fullness: "Fullness / Poverty",
  passion: "Passion", mission: "Mission", profession: "Profession", vocation: "Vocation",
  loveOnly: "What you Love", goodOnly: "What you're Good At", needsOnly: "What the World Needs", paidOnly: "What Pays",
  exploring: "Unmapped / Exploring"
}

export default function IkigaiDashboard({ userId }: { userId: string }) {
  const [nodes, setNodes] = useState<IkigaiNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Camera & Navigation State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Trash Can Refs and State
  const trashRef = useRef<HTMLDivElement>(null)
  const [isHoveringTrash, setIsHoveringTrash] = useState(false)

  // Interaction State
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null)
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number, y: number }>>({})
  const [sidebarZone, setSidebarZone] = useState<string | null>(null)

  // Manual Creation State
  const [isAddingNode, setIsAddingNode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newNodeForm, setNewNodeForm] = useState({ concept: '', ik: false, i: false, g: false, ai: false })

  const supabase = createClient()

  // --- 1. THE CAMERA MATH (CENTER & FIT TO SCREEN) ---
  const resetCamera = useCallback(() => {
    if (!containerRef.current) return
    const { clientWidth, clientHeight } = containerRef.current
    const padding = 40 
    const availableW = clientWidth - (padding * 2)
    const availableH = clientHeight - (padding * 2)
    const perfectZoom = Math.min(availableW / BOARD_SIZE, availableH / BOARD_SIZE, 1.2)
    const perfectPanX = (clientWidth - (BOARD_SIZE * perfectZoom)) / 2
    const perfectPanY = (clientHeight - (BOARD_SIZE * perfectZoom)) / 2
    setZoom(perfectZoom)
    setPan({ x: perfectPanX, y: perfectPanY })
  }, [])

  useEffect(() => {
    resetCamera()
    window.addEventListener('resize', resetCamera)
    return () => window.removeEventListener('resize', resetCamera)
  }, [resetCamera])

  // --- 2. DATA FETCHING & REALTIME ---
  const fetchNodes = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('profiles').select('ikigai_nodes').eq('id', userId).single()
    if (data?.ikigai_nodes) setNodes(data.ikigai_nodes)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchNodes()
    const channelName = `profile-updates-${userId}`
    const profileChannel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        const newRecord = payload.new as { ikigai_nodes?: IkigaiNode[] }
        if (newRecord?.ikigai_nodes) setNodes(newRecord.ikigai_nodes)
      }).subscribe()
    return () => { supabase.removeChannel(profileChannel) }
  }, [userId, supabase])

  // --- 3. THE DROP ZONE MATH (RADIAL INTERSECTION & TRASH COLLISION) ---
  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggingNode || !boardRef.current) return

    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect()
      if (
        e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
        e.clientY >= trashRect.top && e.clientY <= trashRect.bottom
      ) {
        const nodeToDelete = draggingNode
        setDraggingNode(null)
        setDragStartPos(null)
        setIsHoveringTrash(false)

        const updatedNodes = nodes.filter(n => n.concept !== nodeToDelete)
        setNodes(updatedNodes) 
        await supabase.from('profiles').update({ ikigai_nodes: updatedNodes, updated_at: new Date().toISOString() }).eq('id', userId)
        return 
      }
    }

    setIsHoveringTrash(false) 
    
    const rect = boardRef.current.getBoundingClientRect()
    const dropX = (e.clientX - rect.left) / zoom
    const dropY = (e.clientY - rect.top) / zoom

    const checkInside = (cx: number, cy: number) => Math.hypot(dropX - cx, dropY - cy) <= CIRCLE_RADIUS

    const newIk = checkInside(CENTERS.ik.x, CENTERS.ik.y)
    const newI = checkInside(CENTERS.i.x, CENTERS.i.y)
    const newG = checkInside(CENTERS.g.x, CENTERS.g.y)
    const newAi = checkInside(CENTERS.ai.x, CENTERS.ai.y)

    if (!newIk && !newI && !newG && !newAi) {
      setLocalPositions(prev => {
        const next = { ...prev }
        if (dragStartPos) {
          next[draggingNode] = dragStartPos 
        } else {
          delete next[draggingNode] 
        }
        return next
      })
      setDraggingNode(null)
      setDragStartPos(null)
      return 
    }

    setLocalPositions(prev => ({ ...prev, [draggingNode]: { x: dropX, y: dropY } }))
    setDraggingNode(null)
    setDragStartPos(null)

    const targetNode = nodes.find(n => n.concept === draggingNode)
    if (!targetNode) return

    if (targetNode.ik === newIk && targetNode.i === newI && targetNode.g === newG && targetNode.ai === newAi) {
      return 
    }

    const updatedNodes = nodes.map(n => 
      n.concept === draggingNode ? { ...n, ik: newIk, i: newI, g: newG, ai: newAi } : n
    )

    setNodes(updatedNodes)
    await supabase.from('profiles').update({ ikigai_nodes: updatedNodes, updated_at: new Date().toISOString() }).eq('id', userId)
  }

  // --- MANUAL CREATION LOGIC ---
  const hasSelectedPillar = newNodeForm.ik || newNodeForm.i || newNodeForm.g || newNodeForm.ai

  const handleCreateNode = async () => {
    if (!newNodeForm.concept.trim() || !hasSelectedPillar) return
    setIsSaving(true)

    const trimmedConcept = newNodeForm.concept.trim()

    if (nodes.some(n => n.concept.toLowerCase() === trimmedConcept.toLowerCase())) {
      alert("A concept with this name already exists on your board!")
      setIsSaving(false)
      return
    }

    const newIkigaiNode: IkigaiNode = {
      concept: trimmedConcept,
      ik: newNodeForm.ik,
      i: newNodeForm.i,
      g: newNodeForm.g,
      ai: newNodeForm.ai
    }

    const updatedNodes = [...nodes, newIkigaiNode]
    setNodes(updatedNodes) 

    await supabase.from('profiles').update({ 
      ikigai_nodes: updatedNodes, 
      updated_at: new Date().toISOString() 
    }).eq('id', userId)

    setNewNodeForm({ concept: '', ik: false, i: false, g: false, ai: false })
    setIsAddingNode(false)
    setIsSaving(false)
  }

  // --- 4. SORTING & OVERFLOW LOGIC ---
  const zones: Record<string, IkigaiNode[]> = {
    ikigai: [], satisfaction: [], comfortable: [], excitement: [], fullness: [],
    passion: [], mission: [], profession: [], vocation: [],
    loveOnly: [], goodOnly: [], needsOnly: [], paidOnly: [], exploring: []               
  }

  nodes.forEach(n => {
    const score = [n.ik, n.i, n.g, n.ai].filter(Boolean).length
    if (score === 4) zones.ikigai.push(n)
    else if (score === 3) {
      if (n.ik && n.i && n.ai) zones.satisfaction.push(n)
      else if (n.i && n.g && n.ai) zones.comfortable.push(n)
      else if (n.ik && n.g && n.ai) zones.excitement.push(n)
      else if (n.ik && n.i && n.g) zones.fullness.push(n)
    } else if (score === 2) {
      if (n.ik && n.i) zones.passion.push(n)
      else if (n.ik && n.g) zones.mission.push(n)
      else if (n.i && n.ai) zones.profession.push(n)
      else if (n.g && n.ai) zones.vocation.push(n)
      else zones.exploring.push(n) 
    } else if (score === 1) {
      if (n.ik) zones.loveOnly.push(n)
      else if (n.i) zones.goodOnly.push(n)
      else if (n.g) zones.needsOnly.push(n)
      else if (n.ai) zones.paidOnly.push(n)
    } else zones.exploring.push(n)
  })

  // --- 5. GEM RENDERER ---
  const getShape = (score: number) => {
    const baseClasses = "w-5 h-5 fill-slate-800 transition-colors drop-shadow-md"
    const strokeProps = { stroke: "white", strokeWidth: "1.5", strokeLinejoin: "round" as const }
    switch (score) {
      case 4: return <svg viewBox="0 0 24 24" className={`${baseClasses} group-hover:fill-fuchsia-500`}><polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7" {...strokeProps} /></svg> 
      case 3: return <svg viewBox="0 0 24 24" className={`${baseClasses} group-hover:fill-indigo-500`}><polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7" {...strokeProps} /></svg> 
      case 2: return <svg viewBox="0 0 24 24" className={`${baseClasses} group-hover:fill-sky-500`}><polygon points="12,2 22,12 12,22 2,12" {...strokeProps} /></svg> 
      case 1: default: return <svg viewBox="0 0 24 24" className={`${baseClasses} group-hover:fill-rose-500`}><polygon points="12,21 21.5,4.5 2.5,4.5" {...strokeProps} /></svg> 
    }
  }

  const renderGems = (nodeList: IkigaiNode[], zoneKey: string, score: number, defaultCenter: {x: number, y: number}) => {
    if (nodeList.length === 0) return null
    const inverseScale = 1 / zoom
    
    const maxVisible = score === 4 ? 3 : score === 3 ? 2 : score === 2 ? 4 : 8
    const droppedNodes = nodeList.filter(n => localPositions[n.concept])
    const unDroppedNodes = nodeList.filter(n => !localPositions[n.concept])
    
    const visibleUnDropped = unDroppedNodes.slice(0, Math.max(0, maxVisible - droppedNodes.length))
    const overflowCount = unDroppedNodes.length - visibleUnDropped.length
    const nodesToRender = [...droppedNodes, ...visibleUnDropped]

    return (
      <>
        {nodesToRender.map((node, i) => {
          const isDragging = draggingNode === node.concept
          const pos = localPositions[node.concept] || {
            x: defaultCenter.x + (Math.cos(i * 2.4) * (15 * i)),
            y: defaultCenter.y + (Math.sin(i * 2.4) * (15 * i))
          }

          return (
            <div 
              key={node.concept} 
              className={`absolute cursor-grab active:cursor-grabbing group ${isDragging ? 'z-[70] pointer-events-none opacity-50' : 'z-30 hover:z-[60] pointer-events-auto'}`}
              style={{ 
                left: pos.x, top: pos.y, 
                transform: `translate(-50%, -50%) scale(${inverseScale})`, 
                touchAction: 'none'
              }}
              onPointerDown={(e) => { 
                e.stopPropagation(); 
                setDraggingNode(node.concept);
                setDragStartPos(localPositions[node.concept] || null); 
              }}
            >
              <div className="relative flex justify-center items-center hover:scale-110 transition-transform duration-200">
                {getShape(score)}
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col items-center">
                  <div className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                    {node.concept}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* The Overflow Plus Badge */}
        {overflowCount > 0 && (
          <div 
            className="absolute z-20 cursor-pointer hover:scale-110 transition-transform"
            style={{ 
              left: defaultCenter.x, top: defaultCenter.y + 25, 
              transform: `translate(-50%, -50%) scale(${inverseScale})` 
            }}
            onClick={(e) => { e.stopPropagation(); setSidebarZone(zoneKey) }}
          >
            <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full border-2 border-slate-300 text-[10px] font-black text-slate-700 shadow-md">
              +{overflowCount}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex h-full w-full bg-slate-900 overflow-hidden relative selection:bg-transparent">
      
      {/* --- THE DIAGRAM VIEWPORT --- */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden bg-[#f4f5f7]"
        onPointerMove={(e) => {
          if (!draggingNode || !boardRef.current) return
          
          const rect = boardRef.current.getBoundingClientRect()
          setLocalPositions(prev => ({
            ...prev,
            [draggingNode]: { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
          }))

          if (trashRef.current) {
            const trashRect = trashRef.current.getBoundingClientRect()
            const isHovering = (
              e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
              e.clientY >= trashRect.top && e.clientY <= trashRect.bottom
            )
            setIsHoveringTrash(isHovering)
          }
        }}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {isLoading && <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">Loading...</div>}

        <div 
          ref={boardRef}
          className="absolute origin-top-left shadow-2xl bg-white rounded-full"
          style={{ 
            width: BOARD_SIZE, height: BOARD_SIZE,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: draggingNode ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {/* Background Quadrant Circles */}
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[#ff6666]/40 mix-blend-multiply pointer-events-none" style={{ left: CENTERS.ik.x - 220, top: CENTERS.ik.y - 240 }} />
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[#66ff78]/40 mix-blend-multiply pointer-events-none" style={{ left: CENTERS.i.x - 240, top: CENTERS.i.y - 220 }} />
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[#ffd166]/40 mix-blend-multiply pointer-events-none" style={{ left: CENTERS.g.x - 220, top: CENTERS.g.y - 220 }} />
          <div className="absolute w-[460px] h-[460px] rounded-full bg-[#66dbff]/40 mix-blend-multiply pointer-events-none" style={{ left: CENTERS.ai.x - 220, top: CENTERS.ai.y - 220 }} />

          {/* Labels */}
          <span className="absolute font-black tracking-widest text-[#ff6666]" style={{ left: CENTERS.ik.x, top: -30, transform: `translateX(-50%) scale(${1/zoom})` }}>LOVE</span>
          <span className="absolute font-black tracking-widest text-[#66ff78] -rotate-90 origin-center" style={{ left: -50, top: CENTERS.i.y, transform: `translateY(-50%) scale(${1/zoom})` }}>GOOD AT</span>
          <span className="absolute font-black tracking-widest text-[#ffd166] rotate-90 origin-center" style={{ right: -70, top: CENTERS.g.y, transform: `translateY(-50%) scale(${1/zoom})` }}>WORLD NEEDS</span>
          <span className="absolute font-black tracking-widest text-[#66dbff]" style={{ left: CENTERS.ai.x, bottom: -30, transform: `translateX(-50%) scale(${1/zoom})` }}>PAID FOR</span>

          {/* Render All Zones */}
          {renderGems(zones.ikigai, "ikigai", 4, {x: 400, y: 400})}
          
          {renderGems(zones.fullness, "fullness", 3, {x: 400, y: 310})}
          {renderGems(zones.comfortable, "comfortable", 3, {x: 400, y: 490})}
          {renderGems(zones.satisfaction, "satisfaction", 3, {x: 310, y: 400})}
          {renderGems(zones.excitement, "excitement", 3, {x: 490, y: 400})}

          {renderGems(zones.passion, "passion", 2, {x: 310, y: 310})}
          {renderGems(zones.mission, "mission", 2, {x: 490, y: 310})}
          {renderGems(zones.profession, "profession", 2, {x: 310, y: 490})}
          {renderGems(zones.vocation, "vocation", 2, {x: 490, y: 490})}

          {renderGems(zones.loveOnly, "loveOnly", 1, {x: 400, y: 150})}
          {renderGems(zones.paidOnly, "paidOnly", 1, {x: 400, y: 650})}
          {renderGems(zones.goodOnly, "goodOnly", 1, {x: 150, y: 400})}
          {renderGems(zones.needsOnly, "needsOnly", 1, {x: 650, y: 400})}
        </div>

        {/* --- UI CONTROLS (D-PAD, ZOOM, ADD & TRASH) --- */}
        <div className="absolute bottom-6 left-6 flex items-end gap-4 z-40">
          
          <div className="grid grid-cols-3 grid-rows-3 gap-1 bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200">
            <div />
            <button onClick={() => setPan(p => ({ ...p, y: p.y + 100 }))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ChevronUp size={18}/></button>
            <div />
            <button onClick={() => setPan(p => ({ ...p, x: p.x + 100 }))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ChevronLeft size={18}/></button>
            
            <button onClick={resetCamera} className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-600" title="Center & Fit Board"><Maximize size={18}/></button>
            
            <button onClick={() => setPan(p => ({ ...p, x: p.x - 100 }))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ChevronRight size={18}/></button>
            <div />
            <button onClick={() => setPan(p => ({ ...p, y: p.y - 100 }))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ChevronDown size={18}/></button>
            <div />
          </div>

          <div className="flex flex-col gap-2 bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200">
            <button onClick={() => setIsAddingNode(true)} className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded text-white shadow-sm transition-colors" title="Create a new Gem manually"><Plus size={20}/></button>
            <div className="h-px bg-slate-200 w-full" />
            <button onClick={() => setZoom(z => Math.min(z + 0.3, 4))} className="p-3 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ZoomIn size={20}/></button>
            <button onClick={() => setZoom(z => Math.max(z - 0.3, 0.2))} className="p-3 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><ZoomOut size={20}/></button>
          </div>

          {/* The Trash Can Drop Zone */}
          <div
            ref={trashRef}
            className={`flex flex-col items-center justify-center w-24 h-24 rounded-xl shadow-lg border-2 transition-all duration-300 ${
              !draggingNode 
                ? 'opacity-0 scale-90 translate-y-10 pointer-events-none absolute' 
                : isHoveringTrash
                  ? 'opacity-100 scale-110 translate-y-0 bg-red-100 border-red-500 text-red-600' 
                  : 'opacity-100 scale-100 translate-y-0 bg-white/90 backdrop-blur border-red-200 text-red-400' 
            }`}
          >
            <Trash2 size={32} className={isHoveringTrash ? 'animate-bounce' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider mt-2">Delete</span>
          </div>

        </div>
      </div>

      {/* --- SIDEBAR FOR OVERFLOW / UNMAPPED --- */}
      {(sidebarZone || zones.exploring.length > 0) && (
        <div className="w-64 bg-white border-l border-slate-200 shadow-[-10px_0_20px_rgba(0,0,0,0.05)] z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              {sidebarZone ? ZONE_TITLES[sidebarZone] : ZONE_TITLES.exploring}
            </h3>
            {sidebarZone && (
              <button onClick={() => setSidebarZone(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(sidebarZone ? zones[sidebarZone] : zones.exploring).map(node => (
              <div key={node.concept} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                <div className="font-bold text-slate-700 text-sm">{node.concept}</div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {node.ik && <span className="text-[9px] px-1 bg-pink-100 text-pink-700 rounded">Love</span>}
                  {node.i && <span className="text-[9px] px-1 bg-blue-100 text-blue-700 rounded">Good</span>}
                  {node.g && <span className="text-[9px] px-1 bg-yellow-100 text-yellow-700 rounded">Needs</span>}
                  {node.ai && <span className="text-[9px] px-1 bg-emerald-100 text-emerald-700 rounded">Paid</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- THE MANUAL CREATION MODAL OVERLAY --- */}
      {isAddingNode && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 leading-tight">Create a Gem</h3>
              <button onClick={() => setIsAddingNode(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Concept Name</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="e.g. Graphic Design"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                  value={newNodeForm.concept}
                  onChange={(e) => setNewNodeForm({ ...newNodeForm, concept: e.target.value })}
                  onKeyDown={(e) => {
                    // NEW: Ensure they hit enter ONLY if a pillar is actually selected!
                    if (e.key === 'Enter' && hasSelectedPillar) handleCreateNode()
                  }}
                />
              </div>

              <div>
                <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Ikigai Pillars</p>
                <div className="space-y-3">
                  {[
                    { key: 'ik', label: 'I Love It', color: 'peer-checked:bg-pink-500' },
                    { key: 'i', label: "I'm Good At It", color: 'peer-checked:bg-blue-500' },
                    { key: 'g', label: 'The World Needs It', color: 'peer-checked:bg-yellow-500' },
                    { key: 'ai', label: 'I Can Be Paid For It', color: 'peer-checked:bg-emerald-500' }
                  ].map((pillar) => (
                    <label key={pillar.key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{pillar.label}</span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={newNodeForm[pillar.key as keyof typeof newNodeForm] as boolean}
                          onChange={(e) => setNewNodeForm({ ...newNodeForm, [pillar.key]: e.target.checked })}
                        />
                        <div className={`w-11 h-6 bg-slate-200 rounded-full peer ${pillar.color} peer-focus:ring-4 peer-focus:ring-indigo-100 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white`}></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddingNode(false)}
                disabled={isSaving}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNode}
                // NEW: Button disabled unless at least one toggle is flipped!
                disabled={isSaving || !newNodeForm.concept.trim() || !hasSelectedPillar}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center min-w-[100px]"
              >
                {isSaving ? <span className="animate-pulse">Saving...</span> : 'Create'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}