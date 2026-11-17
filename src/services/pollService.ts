import { api } from '../utils';

export const pollService = {
  /**
   * Fetches the current user's roadmap feature poll voting status
   */
  async getPollStatus(): Promise<{ hasVoted: boolean; vote?: any }> {
    return api.getPollStatus();
  },

  /**
   * Submits a vote for a roadmap feature
   */
  async submitPollVote(
    option: string,
    customText?: string
  ): Promise<{ success: boolean; vote?: any; error?: string }> {
    return api.submitPollVote(option, customText);
  },
};
