'use client';

import * as React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { scenarios } from '@/lib/scenarios';
import { determineAction } from '@/lib/reasoning';
import { explainEthicalDecision } from '@/ai/flows/explain-ethical-decision';
import { summarizeDrivingScenario } from '@/ai/flows/summarize-driving-scenario';
import { analyzeVideoScenario } from '@/ai/flows/analyze-video-scenario';
import type { Scenario, Decision } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ObjectIcon } from './object-icon';
import { Bot, Zap, Upload, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type AnalysisMode = 'scenario' | 'video' | 'live';

export default function Dashboard() {
  const [currentScenario, setCurrentScenario] = React.useState<Scenario>(scenarios[0]);
  const [summary, setSummary] = React.useState<string>('');
  const [explanation, setExplanation] = React.useState<string>('');
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [analysisMode, setAnalysisMode] = React.useState<AnalysisMode>('scenario');

  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | undefined>(undefined);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);

  const { toast } = useToast();

  const scenarioImage = React.useMemo(() => {
    if (analysisMode !== 'scenario') return null;
    return PlaceHolderImages.find(img => img.id === currentScenario.imageId);
  }, [currentScenario, analysisMode]);

  React.useEffect(() => {
    if (analysisMode !== 'scenario') return;
    const analyzeScenario = async () => {
      setIsLoading(true);
      setSummary('');
      setExplanation('');
      setDecision(null);

      const reasonedDecision = determineAction(currentScenario.perceptionData);
      setDecision(reasonedDecision);

      try {
        const [summaryResult, explanationResult] = await Promise.all([
          summarizeDrivingScenario(currentScenario.perceptionData),
          explainEthicalDecision({
            decision: reasonedDecision.decision,
            reasoning: reasonedDecision.reason,
            context: currentScenario.perceptionData.context,
          }),
        ]);

        setSummary(summaryResult.scenarioSummary);
        setExplanation(explanationResult.explanation);
      } catch (error) {
        console.error("AI flow error:", error);
        setSummary("Could not generate AI summary.");
        setExplanation("Could not generate AI explanation.");
      }

      setIsLoading(false);
    };

    analyzeScenario();
  }, [currentScenario, analysisMode]);

  React.useEffect(() => {
    if (analysisMode === 'live') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
  
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this feature.',
          });
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [analysisMode, toast]);

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setSummary('');
      setExplanation('');
      setDecision(null);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;
    setIsLoading(true);
    setSummary('');
    setExplanation('');
    setDecision(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const result = await analyzeVideoScenario({ videoDataUri: base64data });

        setSummary(result.scenarioSummary);
        setDecision({ decision: result.decision as any, reason: result.reason, confidence: 0.9 });
        setExplanation('');
      }
    } catch (error) {
      console.error("Video analysis error:", error);
      toast({
        variant: "destructive",
        title: "Video Analysis Failed",
        description: "Could not analyze the video.",
      });
      setSummary("Could not generate AI summary from video.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLiveAnalysis = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      toast({ title: "Camera not ready.", variant: "destructive" });
      return;
    }
    setIsRecording(true);
    setIsLoading(true);
    setSummary('');
    setExplanation('');
    setDecision(null);

    const stream = videoRef.current.srcObject as MediaStream;
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      chunks.push(event.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const result = await analyzeVideoScenario({ videoDataUri: base64data });
          setSummary(result.scenarioSummary);
          setDecision({ decision: result.decision as any, reason: result.reason, confidence: 0.9 });
          setExplanation('');
        } catch(error) {
           console.error("Live video analysis error:", error);
           toast({
             variant: "destructive",
             title: "Live Analysis Failed",
             description: "Could not analyze the live video feed.",
           });
           setSummary("Could not generate AI summary from live feed.");
        } finally {
          setIsLoading(false);
          setIsRecording(false);
        }
      }
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      mediaRecorderRef.current?.stop();
    }, 5000); // Record for 5 seconds
  };


  const getDecisionBadgeVariant = (decision: string | undefined) => {
    switch (decision) {
      case 'Brake':
      case 'Stop':
        return 'destructive';
      case 'Continue':
        return 'default'
      default:
        return 'secondary';
    }
  }

  const renderScenarioContent = () => {
     if (analysisMode === 'video') {
       return (
        <Card>
          <CardHeader>
            <CardTitle>Video Upload</CardTitle>
            <CardDescription>Upload a video file to analyze the driving scenario.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
              <input type="file" accept="video/*" onChange={handleVideoFileChange} id="video-upload" className="hidden" />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Button asChild variant="outline">
                  <span><Upload className="mr-2 h-4 w-4" /> Select Video</span>
                </Button>
              </label>
              {videoFile && <p className="text-sm text-muted-foreground">{videoFile.name}</p>}
            </div>

            {videoUrl && (
              <div className="aspect-video overflow-hidden rounded-lg border">
                <video src={videoUrl} controls className="h-full w-full object-cover" />
              </div>
            )}
             <Button onClick={handleAnalyzeVideo} disabled={!videoFile || isLoading}>
              {isLoading ? 'Analyzing...' : 'Analyze Video'}
            </Button>
          </CardContent>
        </Card>
       )
     }
     
     if (analysisMode === 'live') {
       return (
        <Card>
          <CardHeader>
            <CardTitle>Live Camera Feed</CardTitle>
            <CardDescription>Use your camera to provide a live feed for analysis.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="aspect-video overflow-hidden rounded-lg border bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted />
            </div>
            {hasCameraPermission === false && (
               <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser to use this feature.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={handleLiveAnalysis} disabled={!hasCameraPermission || isLoading || isRecording}>
              {isLoading ? 'Analyzing...' : isRecording ? 'Recording...' : 'Analyze Live Feed (5s)'}
            </Button>
          </CardContent>
        </Card>
       )
     }

     return (
       <>
        <Card>
          <CardHeader>
            <CardTitle>Live Scenario Feed</CardTitle>
            <CardDescription>{currentScenario.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {scenarioImage ? (
                <div className="aspect-video overflow-hidden rounded-lg border">
                <Image
                  src={scenarioImage.imageUrl}
                  alt={scenarioImage.description}
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                  data-ai-hint={scenarioImage.imageHint}
                  priority
                />
                </div>
            ) : <Skeleton className="aspect-video w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perception Analysis</CardTitle>
            <CardDescription>Objects and signals identified by the perception layer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Context:</span>
                <span>{currentScenario.perceptionData.context}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-muted-foreground w-24">Objects:</span>
              <div className="flex flex-wrap gap-4">
              {currentScenario.perceptionData.objects.map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ObjectIcon object={obj} className="h-5 w-5 text-primary" />
                  <span className="capitalize">{obj.replace('_', ' ')}</span>
                </div>
              ))}
              </div>
            </div>
            <Separator />
              <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-muted-foreground w-24">Signals:</span>
                <div className="flex flex-wrap gap-4">
              {currentScenario.perceptionData.signals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2">
                  <Badge variant={sig === 'red_light' ? 'destructive' : 'secondary'} className="capitalize">{sig.replace('_', ' ')}</Badge>
                </div>
              ))}
              </div>
            </div>
          </CardContent>
        </Card>
       </>
     )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-card px-6">
        <h1 className="text-xl font-semibold text-foreground">EthicalDriveAI</h1>
        <p className="hidden md:block text-sm text-muted-foreground">Neuro-Symbolic Ethical Reasoning for Autonomous Vehicles</p>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Tabs defaultValue="scenario" onValueChange={(value) => setAnalysisMode(value as AnalysisMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenario">Scenarios</TabsTrigger>
            <TabsTrigger value="video">Video Upload</TabsTrigger>
            <TabsTrigger value="live">Live Feed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {analysisMode === 'scenario' && (
          <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Select a Driving Scenario</h2>
              <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario) => (
                  <Button
                  key={scenario.id}
                  variant={currentScenario.id === scenario.id ? 'default' : 'outline'}
                  onClick={() => setCurrentScenario(scenario)}
                  >
                  {scenario.name}
                  </Button>
              ))}
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7 md:gap-8">
          <div className="lg:col-span-4 flex flex-col gap-4 md:gap-8">
            {renderScenarioContent()}
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4 md:gap-8">
              <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="grid gap-1">
                  <CardTitle>AI Context Summary</CardTitle>
                  <CardDescription>LLM-generated ethical dilemma summary.</CardDescription>
                </div>
                  <Bot className="h-6 w-6 text-primary" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{summary}</p>
                )}
              </CardContent>
            </Card>
              <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="grid gap-1.5">
                  <CardTitle>Decision & Justification</CardTitle>
                  <CardDescription>The final action and its ethical reasoning.</CardDescription>
                </div>
                <Zap className="h-6 w-6 text-accent" />
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Decision</span>
                    {isLoading || !decision ? <Skeleton className="h-8 w-24" /> : 
                      <Badge variant={getDecisionBadgeVariant(decision?.decision)} className="text-lg px-4 py-1">{decision?.decision}</Badge>
                    }
                </div>
                <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Confidence</span>
                    {isLoading || !decision ? <Skeleton className="h-6 w-16" /> :
                      <span className="font-mono text-lg font-semibold text-foreground">{(decision.confidence * 100).toFixed(0)}%</span>
                    }
                </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Symbolic Reason (Rule-Based)</h4>
                      {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                        </div>
                        ) : (
                        <p className="text-sm text-muted-foreground">{decision?.reason}</p>
                    )}
                  </div>

                  {(analysisMode === 'scenario') && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">AI Explanation (Natural Language)</h4>
                      {isLoading ? (
                          <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-[90%]" />
                              <Skeleton className="h-4 w-[70%]" />
                          </div>
                          ) : (
                          <p className="text-sm text-muted-foreground">{explanation}</p>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
