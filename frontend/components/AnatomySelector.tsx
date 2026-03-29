'use client';

import { useState, useEffect } from 'react';
import Body from '@mjcdev/react-body-highlighter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AnatomySelectorProps {
  onSymptomsChange?: (symptoms: string[]) => void;
  websocket?: WebSocket | null;
  symptoms?: string[];
}
// mapping before
const scispacyToGroupMapping = {
  // head area
  "Head": "head",
  "Eye": "head",
  "Ear": "head",
  "Nose": "head",
  "Mouth": "head",
  "Face": "head",

  // neck
  "Neck": "neck",
  "Pharyngeal structure": "neck",
  "Throat": "neck",

  // chest & torso
  "Chest": "chest",
  "Breast": "chest",

  // back
  "Back": "back",
  "Spine": "back",

  // arms
  "Arm": "arms",
  "Upper arm": "arms",
  "Elbow": "arms",
  "Forearm": "arms",
  "Wrist": "arms",

  // hands
  "Hand": "hands",
  "Finger": "hands",
  "Thumb": "hands",

  // legs
  "Leg": "legs",
  "Thigh": "legs",
  "Knee": "legs",

  // feet
  "Foot": "feet",
  "Ankle": "feet",
  "Toe": "feet"
};

const muscleGroups = {
  chest: ["chest"],
  arms: ["biceps", "triceps", "forearm"],
  shoulders: ["deltoids"],
  legs: ["quadriceps", "hamstring", "calves", "gluteal", "adductors"],
  core: ["abs", "obliques"],
  back: ["trapezius", "upper-back", "lower-back"],
  head: ["hair", "head"],
  neck: ["neck"],
  hands: ["hands"],
  feet: ["feet", "ankles", "tibialis", "knees"]
};

const getMusclesInGroup = (groupName: string): string[] => {
  return muscleGroups[groupName as keyof typeof muscleGroups] || [];
};

const mapScispacyToGroups = (scispacyBodyTypes: string[]): string[] => {
  return scispacyBodyTypes.map(type => scispacyToGroupMapping[type as keyof typeof scispacyToGroupMapping] || type);
};

const anatomyData = [
  { slug: "trapezius" },
  { slug: "triceps" },
  { slug: "forearm" },
  { slug: "adductors" },
  { slug: "calves" },
  { slug: "hair" },
  { slug: "neck" },
  { slug: "deltoids" },
  { slug: "hands" },
  { slug: "feet" },
  { slug: "head" },
  { slug: "ankles" },
  { slug: "tibialis" },
  { slug: "obliques" },
  { slug: "chest" },
  { slug: "biceps" },
  { slug: "abs" },
  { slug: "quadriceps" },
  { slug: "knees" },
  { slug: "upper-back" },
  { slug: "lower-back" },
  { slug: "hamstring" },
  { slug: "gluteal" }
];

interface BodyPartInsight {
  symptom: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
}

