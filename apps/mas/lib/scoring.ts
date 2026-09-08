import { SESSIONS, Session } from "./questionnaire";

export interface SessionScore {
  key: string;
  title: string;
  /** Mean of answers, 1–5. */
  score: number;
  /** Number of answers (= number of questions). */
  questionCount: number;
  /** Weighted contribution to overall: score × weight (still on 1–5 scale). */
  weighted: number;
  /** Weight (0..1) used for overall computation. */
  weight: number;
  /** Maturity tier label. */
  tier: MaturityTier;
}

export type MaturityTier =
  | "ad-hoc"
  | "reactive"
  | "managed"
  | "proactive"
  | "optimised";

export interface OverallScore {
  /** Weighted mean across sessions, 1–5. */
  overall: number;
  tier: MaturityTier;
  sessions: SessionScore[];
}

export function tierFor(score: number): MaturityTier {
  if (score < 1.5) return "ad-hoc";
  if (score < 2.5) return "reactive";
  if (score < 3.5) return "managed";
  if (score < 4.5) return "proactive";
  return "optimised";
}

export function tierLabelPt(t: MaturityTier): string {
  switch (t) {
    case "ad-hoc":
      return "Ad-hoc";
    case "reactive":
      return "Reativo";
    case "managed":
      return "Gerenciado";
    case "proactive":
      return "Proativo";
    case "optimised":
      return "Otimizado";
  }
}

export type Answers = Record<string, Record<string, number>>;

/**
 * Compute scores from a flat answer map.
 * answers[sessionKey][questionId] = 1..5
 */
export function computeScores(answers: Answers): OverallScore {
  const sessions: SessionScore[] = SESSIONS.map((s) => {
    const responses = (answers[s.key] ?? {}) as Record<string, number>;
    const values = s.questions
      .map((q) => responses[q.id])
      .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
    const score =
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;
    return {
      key: s.key,
      title: s.title,
      score,
      questionCount: s.questions.length,
      weighted: score * s.weight,
      weight: s.weight,
      tier: tierFor(score),
    };
  });
  const overall = sessions.reduce((sum, s) => sum + s.weighted, 0);
  return {
    overall,
    tier: tierFor(overall),
    sessions,
  };
}

export function findSession(key: string): Session | undefined {
  return SESSIONS.find((s) => s.key === key);
}

/**
 * Single section answers: {questionId: score}
 */
export type SectionAnswers = Record<string, number>;

/**
 * Compute score for a single section.
 * @param sectionKey - The session key (e.g., 'finops', 'cicd')
 * @param answers - Map of questionId to score (1-5)
 * @returns Score and tier for the section, or null if section not found
 */
export function computeSectionScore(
  sectionKey: string,
  answers: SectionAnswers,
): { score: number; tier: MaturityTier; questionCount: number } | null {
  const session = findSession(sectionKey);
  if (!session) return null;

  const values = session.questions
    .map((q) => answers[q.id])
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);

  const score =
    values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;

  return {
    score,
    tier: tierFor(score),
    questionCount: session.questions.length,
  };
}

/**
 * Compute overall score from an array of section submissions.
 * Used for calculating the full assessment score when all sections are complete.
 */
export function computeOverallFromSections(
  sections: Array<{ section_key: string; score: number }>,
): { overall: number; tier: MaturityTier } {
  let weightedSum = 0;

  for (const sub of sections) {
    const session = findSession(sub.section_key);
    if (session) {
      weightedSum += sub.score * session.weight;
    }
  }

  return {
    overall: weightedSum,
    tier: tierFor(weightedSum),
  };
}
