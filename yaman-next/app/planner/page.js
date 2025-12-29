"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "../../components/PageHeader"; 
import { Sparkles, Loader2, ChevronLeft, ChevronRight, MapPin, Calendar, Wallet, Navigation, Heart, Zap, AlertCircle, Cpu, RefreshCcw, Battery, BatteryWarning } from "lucide-react"; 
import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("../../components/TripMap"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
});

const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", cost: "Medium", desc: "Best Performance" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Lite", cost: "Low", desc: "Fastest Backup" },
  { id: "gemini-2.5-flash-preview-09-2025", name: "Flash Preview", cost: "Medium", desc: "Sep 2025 Version" },
  { id: "gemini-flash-latest", name: "Flash Latest", cost: "Medium", desc: "Auto-Updated" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", cost: "High", desc: "Top Tier Reasoning" },
];

const MAX_TOKENS = 3; // Renamed constant for clarity
const COOLDOWN_SECONDS = 180; // 3 Minutes

function PlannerForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);

  // Inputs
  const [from, setFrom] = useState("Colombo");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("Medium");
  const [interests, setInterests] = useState("");

  // 🆕 STATE: { "model-id": { tries: 3, cooldown: 0 } }
  const [modelStates, setModelStates] = useState(() => {
    const initial = {};
    AVAILABLE_MODELS.forEach(m => {
        initial[m.id] = { tries: MAX_TOKENS, cooldown: 0 };
    });
    return initial;
  });

  useEffect(() => {
    const paramDest = searchParams.get("destination");
    if (paramDest) setDestination(paramDest);
  }, [searchParams]);

  // 1. LOAD FROM STORAGE ON MOUNT
  useEffect(() => {
    const savedData = localStorage.getItem("travel_planner_limits");
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            
            setModelStates(prev => {
                const next = { ...prev };
                const now = Date.now();

                Object.keys(next).forEach(key => {
                    const savedModel = parsed[key];
                    if (savedModel) {
                        if (savedModel.expiryTimestamp) {
                            const secondsLeft = Math.ceil((savedModel.expiryTimestamp - now) / 1000);
                            
                            if (secondsLeft > 0) {
                                next[key] = { tries: 0, cooldown: secondsLeft };
                            } else {
                                next[key] = { tries: MAX_TOKENS, cooldown: 0 };
                            }
                        } else {
                            next[key] = { tries: savedModel.tries, cooldown: 0 };
                        }
                    }
                });
                return next;
            });
        } catch (e) {
            console.error("Failed to parse saved limits", e);
        }
    }
  }, []);

  // 2. HELPER TO SAVE TO STORAGE
  const saveToStorage = (currentStates) => {
    const dataToSave = {};
    const now = Date.now();
    
    Object.keys(currentStates).forEach(key => {
        const state = currentStates[key];
        dataToSave[key] = {
            tries: state.tries,
            expiryTimestamp: state.cooldown > 0 ? now + (state.cooldown * 1000) : null
        };
    });
    
    localStorage.setItem("travel_planner_limits", JSON.stringify(dataToSave));
  };

  // 3. TIMER: Ticks every second
  useEffect(() => {
    const timer = setInterval(() => {
        setModelStates(prev => {
            const next = { ...prev };
            let hasChanges = false;

            Object.keys(next).forEach(key => {
                if (next[key].cooldown > 0) {
                    next[key].cooldown -= 1;
                    hasChanges = true;

                    if (next[key].cooldown === 0) {
                        next[key].tries = MAX_TOKENS;
                    }
                }
            });
            
            if (hasChanges) {
                 const needsSave = Object.values(next).some(m => m.cooldown === 0 && prev[Object.keys(next).find(k => next[k] === m)]?.cooldown > 0);
                 if (needsSave) saveToStorage(next);
                 return next;
            }
            return prev;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);

    const currentModel = modelStates[selectedModel];

    if (currentModel.tries === 0 && currentModel.cooldown > 0) {
        setError(`This model is recharging. Please wait ${formatTime(currentModel.cooldown)} or switch models.`);
        return;
    }

    setLoading(true);
    setPlan(null);

    // UPDATE STATE & SAVE IMMEDIATELY
    let updatedStates;
    setModelStates(prev => {
        const next = { ...prev };
        const model = { ...next[selectedModel] }; 
        
        if (model.tries > 0) {
            model.tries -= 1;
        }

        // If that was the last token, start cooldown
        if (model.tries === 0) {
            model.cooldown = COOLDOWN_SECONDS;
        }

        next[selectedModel] = model;
        updatedStates = next;
        return next;
    });

    if (updatedStates) saveToStorage(updatedStates);

    try {
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            from, destination, days, budget, interests, 
            model: selectedModel 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
          throw new Error("Failed"); // We catch this below anyway
      }

      setPlan(data);
      setActiveDay(1);

    } catch (err) {
      console.error("Original Error:", err); // Keep for developer, hide from user
      // 🆕 FIXED ERROR MESSAGE
      setError("Generation failed. Please try again with a different model.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900">
      
      {!plan && (
         <div className="min-h-screen flex flex-col bg-white">
            <PageHeader title="AI Planner" subtitle="Design your perfect trip in seconds." image="/carousel/train.jpg" />
            
            <div className="flex-1 w-full max-w-4xl mx-auto px-4 -mt-32 relative z-10 pb-20">
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/50">
                   
                   <div className="text-center mb-10">
                      <span className="inline-block py-1 px-3 rounded-full bg-orange-100 text-orange-600 text-xs font-bold uppercase tracking-wider mb-3">
                        AI-Powered Travel Agent
                      </span>
                      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                        Where will you go next?
                      </h1>
                   </div>

                   <form onSubmit={handleGenerate} className="space-y-6">
                      
                      {/* Row 1: Route */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative group">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Starting From</label>
                              <div className="relative">
                                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input type="text" required className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 font-bold text-gray-800 transition-all outline-none" placeholder="e.g. Colombo" value={from} onChange={(e) => setFrom(e.target.value)} />
                              </div>
                          </div>
                          <div className="relative group">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Destination</label>
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input type="text" required className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 font-bold text-gray-800 transition-all outline-none" placeholder="e.g. Ella" value={destination} onChange={(e) => setDestination(e.target.value)} />
                              </div>
                          </div>
                      </div>

                      {/* Row 2: Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative group">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Duration</label>
                             <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input type="number" min="1" max="14" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 font-bold text-gray-800 transition-all outline-none" value={days} onChange={(e) => setDays(e.target.value)} />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">Days</span>
                             </div>
                          </div>
                          <div className="relative group">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Budget</label>
                             <div className="relative">
                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <select className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 font-bold text-gray-800 transition-all outline-none appearance-none cursor-pointer" value={budget} onChange={(e) => setBudget(e.target.value)}>
                                   <option>Low (Backpacker)</option>
                                   <option>Medium (Standard)</option>
                                   <option>High (Luxury)</option>
                                </select>
                             </div>
                          </div>
                      </div>

                      {/* Row 3: Interests */}
                      <div className="relative group">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Specific Interests (Optional)</label>
                          <div className="relative">
                            <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            <input type="text" placeholder="e.g. Hiking, History, Local Food" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 font-bold text-gray-800 transition-all outline-none" value={interests} onChange={(e) => setInterests(e.target.value)} />
                          </div>
                      </div>

                      {/* 🆕 MODEL SELECTOR UI */}
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                          <div className="flex justify-between items-center mb-3">
                              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Cpu className="w-4 h-4"/> AI Engine Stamina
                              </label>
                              <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
                                  <Battery className="w-3 h-3"/> 
                                  {/* 🆕 Terminology Change */}
                                  {MAX_TOKENS} Tokens / 3m Recharge
                              </div>
                          </div>
                          
                          {/* Models Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {AVAILABLE_MODELS.map((model) => {
                                const state = modelStates[model.id];
                                const isDead = state.tries === 0; 
                                const isSelected = selectedModel === model.id;

                                return (
                                  <button 
                                    key={model.id}
                                    type="button"
                                    disabled={isDead} 
                                    onClick={() => setSelectedModel(model.id)}
                                    className={`relative p-3 rounded-xl border-2 text-left transition-all overflow-hidden ${
                                      isSelected 
                                        ? "border-orange-500 bg-orange-50/50" 
                                        : isDead
                                            ? "border-red-100 bg-red-50 opacity-80 cursor-not-allowed"
                                            : "border-gray-200 bg-white hover:border-orange-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1 relative z-10">
                                      <span className={`text-xs font-extrabold truncate pr-2 ${isSelected ? "text-orange-700" : "text-gray-700"}`}>
                                        {model.name}
                                      </span>
                                      
                                      {/* Status Icons */}
                                      {isDead ? (
                                        <div className="flex items-center gap-1 text-red-500 font-mono font-bold text-[10px]">
                                            <RefreshCcw className="w-3 h-3 animate-spin" />
                                            {formatTime(state.cooldown)}
                                        </div>
                                      ) : isSelected && (
                                        <Zap className="w-3 h-3 text-orange-500 fill-current" />
                                      )}
                                    </div>

                                    <div className="flex justify-between items-end relative z-10 mt-2">
                                        <div className="text-[10px] text-gray-500 font-medium truncate w-1/2">{model.desc}</div>
                                        
                                        {/* TOKEN INDICATOR */}
                                        {!isDead && (
                                            <div className="flex gap-1">
                                                {[...Array(MAX_TOKENS)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-2 h-2 rounded-full transition-all ${
                                                            i < state.tries 
                                                                ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" 
                                                                : "bg-gray-200" 
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Cooldown Progress Bar (Bottom) */}
                                    {isDead && (
                                        <div 
                                            className="absolute bottom-0 left-0 h-1 bg-red-400 transition-all duration-1000 ease-linear"
                                            style={{ width: `${(state.cooldown / COOLDOWN_SECONDS) * 100}%` }}
                                        />
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                      </div>

                      {/* Submit Button & Error Area */}
                      <div className="pt-2">
                        <button 
                          disabled={loading || modelStates[selectedModel].tries === 0} 
                          className="w-full font-bold py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 text-white bg-gradient-to-r from-gray-900 to-black hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:hover:transform-none disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-6 h-6" /> 
                                    <span className="text-lg">Designing Your Trip...</span>
                                </>
                            ) : modelStates[selectedModel].tries === 0 ? (
                                <>
                                    <BatteryWarning className="w-6 h-6 text-red-300" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-sm opacity-80">Recharging Model...</span>
                                        <span className="text-lg font-mono">{formatTime(modelStates[selectedModel].cooldown)} Remaining</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-6 h-6" /> 
                                    {/* 🆕 Terminology Change */}
                                    <span className="text-lg">Generate Trip Plan ({modelStates[selectedModel].tries} Tokens Left)</span>
                                </>
                            )}
                        </button>

                        {/* Error Message */}
                        {error && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <h5 className="text-sm font-bold text-red-800">Generation Failed</h5>
                                    <p className="text-sm text-red-600 mt-1">{error}</p>
                                </div>
                            </div>
                        )}
                      </div>

                   </form>
                </div>
            </div>
         </div>
      )}

      {/* DASHBOARD (Result) */}
      {plan && (
        <div className="pb-12 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* ... Header ... */}
           <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span className="font-semibold text-orange-600">AI Planner</span>
                      <span>/</span>
                      <span>{destination}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900">{plan.tripTitle}</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                      <p className="text-sm text-gray-500">
                          {plan.routeInfo?.distance} • {plan.routeInfo?.travelTime} Travel
                      </p>
                      <span className="text-xs text-gray-400 font-medium">
                        Model: {plan.usedModel}
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                   <button onClick={() => setPlan(null)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                       Edit Search
                   </button>
                   <button className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">
                       Save Trip
                   </button>
              </div>
           </div>

           {/* ... Dashboard Grid ... */}
           <div className="max-w-7xl mx-auto px-4 md:px-6">
             <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[800px]">
                {/* Map Side */}
                <div className="hidden lg:flex lg:col-span-5 flex-col border-r border-gray-100 bg-gray-50 relative">
                    <div className="flex-1 relative w-full overflow-hidden">
                        <TripMap routeInfo={plan.routeInfo} itinerary={plan.itinerary} activeDay={activeDay} />
                    </div>
                     <div className="h-[320px] bg-white border-t border-gray-200 flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 sticky top-0">
                           <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Recommended Nearby</h4>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                           {plan.suggestions?.map((pkg, index) => (
                             <div key={index} className="flex gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:border-orange-500 hover:shadow-md transition-all cursor-pointer group">
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200 relative">
                                  <img src={pkg.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={pkg.title} />
                                </div>
                                <div className="flex flex-col justify-center min-w-0">
                                   <h5 className="font-bold text-gray-900 text-sm truncate">{pkg.title}</h5>
                                   <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs font-bold">{pkg.rating} ★</span>
                                      <span className="text-xs font-bold text-gray-500">{pkg.price}</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                </div>
                
                {/* Itinerary Side */}
                <div className="col-span-1 lg:col-span-7 bg-white h-full flex flex-col overflow-hidden">
                     <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
                          <button onClick={() => setActiveDay(Math.max(1, activeDay - 1))} disabled={activeDay === 1} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <div className="text-center">
                              <h3 className="text-xl font-black text-gray-900">Day {activeDay}</h3>
                              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mt-1">{plan.itinerary[activeDay - 1]?.theme}</p>
                          </div>
                          <button onClick={() => setActiveDay(Math.min(days, activeDay + 1))} disabled={activeDay == days} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                          </button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 md:p-10">
                         <div className="space-y-12">
                            {plan.itinerary[activeDay - 1]?.activities.map((act, i) => (
                               <div key={i} className="relative flex flex-col md:flex-row gap-6 md:gap-0 group">
                                  <div className="md:w-[120px] flex flex-col items-start md:items-end md:pr-8 md:text-right shrink-0">
                                     <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-md">{act.time.split(' ')[0]}</span>
                                  </div>
                                  <div className="flex-1 md:pl-10">
                                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300">
                                         <h4 className="text-lg font-bold text-gray-900 mb-2">{act.title}</h4>
                                         <p className="text-gray-600 text-sm leading-relaxed">{act.description}</p>
                                      </div>
                                  </div>
                               </div>
                            ))}
                         </div>
                     </div>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>}>
      <PlannerForm />
    </Suspense>
  );
}