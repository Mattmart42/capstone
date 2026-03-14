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
  }, [userId])

  // --- THE 13-SECTION SORTING LOGIC ---
  const zones: Record<string, string[]> = {
    ikigai: [],
    satisfaction: [], comfortable: [], excitement: [], fullness: [],
    passion: [], mission: [], profession: [], vocation: [],
    loveOnly: [], goodOnly: [], needsOnly: [], paidOnly: [],
    exploring: []               
  }

  nodes.forEach((n) => {
    const score = [n.ik, n.i, n.g, n.ai].filter(Boolean).length

    if (score === 4) zones.ikigai.push(n.concept)
    else if (score === 3) {
      if (n.ik && n.i && n.ai) zones.satisfaction.push(n.concept)
      else if (n.i && n.g && n.ai) zones.comfortable.push(n.concept)
      else if (n.ik && n.g && n.ai) zones.excitement.push(n.concept)
      else if (n.ik && n.i && n.g) zones.fullness.push(n.concept)
    } else if (score === 2) {
      if (n.ik && n.i) zones.passion.push(n.concept)
      else if (n.ik && n.g) zones.mission.push(n.concept)
      else if (n.i && n.ai) zones.profession.push(n.concept)
      else if (n.g && n.ai) zones.vocation.push(n.concept)
      else zones.exploring.push(n.concept) 
    } else if (score === 1) {
      if (n.ik) zones.loveOnly.push(n.concept)
      else if (n.i) zones.goodOnly.push(n.concept)
      else if (n.g) zones.needsOnly.push(n.concept)
      else if (n.ai) zones.paidOnly.push(n.concept)
    } else {
      zones.exploring.push(n.concept)
    }
  })

  const renderNodes = (nodeList: string[], max = 3) => {
    if (nodeList.length === 0) return null
    return (
      <div className="flex flex-col items-center gap-0.5">
        {nodeList.slice(0, max).map(node => (
          <span key={node} className="px-1.5 py-0.5 bg-white/80 backdrop-blur-sm text-gray-800 rounded text-[10px] leading-tight text-center max-w-[80px] truncate border border-gray-200 shadow-sm pointer-events-auto cursor-help hover:whitespace-normal hover:max-w-[150px] hover:z-50 transition-all" title={node}>
            {node}
          </span>
        ))}
        {nodeList.length > max && (
          <span className="text-[10px] font-bold text-gray-700 bg-white/50 px-1 rounded">+{nodeList.length - max}</span>
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
            Scroll to zoom, click and drag to pan.
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
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Overlay Controls */}
                <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200">
                  <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Zoom In">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Zoom Out">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <button onClick={() => resetTransform()} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Reset">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
                </div>

                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="relative w-[500px] h-[500px] flex-shrink-0">
                    
                    {/* --- THE 4 BACKGROUND CIRCLES --- */}
                    <div className="absolute w-[60%] h-[60%] top-[5%] left-[20%] bg-pink-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute top-[2%] left-1/2 -translate-x-1/2 text-xs font-bold text-pink-700 uppercase tracking-widest pointer-events-none">Love</div>
                    
                    <div className="absolute w-[60%] h-[60%] left-[5%] top-[20%] bg-blue-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute left-[2%] top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-700 uppercase tracking-widest pointer-events-none origin-center">Good At</div>

                    <div className="absolute w-[60%] h-[60%] right-[5%] top-[20%] bg-yellow-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute right-[2%] top-1/2 -translate-y-1/2 rotate-90 text-xs font-bold text-yellow-700 uppercase tracking-widest pointer-events-none origin-center">World Needs</div>

                    <div className="absolute w-[60%] h-[60%] bottom-[5%] left-[20%] bg-emerald-300/40 rounded-full mix-blend-multiply pointer-events-none" />
                    <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-700 uppercase tracking-widest pointer-events-none">Paid For</div>

                    {/* --- THE 13 ABSOLUTELY POSITIONED INTERSECTIONS --- */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-800 mb-0.5">IKIGAI</span>
                      {renderNodes(zones.ikigai)}
                    </div>

                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-600">Fullness</span>
                      {renderNodes(zones.fullness, 2)}
                    </div>
                    <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-600">Comfortable</span>
                      {renderNodes(zones.comfortable, 2)}
                    </div>
                    <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-600">Satisfaction</span>
                      {renderNodes(zones.satisfaction, 2)}
                    </div>
                    <div className="absolute top-1/2 right-[35%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-600">Excitement</span>
                      {renderNodes(zones.excitement, 2)}
                    </div>

                    <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-700">Passion</span>
                      {renderNodes(zones.passion, 2)}
                    </div>
                    <div className="absolute top-[28%] right-[28%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-700">Mission</span>
                      {renderNodes(zones.mission, 2)}
                    </div>
                    <div className="absolute bottom-[28%] left-[28%] -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-700">Profession</span>
                      {renderNodes(zones.profession, 2)}
                    </div>
                    <div className="absolute bottom-[28%] right-[28%] translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-700">Vocation</span>
                      {renderNodes(zones.vocation, 2)}
                    </div>

                    <div className="absolute top-[16%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      {renderNodes(zones.loveOnly, 2)}
                    </div>
                    <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex flex-col items-center">
                      {renderNodes(zones.paidOnly, 2)}
                    </div>
                    <div className="absolute top-1/2 left-[16%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      {renderNodes(zones.goodOnly, 2)}
                    </div>
                    <div className="absolute top-1/2 right-[16%] translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      {renderNodes(zones.needsOnly, 2)}
                    </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
      
      {/* Footer for Unmapped items */}
      {!isLoading && zones.exploring.length > 0 && (
        <div className="bg-white border-t p-3 text-xs flex items-center gap-2 overflow-x-auto z-10 relative">
          <span className="font-semibold text-slate-500 whitespace-nowrap">Unmapped:</span>
          {zones.exploring.map(node => (
            <span key={node} className="px-2 py-1 bg-slate-100 rounded-full text-slate-600 whitespace-nowrap">{node}</span>
          ))}
        </div>
      )}
    </div>
  )
}