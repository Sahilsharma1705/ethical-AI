'use client';

import * as React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { scenarios } from '@/lib/scenarios';
import { determineAction } from '@/lib/reasoning';
import { explainEthicalDecision } from '@/ai/flows/explain-ethical-decision';
import { summarizeDrivingScenario } from '@/ai/flows/summarize-driving-scenario';
import { analyzeVideoScenario } from '@/ai/flows/analyze-video-scenario';
import type { Scenario, Decision, EthicsMode, AuditLogEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ObjectIcon } from './object-icon';
import { Bot, Zap, Upload, History, ShieldAlert, Scale, BookOpen, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type AnalysisMode = 'scenario' | 'video' | 'live';

export default function Dashboard() {
  const [currentScenario, setCurrentScenario] = React.useState<Scenario>(scenarios[0]);
  const [ethicsMode, setEthicsMode] = React.useState<EthicsMode>('Utilitarian');
  const [summary, setSummary] = React.useState<string>('');
  const [explanation, setExplanation] = React.useState<string>('');
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [analysisMode, setAnalysisMode] = React.useState<AnalysisMode>('scenario');
  const [auditLog, setAuditLog] = React.useState<AuditLogEntry[]>([]);

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

      const reasonedDecision = determineAction(currentScenario.perceptionData, ethicsMode);
      setDecision(reasonedDecision);

      try {
        const [summaryResult, explanationResult] = await Promise.all([
          summarizeDrivingScenario(currentScenario.perceptionData),
          explainEthicalDecision({
            decision: reasonedDecision.decision,
            reasoning: reasonedDecision.reason,
            context: `${currentScenario.perceptionData.context} (Ethics Mode: ${ethicsMode})`,
          }),
        ]);

        setSummary(summaryResult.scenarioSummary);
        setExplanation(explanationResult.explanation);

        // Add to audit log
        const newEntry: AuditLogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          scenarioName: currentScenario.name,
          mode: ethicsMode,
          decision: reasonedDecision.decision,
          outcome: 'Safe'
        };
        setAuditLog(prev => [newEntry, ...prev].slice(0, 10));

      } catch (error) {
        console.error("AI flow error:", error);
        setSummary("AI Context unavailable due to system load. Using symbolic fallback.");
        setExplanation("The symbolic engine has prioritized safety rules over natural language generation.");
      }

      setIsLoading(false);
    };

    analyzeScenario();
  }, [currentScenario, analysisMode, ethicsMode]);

  React.useEffect(() => {
    if (analysisMode === 'live') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
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
  }, [analysisMode]);

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setDecision(null);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onloadend = async () => {
        const result = await analyzeVideoScenario({ videoDataUri: reader.result as string });
        setSummary(result.scenarioSummary);
        setDecision({ decision: result.decision, reason: result.reason, confidence: 0.9, riskLevel: 'Medium' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Analysis Error", description: "Video analysis service unavailable." });
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionBadgeInfo = (decision: string | undefined): { variant: "destructive" | "default" | "secondary" | "outline", className: string} => {
    switch (decision) {
      case 'Brake':
      case 'Stop':
        return { variant: 'destructive', className: 'bg-[#EF4444] text-white' };
      case 'Continue':
      case 'Proceed':
        return { variant: 'default', className: 'bg-[#6EE7B7] text-[#1C1F26]'};
      default:
        return { variant: 'secondary', className: ''};
    }
  }

  const renderScenarioContent = () => {
     if (analysisMode === 'video') {
       return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Upload className="h-5 w-5" /> Video Input Layer</CardTitle>
            <CardDescription>Upload archival sensor footage for retrospective ethical audit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
              <input type="file" accept="video/*" onChange={handleVideoFileChange} id="video-upload" className="hidden" />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Button asChild variant="outline" className="border-primary/50 hover:bg-primary/10">
                  <span><Upload className="mr-2 h-4 w-4" /> Select Sensor Logs</span>
                </Button>
              </label>
              {videoFile && <p className="text-sm text-cool-gray">{videoFile.name}</p>}
            </div>
            {videoUrl && (
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10">
                <video src={videoUrl} controls className="h-full w-full object-cover" />
              </div>
            )}
             <Button onClick={handleAnalyzeVideo} disabled={!videoFile || isLoading} className="w-full bg-primary hover:bg-primary/90">
              {isLoading ? 'Processing Neural Weights...' : 'Run Neuro-Symbolic Analysis'}
            </Button>
          </CardContent>
        </Card>
       )
     }
     
     if (analysisMode === 'live') {
       return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Real-time Perception</CardTitle>
            <CardDescription>Direct interface with vehicle camera array.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted />
            </div>
            {hasCameraPermission === false && (
               <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
                <AlertTitle>Perception Offline</AlertTitle>
                <AlertDescription>Hardware access required for live ethical monitoring.</AlertDescription>
              </Alert>
            )}
            <Button disabled={!hasCameraPermission || isLoading} className="w-full">
              Live Feed Active
            </Button>
          </CardContent>
        </Card>
       )
     }

     return (
       <>
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Scene Perception</CardTitle>
                <CardDescription className="mt-1">{currentScenario.description}</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary font-mono">ID: {currentScenario.id}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {scenarioImage ? (
                <div className="aspect-video overflow-hidden rounded-xl border border-white/10 relative group">
                  <Image
                    src={scenarioImage.imageUrl}
                    alt={scenarioImage.description}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint={scenarioImage.imageHint}
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>
            ) : <Skeleton className="aspect-video w-full rounded-xl" />}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Symbolic Facts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-cool-gray">Detected Entities</span>
              <div className="flex flex-wrap gap-3">
              {currentScenario.perceptionData.objects.map((obj, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <ObjectIcon object={obj} className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium capitalize">{obj.replace('_', ' ')}</span>
                </div>
              ))}
              </div>
            </div>
            <Separator className="bg-white/5" />
            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-cool-gray">Environmental Signals</span>
                <div className="flex flex-wrap gap-3">
              {currentScenario.perceptionData.signals.map((sig, i) => (
                  <Badge key={i} variant={sig === 'red_light' ? 'destructive' : 'secondary'} className="px-3 py-1">
                    {sig.replace('_', ' ').toUpperCase()}
                  </Badge>
              ))}
              {currentScenario.perceptionData.signals.length === 0 && <span className="text-sm text-cool-gray italic">No active signals detected</span>}
              </div>
            </div>
          </CardContent>
        </Card>
       </>
     )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#1C1F26] text-[#E5E7EB] selection:bg-primary/30">
      <header className="sticky top-0 z-50 flex h-[70px] items-center justify-between border-b border-white/5 bg-[#1C1F26]/80 backdrop-blur-md px-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">EthicalDrive AI</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cool-gray font-semibold">Neuro-Symbolic Multimodal Interface</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            <span className="text-[10px] font-bold text-cool-gray uppercase">Ethics Mode:</span>
            <div className="flex gap-1">
              {(['Utilitarian', 'Deontological', 'Virtue'] as EthicsMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setEthicsMode(mode)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${ethicsMode === mode ? 'bg-primary text-white' : 'text-cool-gray hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="scenario" onValueChange={(value) => setAnalysisMode(value as AnalysisMode)} className="w-full">
          <TabsList className="bg-white/5 border border-white/5 p-1 h-12">
            <TabsTrigger value="scenario" className="data-[state=active]:bg-primary data-[state=active]:text-white h-full px-8">Simulated Scenarios</TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-white h-full px-8">Audit Logs</TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-primary data-[state=active]:text-white h-full px-8">Live Telemetry</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {analysisMode === 'scenario' && (
          <div className="grid gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-cool-gray flex items-center gap-2"><BookOpen className="h-3 w-3" /> Select Scenario Library</span>
              <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario) => (
                  <Button
                  key={scenario.id}
                  variant="outline"
                  className={`rounded-xl px-6 border-white/10 hover:border-primary/50 transition-all ${currentScenario.id === scenario.id ? 'bg-primary text-white border-primary' : 'bg-white/5'}`}
                  onClick={() => setCurrentScenario(scenario)}
                  >
                  {scenario.name}
                  </Button>
              ))}
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 flex flex-col gap-8">
            {renderScenarioContent()}
            
            {/* Audit Log Table */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Ethical Audit Trail</CardTitle>
                  <CardDescription>Historical decisions and rationale logs.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-cool-gray text-[10px] uppercase font-bold">Time</TableHead>
                      <TableHead className="text-cool-gray text-[10px] uppercase font-bold">Scenario</TableHead>
                      <TableHead className="text-cool-gray text-[10px] uppercase font-bold">Framework</TableHead>
                      <TableHead className="text-cool-gray text-[10px] uppercase font-bold">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-xs font-mono">{entry.timestamp}</TableCell>
                        <TableCell className="text-xs">{entry.scenarioName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] py-0">{entry.mode}</Badge></TableCell>
                        <TableCell>
                          <span className={`text-xs font-bold ${entry.decision === 'Brake' || entry.decision === 'Stop' ? 'text-destructive' : 'text-safe-action'}`}>
                            {entry.decision}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {auditLog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-cool-gray text-xs italic">No entries in current session</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8">
              <Card className="border-border/40 bg-primary/5 border-l-4 border-l-primary shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="grid gap-1">
                  <CardTitle className="text-lg flex items-center gap-2">XAI Panel</CardTitle>
                  <CardDescription className="text-cool-gray">LLM context summarization & intent.</CardDescription>
                </div>
                  <Bot className="h-6 w-6 text-primary animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-full bg-white/5" />
                    <Skeleton className="h-3 w-[90%] bg-white/5" />
                    <Skeleton className="h-3 w-[70%] bg-white/5" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-[#E5E7EB] font-medium italic">"{summary || 'System interpreting multimodal inputs...'}"</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#2A2E37] border-border/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <BarChart3 className="h-32 w-32" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between relative z-10">
                <div className="grid gap-1.5">
                  <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-amber-gold" /> Decision Engine</CardTitle>
                  <CardDescription>Logical reasoning & risk assessment.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 relative z-10">
                <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cool-gray">Primary Action</span>
                      {isLoading || !decision ? <Skeleton className="h-7 w-24 rounded-full" /> : 
                        <Badge 
                          variant={getDecisionBadgeInfo(decision?.decision).variant} 
                          className={`text-sm px-5 py-1.5 font-bold shadow-lg ${getDecisionBadgeInfo(decision?.decision).className}`}
                        >
                          {decision?.decision.toUpperCase()}
                        </Badge>
                      }
                  </div>
                  <Separator className="bg-white/5 my-4" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-cool-gray tracking-tighter">Confidence Index</span>
                        <span className="font-mono text-sm font-bold text-white">{isLoading ? '--' : `${(decision?.confidence || 0) * 100}%`}</span>
                    </div>
                    <Progress value={(decision?.confidence || 0) * 100} className="h-1.5 bg-white/5" />
                  </div>
                </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        Logical Justification
                      </h4>
                        {isLoading ? (
                          <div className="space-y-2">
                              <Skeleton className="h-3 w-full bg-white/5" />
                          </div>
                          ) : (
                          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <p className="text-xs text-[#E5E7EB] leading-relaxed font-mono">{decision?.reason}</p>
                          </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-safe-action flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-safe-action" />
                        Human Explanation
                      </h4>
                      {isLoading ? (
                          <div className="space-y-2">
                              <Skeleton className="h-3 w-full bg-white/5" />
                              <Skeleton className="h-3 w-[90%] bg-white/5" />
                          </div>
                          ) : (
                          <p className="text-xs text-cool-gray leading-relaxed pl-3 border-l border-white/10">{explanation}</p>
                      )}
                    </div>
                  </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
               <Card className="bg-white/5 border-white/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-cool-gray">Risk Rating</span>
                      <span className={`text-xl font-bold ${decision?.riskLevel === 'High' ? 'text-destructive' : decision?.riskLevel === 'Medium' ? 'text-amber-gold' : 'text-safe-action'}`}>
                        {decision?.riskLevel || 'N/A'}
                      </span>
                    </div>
                  </CardContent>
               </Card>
               <Card className="bg-white/5 border-white/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-cool-gray">Latency</span>
                      <span className="text-xl font-bold text-primary">24ms</span>
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>
        </div>
      </main>
      <footer className="mt-auto border-t border-white/5 p-6 bg-black/20 text-center">
         <p className="text-[10px] text-cool-gray font-semibold tracking-[0.3em] uppercase">Academic Prototype • Major Project 2024</p>
      </footer>
    </div>
  );
}