export default function AnatomySelector({ onSymptomsChange, websocket, symptoms = [] }: AnatomySelectorProps) {
  const [clickedBodyPart, setClickedBodyPart] = useState<string | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [highlightedMuscles, setHighlightedMuscles] = useState<string[]>([]);
  const [bodyPartInsights, setBodyPartInsights] = useState<BodyPartInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (websocket) {
      const handleMessage = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.ok && data.event === 'diagnosis_result' && data.result && data.result.body_type && data.result.body_type.length > 0) {
            const mappedGroups = mapScispacyToGroups(data.result.body_type);
            const musclesToHighlight = mappedGroups.flatMap(group => getMusclesInGroup(group));
            setHighlightedMuscles(prev => {
              const existing = new Set(prev);
              const newMuscles = musclesToHighlight.filter(muscle => !existing.has(muscle));
              return [...prev, ...newMuscles];
            });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocket.addEventListener('message', handleMessage);
      
      return () => {
        websocket.removeEventListener('message', handleMessage);
      };
    }
  }, [websocket]);

  const handleBodyPartClick = (muscleInfo: any) => {
    console.log('Clicked muscle info:', muscleInfo);
    if (muscleInfo && muscleInfo.slug) {
      if (!highlightedMuscles.includes(muscleInfo.slug)) {
        return;
      }
      setClickedBodyPart(muscleInfo.slug);
      console.log('Analyzing body part:', muscleInfo.slug);
      void analyzeBodyPart(muscleInfo.slug);
    }
  };

  const analyzeBodyPart = async (bodyPart: string) => {
    if (!symptoms || symptoms.length === 0) {
      console.log('No symptoms provided');
      setAnalyzeError(null);
      setBodyPartInsights([]);
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch('http://localhost:5000/api/bodypart/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body_part: bodyPart,
          symptoms,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze body part');
      }
      setBodyPartInsights(data.items || []);
    } catch (error) {
      console.error('Body part analyze error:', error);
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze body part');
      setBodyPartInsights([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleMuscleSelection = (muscle: string) => {
    setSelectedMuscles(prev => {
      const newSelection = prev.includes(muscle) 
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle];
      
      // Notify parent component of symptoms change
      if (onSymptomsChange) {
        onSymptomsChange(newSelection);
      }
      
      return newSelection;
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          Anatomy Reference
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
          <Body 
            data={highlightedMuscles.length > 0 
              ? highlightedMuscles.map(slug => ({ slug })) as any 
              : [] 
            } 
            scale={1.7} 
            onBodyPartClick={handleBodyPartClick} 
            colors={highlightedMuscles.length > 0 ? ["#ff6b35", "#f7931e"] : ["#900000"]}
          />
        </div>
        
        {/* Highlighted Body Parts from Diagnosis */}
        {highlightedMuscles.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
              AI Detected Areas ({highlightedMuscles.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {highlightedMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full text-xs capitalize"
                >
                  {muscle.replace('-', ' ')}
                </span>
              ))}
            </div>
            <button
              onClick={() => setHighlightedMuscles([])}
              className="mt-2 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              Clear highlights
            </button>
          </div>
        )}
        
        {/* Clicked Body Part Display */}
        {clickedBodyPart && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Selected Body Part
            </h4>
            <p className="text-purple-800 dark:text-purple-200 capitalize">
              {clickedBodyPart.replace('-', ' ')}
            </p>
            <button
              onClick={() => toggleMuscleSelection(clickedBodyPart)}
              className={`mt-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedMuscles.includes(clickedBodyPart)
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-800 dark:text-purple-200'
              }`}
            >
              {selectedMuscles.includes(clickedBodyPart) ? 'Remove from symptoms' : 'Add to symptoms'}
            </button>
          </div>
        )}
        
        {/* Selected Muscles List */}
        {selectedMuscles.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Symptom Areas ({selectedMuscles.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {selectedMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs capitalize"
                >
                  {muscle.replace('-', ' ')}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                setSelectedMuscles([]);
                if (onSymptomsChange) {
                  onSymptomsChange([]);
                }
              }}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Gemini body-part analysis */}
        {clickedBodyPart && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {clickedBodyPart.replace('-', ' ')} Analysis
            </h4>
            {isAnalyzing && <p className="text-xs text-slate-500 dark:text-slate-400">Analyzing...</p>}
            {analyzeError && <p className="text-xs text-red-600 dark:text-red-400">{analyzeError}</p>}
            {!isAnalyzing && !analyzeError && symptoms.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">No symptoms available yet.</p>
            )}
            {!isAnalyzing && !analyzeError && symptoms.length > 0 && bodyPartInsights.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">No related symptoms found.</p>
            )}
            {bodyPartInsights.length > 0 && (
              <div className="space-y-2">
                {bodyPartInsights.map((item, idx) => (
                  <div key={`${item.symptom}-${idx}`} className="p-2 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.symptom}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        item.risk_level === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : item.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {item.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
