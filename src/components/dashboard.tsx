'use client';

import * as React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { scenarios } from '@/lib/scenarios';
import { determineAction } from '@/lib/reasoning';
import { explainEthicalDecision } from '@/ai/flows/explain-ethical-decision';
import { summarizeDrivingScenario } from '@/ai/flows/summarize-driving-scenario';
import type { Scenario, Decision } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ObjectIcon } from './object-icon';
import { Bot, Zap } from 'lucide-react';

export default function Dashboard() {
  const [currentScenario, setCurrentScenario] = React.useState<Scenario>(scenarios[0]);
  const [summary, setSummary] = React.useState<string>('');
  const [explanation, setExplanation] = React.useState<string>('');
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const scenarioImage = React.useMemo(() => {
    return PlaceHolderImages.find(img => img.id === currentScenario.imageId);
  }, [currentScenario]);

  React.useEffect(() => {
    const analyzeScenario = async () => {
      setIsLoading(true);
      setSummary('');
      setExplanation('');
      setDecision(null);

      // 1. Symbolic Reasoning (local, fast)
      const reasonedDecision = determineAction(currentScenario.perceptionData);
      setDecision(reasonedDecision);

      try {
        // 2. GenAI Summarization & Explanation (async)
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
  }, [currentScenario]);
  
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-card px-6">
        <h1 className="text-xl font-semibold text-foreground">EthicalDriveAI</h1>
        <p className="hidden md:block text-sm text-muted-foreground">Neuro-Symbolic Ethical Reasoning for Autonomous Vehicles</p>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7 md:gap-8">
          <div className="lg:col-span-4 flex flex-col gap-4 md:gap-8">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
