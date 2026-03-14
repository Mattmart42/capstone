'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

type IkigaiNode = {
  concept: string
  ik: boolean // Love
  i: boolean  // Good At
  g: boolean  // World Needs
  ai: boolean // Paid For
}

export default function IkigaiDashboard3({ userId }: { userId: string }) {
  const [nodes, setNodes] = useState<IkigaiNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<string | null>(null) // NEW: Tracks which zone is clicked
  const supabase = createClient()

  const fetchNodes = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('ikigai_nodes')
      .eq('id', userId)
      .single()

    if (!error && data?.ikigai_nodes) {
      setNodes(data.ikigai_nodes)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchNodes()

    // 1. Create a UNIQUE channel name so Next.js doesn't trip over itself
    const channelName = `profile-updates-${userId}`
    
    const profileChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${userId}` 
        },
        (payload) => {
          console.log('⚡ Realtime Payload:', payload)
          
          // If Postgres sends the full data array, use it!
          if (payload.new && payload.new.ikigai_nodes) {
            setNodes(payload.new.ikigai_nodes)
          } else {
            // Backup: If Postgres only says "hey, a row updated!" but doesn't 
            // give us the JSON array, manually trigger a fresh fetch.
            console.log('Data missing from payload, fetching manually...')
            fetchNodes()
          }
        }
      )
      .subscribe((status) => {
        // This will tell us if Supabase actually accepted our connection!
        console.log(`🔌 Websocket Status [${channelName}]:`, status)
      })

    return () => {
      supabase.removeChannel(profileChannel)
    }
  }, [userId]) // Removed supabase from dependency array to prevent infinite re-renders

  // --- THE 13-SECTION SORTING LOGIC ---
  const zones: Record<string, IkigaiNode[]> = {
    ikigai: [],
    satisfaction: [], comfortable: [], excitement: [], fullness: [],
    passion: [], mission: [], profession: [], vocation: [],
    loveOnly: [], goodOnly: [], needsOnly: [], paidOnly: [],
    exploring: []               
  }

  nodes.forEach((n) => {
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
    } else {
      zones.exploring.push(n)
    }
  })

  // Pretty titles for the drawer
  const zoneTitles: Record<string, string> = {
    ikigai: "🌟 Your Ikigai",
    satisfaction: "Satisfaction, but useless", comfortable: "Comfortable, but empty", excitement: "Excitement, but uncertain", fullness: "Fullness, but poverty",
    passion: "Passion", mission: "Mission", profession: "Profession", vocation: "Vocation",
    loveOnly: "What you Love", goodOnly: "What you're Good At", needsOnly: "What the World Needs", paidOnly: "What Pays",
    exploring: "Unmapped / Exploring"
  }

  // --- THE NEW HEATMAP BADGE RENDERER ---
  const renderBadge = (zoneKey: string) => {
    const nodeList = zones[zoneKey]
    if (nodeList.length === 0) return null
    
    const isSelected = selectedZone === zoneKey

    return (
      <button 
        onClick={(e) => {
          e.stopPropagation()
          setSelectedZone(zoneKey)
        }}
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-md transition-all duration-200 pointer-events-auto hover:scale-110
          ${isSelected 
            ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 scale-110' 
            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }`}
        title={`View ${nodeList.length} items`}
      >
        {nodeList.length}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-[80vh] w-full max-w-xl border rounded-xl shadow-xl bg-white overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 text-white flex justify-between items-center z-10">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🧭 The Ikigai Heatmap
          </h2>
          <p className="text-xs text-slate-300">
            Click the numbered badges to view your traits.
          </p>
        </div>
        <button onClick={fetchNodes} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* The Interactive Diagram Area */}
      <div className="flex-1 bg-[#f8f9fa] relative overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="animate-pulse text-slate-400">Rendering Diagram...</div>
        ) : (
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={4} centerOnInit={true} wheel={{ step: 0.1 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Overlay Controls */}
                <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200">
                  <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                  <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                  <button onClick={() => resetTransform()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
                </div>

                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="relative w-[500px] h-[500px] flex-shrink-0" onClick={() => setSelectedZone(null)}>
                    
                    {/* --- THE 4 BACKGROUND CIRCLES --- */}
                    <div className="absolute w-[60%] h-[60%] top-[5%] left-[20%] bg-pink-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute top-[2%] left-1/2 -translate-x-1/2 text-xs font-bold text-pink-700/50 uppercase tracking-widest pointer-events-none">Love</div>
                    
                    <div className="absolute w-[60%] h-[60%] left-[5%] top-[20%] bg-blue-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute left-[2%] top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-700/50 uppercase tracking-widest pointer-events-none origin-center">Good At</div>

                    <div className="absolute w-[60%] h-[60%] right-[5%] top-[20%] bg-yellow-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute right-[2%] top-1/2 -translate-y-1/2 rotate-90 text-xs font-bold text-yellow-700/50 uppercase tracking-widest pointer-events-none origin-center">World Needs</div>

                    <div className="absolute w-[60%] h-[60%] bottom-[5%] left-[20%] bg-emerald-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-700/50 uppercase tracking-widest pointer-events-none">Paid For</div>

                    {/* --- THE 13 ABSOLUTELY POSITIONED INTERSECTIONS --- */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      {zones.ikigai.length === 0 && <span className="text-[10px] font-black text-slate-800/30 mb-0.5 pointer-events-none">IKIGAI</span>}
                      {renderBadge("ikigai")}
                    </div>

                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("fullness")}</div>
                    <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("comfortable")}</div>
                    <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("satisfaction")}</div>
                    <div className="absolute top-1/2 right-[35%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("excitement")}</div>

                    <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("passion")}</div>
                    <div className="absolute top-[28%] right-[28%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("mission")}</div>
                    <div className="absolute bottom-[28%] left-[28%] -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("profession")}</div>
                    <div className="absolute bottom-[28%] right-[28%] translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("vocation")}</div>

                    <div className="absolute top-[16%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("loveOnly")}</div>
                    <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("paidOnly")}</div>
                    <div className="absolute top-1/2 left-[16%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("goodOnly")}</div>
                    <div className="absolute top-1/2 right-[16%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderBadge("needsOnly")}</div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
      
      {/* THE NEW SLIDE-UP DETAILS DRAWER */}
      {selectedZone ? (
        <div className="bg-white border-t border-slate-200 z-50 relative h-48 flex flex-col animate-in slide-in-from-bottom-2 duration-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center p-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {zoneTitles[selectedZone]}
            </h3>
            <button 
              onClick={() => setSelectedZone(null)}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {zones[selectedZone].map((node) => (
              <div key={node.concept} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg hover:border-indigo-200 transition-colors">
                <span className="font-semibold text-slate-700">{node.concept}</span>
                <div className="flex gap-1">
                  {node.ik && <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded border border-pink-200">Love</span>}
                  {node.i && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">Good</span>}
                  {node.g && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded border border-yellow-200">Needs</span>}
                  {node.ai && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">Paid</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Default Footer for Unmapped items (when no zone is clicked) */
        !isLoading && zones.exploring.length > 0 && (
          <div className="bg-white border-t p-3 text-xs flex items-center gap-2 overflow-x-auto z-10 relative h-12">
            <span className="font-semibold text-slate-500 whitespace-nowrap">Unmapped:</span>
            {zones.exploring.map(node => (
              <span key={node.concept} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600 whitespace-nowrap">{node.concept}</span>
            ))}
          </div>
        )
      )}
    </div>
  )
}