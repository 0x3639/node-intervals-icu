/**
 * Compile-time contract for UpdateMessageDTO: the API updates only `content` and `answer`
 * (spec: PUT /chats/{id}/messages/{msgId}). Checked by `npm run typecheck:tests`; never executed.
 */
import type { UpdateMessageDTO } from '../../src/index.js';

export const contentOnly: UpdateMessageDTO = { content: 'edited' };
export const answerOnly: UpdateMessageDTO = { answer: 'yes' };
export const both: UpdateMessageDTO = { content: 'edited', answer: 'yes' };

// @ts-expect-error athlete_id is not updatable
export const rejectsAthleteId: UpdateMessageDTO = { content: 'x', athlete_id: 'i1' };
// @ts-expect-error seen is not updatable
export const rejectsSeen: UpdateMessageDTO = { seen: true };
// @ts-expect-error id is not updatable
export const rejectsId: UpdateMessageDTO = { id: 7, content: 'x' };
