'use client';

import { DailyAudio, useDaily } from '@daily-co/daily-react';
import { useState, useRef, useEffect } from 'react';
import { DailyVideo, DailyAudioTrack } from '@daily-co/daily-react';
import { useParticipantIds } from '@daily-co/daily-react';
import { CheckCircle2, LogIn, LogOut, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              RapidDx Telemedicine
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              AI-powered medical consultation platform
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
  const [transcription, setTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');

  const joinRoom = async () => {
    if (daily && roomUrl) {
      console.log('Joining room:', roomUrl);
      await daily.join({
        url: roomUrl,
        startVideoOff: false,
        startAudioOff: false
      });
      setJoined(true);
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

    // Setup transcript WebSocket
    transcriptWsRef.current = new WebSocket('ws://localhost:5000/ws/transcript');
    transcriptWsRef.current.onopen = () => console.log('Transcript WebSocket connected');
    transcriptWsRef.current.onmessage = (msg) => console.log('Transcript WS response:', msg.data);
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
      }

      // Send interim transcripts to backend
      if (interimTranscript && transcriptWsRef.current?.readyState === WebSocket.OPEN) {
        transcriptWsRef.current.send(JSON.stringify({
          text: interimTranscription,
          final: false,
          session_id: 'test-session-browser'
        }));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
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

  return (
    <div className="space-y-6">
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
            Join the consultation room and enable speech recognition for AI-powered transcription.
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
          </div>
        </CardContent>
      </Card>

      {(transcription || interimTranscription) && (
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Live Transcription
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
            </div>
          </CardContent>
        </Card>
      )}

      {joined && (
        <div className="relative">
          <DailyAudio />
          
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Video Participants</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {participantIds
                .filter((id) => id !== 'local')
                .map((participantId) => (
                  <Card key={participantId} className="border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
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
          </div>

          {participantIds.includes('local') && (
            <Card className="absolute bottom-6 right-6 w-64 shadow-xl border-slate-200 dark:border-slate-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-slate-900 dark:bg-slate-800">
                  <DailyVideo
                    sessionId="local"
                    type="video"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">You</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
