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

export default function IkigaiDashboard({ userId }: { userId: string }) {
  const [nodes, setNodes] = useState<IkigaiNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoomScale, setZoomScale] = useState(1)
  const [selectedZone, setSelectedZone] = useState<string | null>(null) // Tracks the open drawer
  
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
    let profileChannel: any;

    const setupRealtime = async () => {
      // 1. Await the session to GUARANTEE we aren't anonymous
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!session) {
        console.error("No active session found, Realtime will fail RLS.")
        return
      }

      await fetchNodes()

      const channelName = `profile-updates-${userId}`
      
      profileChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            // Re-add the filter now that we are securely authenticated!
            filter: `id=eq.${userId}` 
          },
          (payload) => {
            console.log('⚡ Realtime Payload:', payload)
            const newRecord = payload.new as { ikigai_nodes?: IkigaiNode[] }
            if (payload.new && newRecord.ikigai_nodes) {
              setNodes(newRecord.ikigai_nodes)
            } else {
              fetchNodes()
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`🔌 Websocket Status [${channelName}]:`, status)
          if (err) console.error("Websocket Error:", err)
        })
    }

    setupRealtime()

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [userId, supabase])

  // --- THE 13-SECTION SORTING LOGIC ---
  // We now store the FULL object so the drawer has all the data
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

  // --- THE GEOMETRIC GEM RENDERER ---
  const getShape = (score: number) => {
    const baseClasses = "w-4 h-4 fill-slate-800 group-hover:fill-indigo-500 transition-all duration-200 drop-shadow-sm group-hover:scale-110"
    const strokeProps = { stroke: "white", strokeWidth: "2", strokeLinejoin: "round" as const }

    switch (score) {
      case 4: // Hexagon 
        return <svg viewBox="0 0 24 24" className={baseClasses}><polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7" {...strokeProps} /></svg>
      case 3: // Pentagon (Upside Down)
        return <svg viewBox="0 0 24 24" className={baseClasses}><polygon points="12,22 21.5,15.1 17.8,3.9 6.2,3.9 2.5,15.1" {...strokeProps} /></svg>
      case 2: // Diamond 
        return <svg viewBox="0 0 24 24" className={baseClasses}><polygon points="12,3 21,12 12,21 3,12" {...strokeProps} /></svg>
      case 1: 
      default: // Triangle (Upside Down)
        return <svg viewBox="0 0 24 24" className={baseClasses}><polygon points="12,21 21.5,4.5 2.5,4.5" {...strokeProps} /></svg>
    }
  }

  // --- THE COMBINED RENDERER ---
  const renderGems = (nodeList: IkigaiNode[], zoneKey: string, score: number) => {
    if (nodeList.length === 0) return null
    
    const inverseScale = 1 / zoomScale

    // Define strict boundaries based on the geometric size of the section
    let maxWidth = "max-w-[80px]"
    let maxVisible = 10

    if (score === 4) {
      maxWidth = "max-w-[36px]"
      maxVisible = 3
    } else if (score === 3) {
      maxWidth = "max-w-[32px]"
      maxVisible = 2
    } else if (score === 2) {
      maxWidth = "max-w-[48px]"
      maxVisible = 4
    } else if (score === 1) {
      maxWidth = "max-w-[90px]"
      maxVisible = 6
    }

    const visibleNodes = nodeList.slice(0, maxVisible)
    const overflowCount = nodeList.length - maxVisible

    return (
      <div 
        className={`flex flex-wrap justify-center items-center gap-1 pointer-events-auto ${maxWidth}`}
        // Clicking anywhere in the cluster opens the drawer
        onClick={(e) => {
          e.stopPropagation()
          setSelectedZone(zoneKey)
        }}
      >
        {visibleNodes.map((node) => (
          <div key={node.concept} className="relative group cursor-pointer flex items-center justify-center">
            
            {/* The Anti-Scaling Wrapper */}
            <div 
              style={{ transform: `scale(${inverseScale})` }} 
              className="flex justify-center items-center origin-center transition-transform duration-75"
            >
              {/* The Geometric Gem */}
              {getShape(score)}
              
              {/* The Glassmorphism Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100] flex flex-col items-center">
                <div className="bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
                  {node.concept}
                </div>
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900/90 -mt-px" />
              </div>
            </div>

          </div>
        ))}

        {/* The Overflow Indicator Badge */}
        {overflowCount > 0 && (
          <div 
            style={{ transform: `scale(${inverseScale})` }} 
            className="flex justify-center items-center origin-center transition-transform duration-75"
          >
            <div 
              className="w-4 h-4 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-full border border-slate-300 text-[8px] font-bold text-slate-700 shadow-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 hover:scale-110 transition-all" 
              title={`View ${overflowCount} more items`}
            >
              +{overflowCount}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[80vh] w-full max-w-xl border rounded-xl shadow-xl bg-white overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 text-white flex justify-between items-center z-10">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🧭 The Ikigai Board
          </h2>
          <p className="text-xs text-slate-300">
            Click any gem or badge to open details.
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
          <TransformWrapper 
            initialScale={1} 
            minScale={0.5} 
            maxScale={4} 
            centerOnInit={true} 
            wheel={{ step: 0.1 }}
            onTransformed={(ref) => setZoomScale(ref.state.scale)}
            onInit={(ref) => setZoomScale(ref.state.scale)}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200">
                  <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                  <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                  <button onClick={() => resetTransform()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
                </div>

                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div 
                    className="relative w-[450px] h-[450px] flex-shrink-0"
                    // Clicking the empty background closes the drawer
                    onClick={() => setSelectedZone(null)}
                  >
                    
                    {/* --- THE 4 BACKGROUND CIRCLES --- */}
                    <div className="absolute w-[60%] h-[60%] top-[5%] left-[20%] bg-pink-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute top-[1%] left-1/2 -translate-x-1/2 text-xs font-bold text-pink-700/50 uppercase tracking-widest pointer-events-none">Love</div>
                    
                    <div className="absolute w-[60%] h-[60%] left-[5%] top-[20%] bg-blue-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute left-[-4%] top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-700/50 uppercase tracking-widest pointer-events-none origin-center">Good At</div>

                    <div className="absolute w-[60%] h-[60%] right-[5%] top-[20%] bg-yellow-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute right-[-8%] top-1/2 -translate-y-1/2 rotate-90 text-xs font-bold text-yellow-700/50 uppercase tracking-widest pointer-events-none origin-center">World Needs</div>

                    <div className="absolute w-[60%] h-[60%] bottom-[5%] left-[20%] bg-emerald-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute bottom-[1%] left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-700/50 uppercase tracking-widest pointer-events-none">Paid For</div>

                    {/* --- THE 13 ABSOLUTELY POSITIONED INTERSECTIONS --- */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      {zones.ikigai.length === 0 && <span className="text-[10px] font-black text-slate-800/30 mb-0.5 pointer-events-none" style={{ transform: `scale(${1 / zoomScale})` }}>IKIGAI</span>}
                      {renderGems(zones.ikigai, "ikigai", 4)}
                    </div>

                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.fullness, "fullness", 3)}</div>
                    <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.comfortable, "comfortable", 3)}</div>
                    <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.satisfaction, "satisfaction", 3)}</div>
                    <div className="absolute top-1/2 right-[35%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.excitement, "excitement", 3)}</div>

                    <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.passion, "passion", 2)}</div>
                    <div className="absolute top-[28%] right-[28%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.mission, "mission", 2)}</div>
                    <div className="absolute bottom-[28%] left-[28%] -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.profession, "profession", 2)}</div>
                    <div className="absolute bottom-[28%] right-[28%] translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.vocation, "vocation", 2)}</div>

                    <div className="absolute top-[16%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.loveOnly, "loveOnly", 1)}</div>
                    <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.paidOnly, "paidOnly", 1)}</div>
                    <div className="absolute top-1/2 left-[16%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.goodOnly, "goodOnly", 1)}</div>
                    <div className="absolute top-1/2 right-[16%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">{renderGems(zones.needsOnly, "needsOnly", 1)}</div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
      
      {/* THE SLIDE-UP DETAILS DRAWER */}
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
        /* Default Footer for Unmapped items */
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