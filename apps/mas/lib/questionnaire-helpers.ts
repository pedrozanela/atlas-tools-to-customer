import { SESSIONS, type Session } from "./questionnaire";

export { SESSIONS };
export type { Session };

export function findSessionByKey(key: string): Session | undefined {
  return SESSIONS.find((s) => s.key === key);
}
