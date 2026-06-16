"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Clock, CheckCircle, AlertCircle, Send, Code, BookOpen, Brain, Camera, CameraOff, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { useProctoring } from "@/hooks/useProctoring";

interface MCQ { id: number; type: string; question: string; options: string[]; difficulty: string; }
interface CodingProblem { id: number; type: string; title: string; difficulty: string; description: string; examples: { input: string; output: string; explanation?: string }[]; constraints: string[]; }
interface TestData {
  attempt_id: number; job_title: string; duration_minutes: number; started_at: string;
  mcqs: MCQ[]; coding: CodingProblem[];
  sections: { aptitude: number; domain: number; coding: number };
}

type Stage = "aptitude" | "domain" | "coding" | "submitted";

const STAGE_META: Record<string, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  aptitude: { label: "Section 1 — Aptitude",     desc: "10 logical & quantitative questions", icon: Brain,    color: "bg-blue-100 text-blue-700" },
  domain:   { label: "Section 2 — Domain",        desc: "10 role-specific questions",          icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  coding:   { label: "Section 3 — Coding",        desc: "2 LeetCode-style problems",           icon: Code,     color: "bg-orange-100 text-orange-700" },
};

export default function AssessmentPage() {
  const { token } = useParams<{ token: string }>();
  const [test, setTest] = useState<TestData | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<number, string>>({});
  const [stage, setStage] = useState<Stage>("aptitude");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDisqualify = useCallback(async (reason: string) => {
    setDisqualified(true);
    setDisqualifyReason(reason);
    clearInterval(timerRef.current!);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments/disqualify/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch { /* best effort */ }
  }, [token]);

  const { violations, violationCountRef, cameraAllowed, cameraError, faceStatus, videoRef, maxViolations, stopCamera } = useProctoring({
    onDisqualify: handleDisqualify,
    maxViolations: 3,
    enabled: cameraReady,
  });

  useEffect(() => { if (disqualified) stopCamera(); }, [disqualified]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments/take/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) { setError(data.message); setLoading(false); return; }
        setTest(data);
        setTimeLeft(data.duration_minutes * 60);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load test."); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!test || submitted || disqualified) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [test, submitted, disqualified]);

  async function handleSubmit(auto = false) {
    if (!auto && !confirm("Submit your assessment? This cannot be undone.")) return;
    clearInterval(timerRef.current!);
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments/submit/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: mcqAnswers, code_answers: codeAnswers }),
      });
      if (res.ok) { stopCamera(); setSubmitted(true); setStage("submitted"); }
      else { const d = await res.json(); setError(d.message || "Submission failed"); }
    } catch { setError("Submission failed."); }
    finally { setSubmitting(false); }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft < 300 ? "text-red-500" : timeLeft < 600 ? "text-orange-500" : "text-gray-700";

  // ── Camera gate ──────────────────────────────────────────────────────────
  if (!cameraReady && !loading && !error) {
    return (
      <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Required</h2>
          <p className="text-sm text-gray-500 mb-6">This test requires your front camera throughout. Malpractice will result in automatic disqualification.</p>
          <div className="bg-orange-50 rounded-xl p-4 mb-6 text-left space-y-2">
            {["Front camera must be on at all times", "No tab switching (3 strikes = disqualified)", "No copy/paste or screenshots", "Only 1 face should be visible"].map(r => (
              <div key={r} className="flex items-start gap-2 text-sm text-orange-700">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </div>
          {cameraError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{cameraError}</div>}
          <button onClick={() => setCameraReady(true)} className="btn-primary w-full justify-center flex">
            I Understand — Start Test
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading your assessment…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="font-bold text-gray-900 mb-2">Unable to Load Test</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  // ── Disqualified ─────────────────────────────────────────────────────────
  if (disqualified) return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={36} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Disqualified</h2>
        <p className="text-gray-500 text-sm mb-4">Your assessment has been terminated due to malpractice.</p>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-600 font-medium">Reason: {disqualifyReason}</p>
        </div>
        <p className="text-xs text-gray-400">The recruitment team has been notified. Your application has been cancelled.</p>
      </div>
    </div>
  );

  // ── Submitted screen (no score shown) ────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Submitted!</h2>
        <p className="text-gray-500 text-sm mb-6">Thank you for completing Round 1.</p>
        <div className="bg-orange-50 rounded-xl p-5 mb-5 text-left space-y-2">
          <p className="text-sm font-semibold text-orange-800 mb-1">What happens next?</p>
          <p className="text-xs text-orange-700">✦ Our team will evaluate your responses</p>
          <p className="text-xs text-orange-700">✦ Shortlisted candidates will be notified via email</p>
          <p className="text-xs text-orange-700">✦ Selected candidates will be invited for Round 2</p>
        </div>
        <p className="text-xs text-gray-400">Results are not disclosed. You will hear from us soon.</p>
      </div>
    </div>
  );

  if (!test) return null;

  const aptitudeQs = test.mcqs.filter(q => q.type === "aptitude");
  const domainQs   = test.mcqs.filter(q => q.type === "domain");
  const remainingViolations = maxViolations - violationCountRef.current;

  const answeredInStage = (qs: MCQ[]) => qs.filter(q => mcqAnswers[q.id] !== undefined).length;
  const codingAttempted = Object.values(codeAnswers).filter(v => v.trim().length > 0).length;

  const STAGE_ORDER: Stage[] = ["aptitude", "domain", "coding"];
  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="min-h-screen bg-[#fffbf7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{test.job_title} — Round 1</p>
            <p className="text-xs text-gray-400">
              {stage !== "coding"
                ? `Section ${stageIndex + 1} of 3`
                : `Section 3 of 3 — Final`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {violations.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl">
                <ShieldAlert size={13} className="text-red-500" />
                <span className="text-xs font-semibold text-red-600">{remainingViolations} warnings left</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${cameraAllowed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {cameraAllowed ? <Camera size={13} /> : <CameraOff size={13} />}
              {faceStatus === "ok" && cameraAllowed && <ShieldCheck size={13} />}
              {faceStatus === "no_face" && <span className="text-red-600">No face</span>}
              {faceStatus === "multiple" && <span className="text-red-600">Multiple faces</span>}
            </div>
            <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor}`}>
              <Clock size={16} /> {fmt(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      {/* Stage progress bar */}
      <div className="max-w-4xl mx-auto px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-5">
          {STAGE_ORDER.map((s, i) => {
            const meta = STAGE_META[s];
            const Icon = meta.icon;
            const isActive = stage === s;
            const isDone = stageIndex > i;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold flex-1 justify-center transition-all ${
                  isActive ? "bg-orange-500 text-white shadow-sm" :
                  isDone   ? "bg-emerald-100 text-emerald-700" :
                             "bg-gray-100 text-gray-400"
                }`}>
                  {isDone ? <CheckCircle size={13} /> : <Icon size={13} />}
                  <span className="hidden sm:inline">{s === "aptitude" ? "Aptitude" : s === "domain" ? "Domain" : "Coding"}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </div>
                {i < 2 && <div className={`w-6 h-0.5 shrink-0 rounded ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        {/* Section heading */}
        {stage !== "coding" && (() => {
          const meta = STAGE_META[stage];
          const Icon = meta.icon;
          const qs = stage === "aptitude" ? aptitudeQs : domainQs;
          const answered = answeredInStage(qs);
          return (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}><Icon size={16} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">{meta.label}</h2>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {answered} / {qs.length} answered
              </span>
            </div>
          );
        })()}
      </div>

      {/* Violation banner */}
      {violations.length > 0 && !disqualified && (
        <div className="bg-red-500 text-white text-sm px-4 py-2 text-center font-medium">
          ⚠️ Warning {violations.length}/{maxViolations}: {violations[violations.length - 1].message} — {remainingViolations} more will disqualify you
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pb-32">

        {/* Camera feed — fixed bottom left */}
        <div className="fixed bottom-4 left-4 z-40 w-36">
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video shadow-lg border border-gray-200">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!cameraAllowed && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <CameraOff size={16} className="text-gray-500" />
              </div>
            )}
            <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${faceStatus === "ok" ? "bg-green-400" : "bg-red-500"} animate-pulse`} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Proctoring</p>
        </div>

        {/* ── APTITUDE SECTION ── */}
        {stage === "aptitude" && (
          <div className="space-y-4">
            {aptitudeQs.map((q, idx) => (
              <MCQCard key={q.id} q={q} idx={idx} answers={mcqAnswers} setAnswers={setMcqAnswers} color="bg-blue-100 text-blue-700" />
            ))}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStage("domain")}
                className="btn-primary flex items-center gap-2"
              >
                Proceed to Domain Questions <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── DOMAIN SECTION ── */}
        {stage === "domain" && (
          <div className="space-y-4">
            {domainQs.map((q, idx) => (
              <MCQCard key={q.id} q={q} idx={idx} answers={mcqAnswers} setAnswers={setMcqAnswers} color="bg-emerald-100 text-emerald-700" />
            ))}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStage("coding")}
                className="btn-primary flex items-center gap-2"
              >
                Proceed to Coding Problems <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── CODING SECTION ── */}
        {stage === "coding" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100 text-orange-700"><Code size={16} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">{STAGE_META.coding.label}</h2>
                  <p className="text-xs text-gray-400">{STAGE_META.coding.desc}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {codingAttempted} / {test.coding.length} attempted
              </span>
            </div>

            {test.coding.map((prob, idx) => (
              <div key={prob.id} className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-xs font-bold text-orange-600">{idx + 1}</span>
                    <h3 className="font-semibold text-gray-900">{prob.title}</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${prob.difficulty === "easy" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {prob.difficulty}
                  </span>
                </div>
                <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{prob.description}</p>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Examples</p>
                      {prob.examples.map((ex, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2 text-xs font-mono">
                          <p className="text-gray-500">Input: <span className="text-gray-900">{ex.input}</span></p>
                          <p className="text-gray-500">Output: <span className="text-gray-900">{ex.output}</span></p>
                          {ex.explanation && <p className="text-gray-400 mt-1">{ex.explanation}</p>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Constraints</p>
                      <ul className="space-y-1">
                        {prob.constraints.map((c, i) => (
                          <li key={i} className="text-xs text-gray-500 font-mono flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Solution</p>
                      <span className="text-xs text-gray-400">Any language</span>
                    </div>
                    <textarea
                      className="flex-1 min-h-[280px] w-full bg-gray-950 text-green-400 font-mono text-sm p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none leading-relaxed"
                      placeholder={`// Write your solution here\nfunction solution() {\n  // your code\n}`}
                      value={codeAnswers[prob.id] || ""}
                      onChange={e => setCodeAnswers(p => ({ ...p, [prob.id]: e.target.value }))}
                      spellCheck={false}
                      onCopy={e => e.preventDefault()}
                      onPaste={e => e.preventDefault()}
                    />
                    {codeAnswers[prob.id]?.trim() && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Solution saved</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Final submit */}
            <div className="flex justify-end pt-4 pb-8">
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
              >
                <Send size={16} /> {submitting ? "Submitting…" : "Submit Assessment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MCQCard({ q, idx, answers, setAnswers, color }: {
  q: MCQ; idx: number;
  answers: Record<number, number>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400">Q{idx + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${color}`}>{q.difficulty}</span>
      </div>
      <p className="text-gray-900 font-medium mb-4 leading-relaxed">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: i }))}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${answers[q.id] === i ? "border-orange-400 bg-orange-50 text-orange-900 font-medium" : "border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 text-gray-700"}`}>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${answers[q.id] === i ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
