'use client';

import { X, Stethoscope, AlertTriangle, Info, BookOpen, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosisData: any;
}

export default function DiagnosisModal({ isOpen, onClose, diagnosisData }: DiagnosisModalProps) {
  if (!isOpen || !diagnosisData) return null;

  const { diagnosis_result, payload } = diagnosisData;
  
  // Add error handling for undefined diagnosis_result
  if (!diagnosis_result) {
    console.error('diagnosis_result is undefined:', diagnosisData);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-700 dark:text-slate-300">Diagnosis data is not available or malformed.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  const { result } = diagnosis_result || {};
  const { analysis, disclaimer, educationalResources, meta } = result || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Comprehensive Diagnosis Analysis
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Session: {diagnosisData?.session_id || 'Unknown'}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Age:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-100">{payload?.age || 'Unknown'} years</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Gender:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-100 capitalize">{payload?.gender || 'Unknown'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-blue-700 dark:text-blue-300">Reported Symptoms:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {payload?.symptom?.map((symptom: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                      {symptom}
                    </span>
                  )) || <span className="text-blue-700 dark:text-blue-300">No symptoms reported</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Possible Conditions */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Possible Conditions
            </h3>
            <div className="space-y-4">
              {analysis?.possibleConditions?.map((condition: any, index: number) => (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {condition?.condition || 'Unknown condition'}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      condition.riskLevel === 'Low' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      condition.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {condition?.riskLevel || 'Unknown'} Risk
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {condition?.description || 'No description available'}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                    {condition?.additionalInfo || 'No additional information available'}
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Common symptoms:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {condition?.commonSymptoms?.map((symptom: string, idx: number) => (
                        <span key={idx} className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          {symptom}
                        </span>
                      )) || <span className="text-slate-500">No common symptoms listed</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Advice */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              General Advice
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Recommended Actions</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  {analysis?.generalAdvice?.recommendedActions?.map((action: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Lifestyle Considerations</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {analysis?.generalAdvice?.lifestyleConsiderations?.map((consideration: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                      {consideration}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">When to Seek Medical Attention</h4>
                <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                  {analysis?.generalAdvice?.whenToSeekMedicalAttention?.map((condition: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Educational Resources */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Educational Resources
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Medical Terminology</h4>
                <div className="space-y-2">
                  {educationalResources?.medicalTerminology ? Object.entries(educationalResources.medicalTerminology).map(([term, definition]: [string, any]) => (
                    <div key={term} className="text-sm">
                      <span className="font-medium text-purple-800 dark:text-purple-200">{term}:</span>
                      <span className="ml-2 text-purple-700 dark:text-purple-300">{definition}</span>
                    </div>
                  )) : <p className="text-sm text-purple-700 dark:text-purple-300">No medical terminology available</p>}
                </div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">Preventive Measures</h4>
                <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1">
                  {educationalResources?.preventiveMeasures?.map((measure: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 mt-0.5">•</span>
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Reliable Sources</h4>
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {educationalResources?.reliableSources?.map((source: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 mt-0.5">•</span>
                    {source}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Meta Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              Analysis Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Analysis Type:</span>
                <span className="ml-2 text-slate-600 dark:text-slate-400">{meta?.analysisType || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Confidence Level:</span>
                <span className="ml-2 text-slate-600 dark:text-slate-400">{meta?.confidenceLevel || 'Unknown'}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="font-medium text-slate-700 dark:text-slate-300">Limitations:</span>
              <ul className="mt-1 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {meta?.limitations?.map((limitation: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              <strong>Medical Disclaimer:</strong> {disclaimer || 'No disclaimer available'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
