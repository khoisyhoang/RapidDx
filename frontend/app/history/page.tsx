'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SymptomTimelineItem {
  date: string
  symptom: string
  status: string
  description: string
}

interface Session {
  session_id: number
  created_at: string
  patient_id: number
  doctor_id: number
  summary: {
    text: string
    app_session_id?: string
  } | null
  symptoms: string[] | null
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setSessions(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const toggleExpanded = (sessionId: number) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  const parseSummary = (summary: { text: string } | null) => {
    if (!summary || !summary.text) return null
    
    try {
      // Look for JSON blocks in the text
      const jsonMatch = summary.text.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1])
        return jsonData
      }
      
      // Try parsing the entire text as JSON
      try {
        return JSON.parse(summary.text)
      } catch {
        return null
      }
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
          <p className="mt-2 text-gray-600">View your past consultation sessions</p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600">Your consultation sessions will appear here once you start using the application.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const parsedSummary = parseSummary(session.summary)
              const symptomTimeline = parsedSummary?.symptom_timeline as SymptomTimelineItem[] | undefined
              
              return (
                <div key={session.session_id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Session #{session.session_id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(session.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          Patient ID: {session.patient_id}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          Doctor ID: {session.doctor_id}
                        </span>
                      </div>
                    </div>

                    {session.symptoms && session.symptoms.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Detected Symptoms:</h4>
                        <div className="flex flex-wrap gap-2">
                          {session.symptoms.map((symptom, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {symptomTimeline && symptomTimeline.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Symptom Timeline:</h4>
                        <div className="space-y-3">
                          {symptomTimeline.map((item, index) => (
                            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">{item.symptom}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{item.date}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.status === 'onset' 
                                      ? 'bg-red-100 text-red-800' 
                                      : item.status === 'worsening'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {session.summary && !parsedSummary && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Summary:</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className={`text-sm text-gray-700 whitespace-pre-wrap ${!expandedSessions.has(session.session_id) ? 'line-clamp-3' : ''}`}>
                            {session.summary.text}
                          </p>
                          {session.summary.text.length > 300 && (
                            <button 
                              onClick={() => toggleExpanded(session.session_id)}
                              className="text-blue-600 text-sm mt-2 hover:text-blue-800 font-medium"
                            >
                              {expandedSessions.has(session.session_id) ? 'Read less' : 'Read more'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
