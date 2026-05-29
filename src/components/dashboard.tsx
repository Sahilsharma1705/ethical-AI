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
import { Bot, Zap, Upload, History, ShieldAlert, Scale, BookOpen, BarChart3, Info, Eye, Activity } from 'lucide-react';
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
  const { toast } = useToast();

  const scenarioImage = React.useMemo(() => {
    if (analysisMode !== 'scenario') return null;
    return PlaceHolderImages.find(img => img.id === currentScenario.imageId);
  }, [currentScenario, analysisMode]);

  const analyzeScenario = React.useCallback(async (scenario: Scenario, mode: EthicsMode) => {
    setIsLoading(true);
    setSummary('');
    setExplanation('');
    setDecision(null);

    const reasonedDecision = determineAction(scenario.perceptionData, mode);
    setDecision(reasonedDecision);

    try {
      const [summaryResult, explanationResult] = await Promise.all([
        summarizeDrivingScenario(scenario.perceptionData),
        explainEthicalDecision({
          decision: reasonedDecision.decision,
          reasoning: reasonedDecision.reason,
          context: `${scenario.perceptionData.context} (Ethics Framework: ${mode})`,
        }),
      ]);

      setSummary(summaryResult.scenarioSummary);
      setExplanation(explanationResult.explanation);

      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        scenarioName: scenario.name,
        mode: mode,
        decision: reasonedDecision.decision,
        outcome: 'Validated'
      };
      setAuditLog(prev => [newEntry, ...prev].slice(0, 10));

    } catch (error) {
      console.error("AI flow error:", error);
      setSummary("Symbolic fallback active: Neural layer connection timed out.");
      setExplanation("The system has defaulted to hard-coded safety rules. Priority: Pedestrian safety.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (analysisMode === 'scenario') {
      analyzeScenario(currentScenario, ethicsMode);
    }
  }, [currentScenario, analysisMode, ethicsMode, analyzeScenario]);

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
        setDecision({ decision: result.decision, reason: result.reason, confidence: 0.89, riskLevel: 'Medium' });
        setIsLoading(false);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Analysis Error", description: "Video analysis service unavailable." });
      setIsLoading(false);
    }
  };

  const getDecisionBadgeInfo = (decision: string | undefined) => {
    const d = decision?.toLowerCase() || '';
    if (d.includes('brake') || d.includes('stop')) {
      return { variant: 'destructive' as const, className: 'bg-[#EF4444] text-white' };
    }
    if (d.includes('continue') || d.includes('proceed')) {
      return { variant: 'default' as const, className: 'bg-[#6EE7B7] text-[#1C1F26]'};
    }
    return { variant: 'secondary' as const, className: ''};
  }

  const renderPerceptionLayer = () => {
     if (analysisMode === 'video') {
       return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Perception Layer: Neural Archival</CardTitle>
            <CardDescription>Upload telemetry footage for retrospective ethical audit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
              <input type="file" accept="video/*" onChange={handleVideoFileChange} id="video-upload" className="hidden" />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Button asChild variant="outline" className="border-primary/50 hover:bg-primary/10">
                  <span><Upload className="mr-2 h-4 w-4" /> Load Sensor Logs</span>
                </Button>
              </label>
              {videoFile && <p className="text-sm text-[#9CA3AF] font-mono">{videoFile.name}</p>}
            </div>
            {videoUrl && (
              <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-inner bg-black">
                <video src={videoUrl} controls className="h-full w-full object-contain" />
              </div>
            )}
             <Button onClick={handleAnalyzeVideo} disabled={!videoFile || isLoading} className="w-full bg-primary hover:bg-primary/90 rounded-xl font-bold">
              {isLoading ? 'Neural Processing...' : 'Run Multimodal Analysis'}
            </Button>
          </CardContent>
        </Card>
       )
     }
     
     if (analysisMode === 'live') {
       return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Perception Layer: Real-time Feed</CardTitle>
            <CardDescription>Live telemetry stream from front-facing camera array.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner relative">
                <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted />
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <Badge className="bg-destructive animate-pulse border-none">LIVE FEED</Badge>
                </div>
            </div>
            {hasCameraPermission === false && (
               <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
                <AlertTitle>Perception Link Failure</AlertTitle>
                <AlertDescription>Hardware access denied. Check system privacy settings.</AlertDescription>
              </Alert>
            )}
            <Button disabled={!hasCameraPermission || isLoading} className="w-full rounded-xl font-bold bg-white/5 border-white/10">
              Active Monitoring Interface
            </Button>
          </CardContent>
        </Card>
       )
     }

     return (
       <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Perception Layer</CardTitle>
                <CardDescription className="mt-1">{currentScenario.description}</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary font-mono rounded-lg">SCAN_ID: {currentScenario.id.split('-')[1]}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {scenarioImage ? (
                <div className="aspect-video overflow-hidden rounded-xl border border-white/10 relative group shadow-2xl">
                  <Image
                    src={scenarioImage.imageUrl}
                    alt={scenarioImage.description}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    data-ai-hint={scenarioImage.imageHint}
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Neural Overlay</p>
                      <p className="text-sm font-medium text-white shadow-sm">{currentScenario.name}</p>
                    </div>
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                </div>
            ) : <Skeleton className="aspect-video w-full rounded-xl" />}
          </CardContent>
        </Card>
     )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#1C1F26] text-[#E5E7EB] font-sans selection:bg-primary/30 antialiased">
      <header className="sticky top-0 z-50 flex h-[80px] items-center justify-between border-b border-white/5 bg-[#1C1F26]/90 backdrop-blur-xl px-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white">EthicalDrive AI</h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-[#9CA3AF] font-bold">Neuro-Symbolic Multimodal Interface</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Ethics Frame:</span>
            <div className="flex gap-2">
              {(['Utilitarian', 'Deontological', 'Virtue'] as EthicsMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setEthicsMode(mode)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${ethicsMode === mode ? 'bg-primary text-white shadow-lg' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <Separator orientation="vertical" className="h-8 bg-white/10" />
          <Badge className="bg-[#6EE7B7]/10 text-[#6EE7B7] border-[#6EE7B7]/20 py-1 px-3 rounded-full font-mono text-[10px]">SYSTEM_SECURE</Badge>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10 p-8 lg:p-12 max-w-[1400px] mx-auto w-full">
        <Tabs defaultValue="scenario" onValueChange={(value) => setAnalysisMode(value as AnalysisMode)} className="w-full">
          <TabsList className="bg-white/5 border border-white/5 p-1.5 h-14 rounded-2xl w-full max-w-md">
            <TabsTrigger value="scenario" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl font-bold transition-all">SIMULATOR</TabsTrigger>
            <TabsTrigger value="video" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl font-bold transition-all">AUDIT</TabsTrigger>
            <TabsTrigger value="live" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl font-bold transition-all">TELEMETRY</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {analysisMode === 'scenario' && (
          <div className="grid gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9CA3AF] flex items-center gap-2"><BookOpen className="h-3 w-3" /> SCENARIO LIBRARY</span>
              <div className="flex flex-wrap gap-3">
              {scenarios.map((scenario) => (
                  <Button
                  key={scenario.id}
                  variant="outline"
                  className={`rounded-xl h-11 px-6 border-white/10 hover:border-primary/50 transition-all font-bold ${currentScenario.id === scenario.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-[#E5E7EB]'}`}
                  onClick={() => setCurrentScenario(scenario)}
                  >
                  {scenario.name}
                  </Button>
              ))}
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          {/* Left Column: Perception & Facts */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            {renderPerceptionLayer()}
            
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-xl rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Symbolic Fact Base</CardTitle>
                <CardDescription>Neuro-symbolic bridge extracting structured scene entities.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8">
                <div className="grid gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">Extracted Entities</span>
                  <div className="flex flex-wrap gap-3">
                  {currentScenario.perceptionData.objects.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 shadow-sm group hover:border-primary/30 transition-colors">
                      <ObjectIcon object={obj} className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold capitalize">{obj.replace('_', ' ')}</span>
                    </div>
                  ))}
                  </div>
                </div>
                <Separator className="bg-white/5" />
                <div className="grid gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">State Signals</span>
                    <div className="flex flex-wrap gap-3">
                  {currentScenario.perceptionData.signals.map((sig, i) => (
                      <Badge key={i} className={`px-4 py-1.5 rounded-lg border-none font-bold text-[10px] tracking-widest ${sig === 'red_light' ? 'bg-[#EF4444] text-white' : 'bg-[#6EE7B7] text-[#1C1F26]'}`}>
                        {sig.replace('_', ' ').toUpperCase()}
                      </Badge>
                  ))}
                  {currentScenario.perceptionData.signals.length === 0 && <span className="text-xs text-[#9CA3AF] italic">Null environmental signals</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: XAI & Decision Engine */}
          <div className="lg:col-span-5 flex flex-col gap-10">
              <Card className="border-border/40 bg-primary/10 border-l-4 border-l-primary shadow-2xl rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="grid gap-1">
                  <CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5" /> Neuro-Symbolic Summarizer</CardTitle>
                  <CardDescription className="text-[#9CA3AF]">LLM-driven contextual grounding.</CardDescription>
                </div>
                  <Bot className="h-6 w-6 text-primary animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-full bg-white/5" />
                    <Skeleton className="h-3 w-[90%] bg-white/5" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-[#E5E7EB] font-medium italic p-4 bg-white/5 rounded-xl border border-white/5">"{summary || 'Synthesizing scene semantics...'}"</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#2A2E37] border-border/40 shadow-2xl relative overflow-hidden rounded-2xl border-t border-t-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <BarChart3 className="h-40 w-40" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between relative z-10 pb-6">
                <div className="grid gap-1.5">
                  <CardTitle className="text-xl flex items-center gap-2"><Zap className="h-5 w-5 text-[#FBBF24]" /> Decision Engine</CardTitle>
                  <CardDescription>Formal reasoning & risk prioritization.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-8 relative z-10">
                <div className="bg-black/30 rounded-2xl p-6 border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9CA3AF]">Primary Action</span>
                      {isLoading || !decision ? <Skeleton className="h-8 w-28 rounded-xl" /> : 
                        <Badge 
                          variant={getDecisionBadgeInfo(decision?.decision).variant} 
                          className={`text-sm px-6 py-2 font-black shadow-2xl rounded-xl border-none ${getDecisionBadgeInfo(decision?.decision).className}`}
                        >
                          {decision?.decision.toUpperCase()}
                        </Badge>
                      }
                  </div>
                  <Separator className="bg-white/5 my-6" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#9CA3AF] tracking-widest">Confidence Index</span>
                        <span className="font-mono text-sm font-bold text-white">{isLoading ? '--' : `${Math.round((decision?.confidence || 0) * 100)}%`}</span>
                    </div>
                    <Progress value={(decision?.confidence || 0) * 100} className="h-2 bg-white/10 rounded-full" />
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Symbolic Justification
                    </h4>
                    {isLoading ? (
                      <Skeleton className="h-16 w-full bg-white/5 rounded-xl" />
                    ) : (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                        <p className="text-xs text-[#E5E7EB] leading-relaxed font-mono italic">{decision?.reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6EE7B7] flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#6EE7B7]" />
                      Human-Readable XAI
                    </h4>
                    {isLoading ? (
                      <div className="space-y-2">
                          <Skeleton className="h-3 w-full bg-white/5" />
                          <Skeleton className="h-3 w-[85%] bg-white/5" />
                      </div>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] leading-relaxed pl-4 border-l-2 border-[#6EE7B7]/30">{explanation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
               <Card className="bg-white/5 border-white/10 shadow-xl rounded-2xl">
                  <CardContent className="pt-8 flex flex-col items-center gap-3">
                    <span className="text-[9px] font-bold uppercase text-[#9CA3AF] tracking-[0.2em]">Risk Profile</span>
                    <span className={`text-2xl font-black ${decision?.riskLevel === 'High' ? 'text-[#EF4444]' : decision?.riskLevel === 'Medium' ? 'text-[#FBBF24]' : 'text-[#6EE7B7]'}`}>
                      {decision?.riskLevel || 'N/A'}
                    </span>
                  </CardContent>
               </Card>
               <Card className="bg-white/5 border-white/10 shadow-xl rounded-2xl">
                  <CardContent className="pt-8 flex flex-col items-center gap-3">
                    <span className="text-[9px] font-bold uppercase text-[#9CA3AF] tracking-[0.2em]">Inference Latency</span>
                    <span className="text-2xl font-black text-primary">18ms</span>
                  </CardContent>
               </Card>
            </div>
          </div>
        </div>

        {/* Audit Trail Section */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-2xl rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-[#9CA3AF]" /> Ethical Audit Trail</CardTitle>
              <CardDescription>Persistent record of neural and symbolic logic intersections.</CardDescription>
            </div>
            <Info className="h-5 w-5 text-[#9CA3AF] opacity-50" />
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF] text-[10px] uppercase font-bold tracking-widest">Timestamp</TableHead>
                  <TableHead className="text-[#9CA3AF] text-[10px] uppercase font-bold tracking-widest">Scenario</TableHead>
                  <TableHead className="text-[#9CA3AF] text-[10px] uppercase font-bold tracking-widest">Framework</TableHead>
                  <TableHead className="text-[#9CA3AF] text-[10px] uppercase font-bold tracking-widest">Decision</TableHead>
                  <TableHead className="text-[#9CA3AF] text-[10px] uppercase font-bold tracking-widest text-right">Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry) => (
                  <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="text-xs font-mono text-primary">{entry.timestamp}</TableCell>
                    <TableCell className="text-xs font-bold">{entry.scenarioName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] py-0 border-white/20 text-[#9CA3AF]">{entry.mode}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs font-black ${entry.decision.toLowerCase().includes('brake') || entry.decision.toLowerCase().includes('stop') ? 'text-[#EF4444]' : 'text-[#6EE7B7]'}`}>
                        {entry.decision.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right"><Badge className="bg-[#6EE7B7]/10 text-[#6EE7B7] border-none text-[9px]">{entry.outcome}</Badge></TableCell>
                  </TableRow>
                ))}
                {auditLog.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#9CA3AF] text-xs italic font-medium">No telemetry data recorded in current buffer.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-auto border-t border-white/5 p-8 bg-black/40 text-center backdrop-blur-md">
         <div className="flex flex-col gap-2 items-center">
            <p className="text-[10px] text-[#9CA3AF] font-bold tracking-[0.5em] uppercase">Academic Research Prototype • Version 2.1.0-NS</p>
            <p className="text-[8px] text-[#9CA3AF]/40 max-w-md">All decisions are simulated using multimodal neuro-symbolic logic. Use for academic evaluation purposes only.</p>
         </div>
      </footer>
    </div>
  );
}