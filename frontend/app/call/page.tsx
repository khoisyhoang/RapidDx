'use client';

import { DailyAudio, useDaily } from '@daily-co/daily-react';
import { useState, useRef, useEffect } from 'react';
import { DailyVideo, DailyAudioTrack } from '@daily-co/daily-react';
import { useParticipantIds } from '@daily-co/daily-react';
import { CheckCircle2, LogIn, LogOut, Mic, Square, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnatomySelector from '@/components/AnatomySelector';
import DiagnosisModal from '@/components/DiagnosisModal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}

interface CallRoomProps {
  roomUrl: string;
}

export default function CallPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              RapidDx Consultation
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Live AI-powered medical consultation
            </p>
          </div>
          <CallRoom roomUrl="https://patientlens.daily.co/goYM8hKyi8DQyje5Spf3" />
        </div>
      </div>
    </div>
  );
}

function CallRoom({ roomUrl }: CallRoomProps) {
  const daily = useDaily();
  const [joined, setJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const participantIds = useParticipantIds();
  const recognitionRef = useRef<any>(null);
  const transcriptWsRef = useRef<WebSocket | null>(null);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const [transcription, setTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<{symptom: string[], diseases: string[], body_type: string[]} | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [comprehensiveDiagnosis, setComprehensiveDiagnosis] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Auto-scroll transcription to bottom
  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcription, interimTranscription]);

  const runComprehensiveDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const response = await fetch('http://localhost:5000/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: 'test-session-browser',
          age: 20,
          gender: 'male'
        }),
      });

      const data = await response.json();
      console.log('Comprehensive diagnosis result:', data);
      setComprehensiveDiagnosis(data);
      setIsDiagnosisModalOpen(true);
    } catch (error) {
      console.error('Comprehensive diagnosis error:', error);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // const runDiagnose = async (text: string) => {
  //   try {
  //     const response = await fetch('http://localhost:5000/api/diagnose', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         text,
  //         final: true,
  //         session_id: 'test-session-browser',
  //       }),
  //     });

  //     const data = await response.json();
  //     console.log('Diagnose API result:', data);
  //   } catch (error) {
  //     console.error('Diagnose API error:', error);
  //   }
  // };

  const joinRoom = async () => {
    if (daily && roomUrl) {
      console.log('Joining room:', roomUrl);
      await daily.join({
        url: roomUrl,
        startVideoOff: false,
        startAudioOff: false
      });
      setJoined(true);
      // Auto-start recording when joining
      await startSendingAudio();
    }
  };

  const leaveRoom = () => {
    if (daily) {
      daily.leave();
      setJoined(false);
    }
    stopSendingAudio();
  };

  const startSendingAudio = async () => {
    if (!window.webkitSpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    

    // Setup transcript WebSocket
    transcriptWsRef.current = new WebSocket('ws://localhost:5000/ws/transcript');
    transcriptWsRef.current.onopen = () => console.log('Transcript WebSocket connected');
    transcriptWsRef.current.onmessage = (msg) => {
      console.log('Transcript WS response:', msg.data);
      try {
        const data = JSON.parse(msg.data);
        if (data.event === 'diagnosis_result' && data.result) {
          setDiagnosisResults(prev => {
            if (!prev) return data.result;
            
            return {
              symptom: [...new Set([...prev.symptom, ...data.result.symptom])],
              diseases: [...new Set([...prev.diseases, ...data.result.diseases])],
              body_type: [...new Set([...prev.body_type, ...data.result.body_type])]
            };
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    transcriptWsRef.current.onclose = () => console.log('Transcript WebSocket closed');
    transcriptWsRef.current.onerror = (error) => console.error('Transcript WebSocket error:', error);

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result: SpeechRecognitionResult = e.results[i];
        const alternative: SpeechRecognitionAlternative = result[0];
        const transcript: string = alternative.transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscription(prev => prev + finalTranscript);
      setInterimTranscription(interimTranscript);

      // Send final transcripts to backend
      if (finalTranscript && transcriptWsRef.current?.readyState === WebSocket.OPEN) {
        transcriptWsRef.current.send(JSON.stringify({
          text: finalTranscript,
          final: true,
          session_id: 'test-session-browser'
        }));

        // void runDiagnose(finalTranscript);
      }

      // // Send interim transcripts to backend
      // if (interimTranscript && transcriptWsRef.current?.readyState === WebSocket.OPEN) {
      //   transcriptWsRef.current.send(JSON.stringify({
      //     text: interimTranscription,
      //     final: false,
      //     session_id: 'test-session-browser'
      //   }));
      // }
    };
    recognition.start();
    recognition.onend = () => {
      recognition.start();
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    console.log('Speech recognition started...');
  };

  const stopSendingAudio = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (transcriptWsRef.current) {
      transcriptWsRef.current.close();
    }
    setIsRecording(false);
    setInterimTranscription('');
    console.log('Speech recognition stopped.');
  };

  useEffect(() => {
    return () => {
      stopSendingAudio();
    };
  }, []);

  const otherParticipants = participantIds.filter((id) => id !== 'local');
  const showLocalVideo = participantIds.includes('local') && otherParticipants.length === 0;

  return (
    <div className="h-screen flex">
      {/* Left side: Video section */}
      <div className="flex-1 flex flex-col">
        {/* Call Controls */}
        <div className="p-4">
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">Call Controls</span>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className={`w-4 h-4 ${joined ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className={joined ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                    {joined ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Manage your consultation session and audio recording.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  onClick={joinRoom}
                  disabled={!roomUrl}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                >
                  <LogIn className="w-5 h-5" />
                  Join Consultation
                </Button>

                <Button
                  onClick={leaveRoom}
                  disabled={!daily || !joined}
                  variant="destructive"
                  size="lg"
                  className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 px-6"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Session
                </Button>

                <Button
                  onClick={isRecording ? stopSendingAudio : startSendingAudio}
                  variant={isRecording ? "secondary" : "outline"}
                  size="lg"
                  className={`gap-2 transition-all duration-200 px-6 ${
                    isRecording 
                      ? 'bg-red-50 border-red-200 text-red-700  dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                  } shadow-md `}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5" />
                      <span>Stop Recording</span>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </>
                  )}
                </Button>

                <Button
                  onClick={runComprehensiveDiagnosis}
                  disabled={isDiagnosing}
                  variant="outline"
                  size="lg"
                  className="gap-2 transition-all duration-200 px-6 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400 shadow-md"
                >
                  <Stethoscope className="w-5 h-5" />
                  {isDiagnosing ? 'Diagnosing...' : 'Diagnose'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Section */}
        {joined && (
          <div className="flex-1 relative">
            <DailyAudio />
            {showLocalVideo ? (
              <div className="w-full h-full bg-slate-900 dark:bg-slate-800">
                <DailyVideo
                  sessionId="local"
                  type="video"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 p-2 bg-black/50 rounded text-white">
                  You
                </div>
              </div>
            ) : (
              <div className="grid gap-4 p-4 h-full overflow-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {otherParticipants.map((participantId) => (
                  <Card key={participantId} className="border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-video bg-slate-900 dark:bg-slate-800">
                        <DailyVideo
                          sessionId={participantId}
                          type="video"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Participant</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <DailyAudioTrack sessionId={participantId} type="audio" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Live Diagnosis Section */}
      <div className="w-96 flex flex-col border-l border-slate-200 dark:border-slate-700">

        {/* Live Diagnosis */}
        {diagnosisResults && (
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg m-4 mt-0 flex-shrink-0">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Live Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-4">
                {diagnosisResults.symptom.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Symptoms</h4>
                    <div className="flex flex-wrap gap-2">
                      {diagnosisResults.symptom.map((symptom, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {diagnosisResults.diseases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Diseases</h4>
                    <div className="flex flex-wrap gap-2">
                      {diagnosisResults.diseases.map((disease, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-full text-sm">
                          {disease}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {diagnosisResults.body_type.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Body Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {diagnosisResults.body_type.map((bodyType, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm">
                          {bodyType}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {diagnosisResults.symptom.length === 0 && diagnosisResults.diseases.length === 0 && diagnosisResults.body_type.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No diagnosis results yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Anatomy 3D Image Placeholder */}
        <div className="flex-shrink-0 m-4">
          <AnatomySelector 
            onSymptomsChange={setSelectedSymptoms}
            websocket={transcriptWsRef.current}
            symptoms={diagnosisResults?.symptom || []}
          />
        </div>

        {/* Live Transcription */}
        <Card className="flex-1 border-slate-200 dark:border-slate-700 shadow-lg m-4 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Live Transcription
            </CardTitle>
          </CardHeader>
          <CardContent 
            ref={transcriptionRef}
            className="p-4 flex-1 overflow-y-auto"
          >
            <div className="space-y-4">
              {transcription && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              )}
              {interimTranscription && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-200 italic leading-relaxed">
                    {interimTranscription}
                  </p>
                </div>
              )}
              {!transcription && !interimTranscription && (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No transcription yet. Start speaking to see live updates.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnosis Modal */}
      <DiagnosisModal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
        diagnosisData={comprehensiveDiagnosis}
      />
    </div>
  );
}
