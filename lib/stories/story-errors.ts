import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type StoryCode = 'STORY_NOT_FOUND' | 'STORY_FORBIDDEN' | 'STORY_CONFLICT' | 'STORY_SLUG_TAKEN' | 'STORY_INVALID_STATE' | 'STORY_INVALID_CONTENT' | 'STORY_INVALID_INPUT' | 'STORY_MEDIA_INVALID' | 'STORY_INVALID_REFERENCE' | 'STORY_NOT_PUBLISHABLE' | 'STORY_UNAVAILABLE';
export class StoryError extends Error {
    constructor(public readonly code: StoryCode) { super(code); }
}
export async function storyOperation<T>(fn: () => Promise<T>): Promise<T> { try {
    return await fn();
}
catch (e) {
    if (e instanceof StoryError || e instanceof AccountError)
        throw e;
    if (e instanceof AuthorizationError)
        throw new StoryError(e.code === 'INSUFFICIENT_PERMISSION' ? 'STORY_FORBIDDEN' : 'STORY_UNAVAILABLE');
    if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
        throw new StoryError('STORY_SLUG_TAKEN');
    throw new StoryError('STORY_UNAVAILABLE');
} }
