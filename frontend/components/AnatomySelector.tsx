'use client';

import { useState } from 'react';
import Body from '@mjcdev/react-body-highlighter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AnatomySelectorProps {
  onSymptomsChange?: (symptoms: string[]) => void;
}

const anatomyData = [
  { slug: "chest" },
  { slug: "biceps" },
  { slug: "triceps" },
  { slug: "front-deltoids" },
  { slug: "back-deltoids" },
  { slug: "forearm" },
  { slug: "abs" },
  { slug: "obliques" },
  { slug: "trapezius" },
  { slug: "upper-back" },
  { slug: "lower-back" },
  { slug: "quadriceps" },
  { slug: "hamstring" },
  { slug: "calves" },
  { slug: "gluteal" },
  { slug: "adductor" },
  { slug: "abductors" }
];

export default function AnatomySelector({ onSymptomsChange }: AnatomySelectorProps) {
  const [clickedBodyPart, setClickedBodyPart] = useState<string | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const handleBodyPartClick = (muscleInfo: any) => {
    console.log('Clicked muscle info:', muscleInfo);
    if (muscleInfo && muscleInfo.muscle) {
      setClickedBodyPart(muscleInfo.muscle);
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
          <Body data={anatomyData as any} scale={1.7} onBodyPartClick={handleBodyPartClick} colors={["#900000"]}/>
        </div>
        
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
      </CardContent>
    </Card>
  );
}
