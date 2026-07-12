import { create } from 'zustand';
import api from '../lib/api';
import { socket } from '../lib/socket';
import { toast } from 'react-hot-toast';

export interface ScoreDetails {
  envScore: number;
  socialScore: number;
  govScore: number;
  totalScore: number;
}

export interface ESGSettings {
  id: string;
  envWeight: number;
  socialWeight: number;
  govWeight: number;
  autoBadgeAward: boolean;
  evidenceRequired: boolean;
  autoEmissionCalc: boolean;
  emailAlerts: boolean;
}

interface ESGState {
  // Scores
  orgScores: ScoreDetails;
  departmentScores: any[];
  insights: any[];
  activityFeed: any[];

  // Lists
  departments: any[];
  categories: any[];
  emissionFactors: any[];
  transactions: any[];
  goals: any[];
  activities: any[];
  pendingParticipations: any[];
  policies: any[];
  audits: any[];
  complianceIssues: any[];
  challenges: any[];
  pendingChallengeCompletions: any[];
  rewards: any[];
  leaderboard: any[];
  esgSettings: ESGSettings | null;

  // Actions
  fetchDashboardData: () => Promise<void>;
  fetchEnvironmentalData: () => Promise<void>;
  fetchSocialData: (userRole?: string) => Promise<void>;
  fetchGovernanceData: () => Promise<void>;
  fetchGamificationData: (userRole?: string) => Promise<void>;
  fetchSettingsData: () => Promise<void>;

  // Environmental actions
  logTransaction: (tx: any) => Promise<void>;
  createGoal: (goal: any) => Promise<void>;
  updateGoalProgress: (goalId: string, currentCo2: number) => Promise<void>;

  // Social actions
  createCsrActivity: (act: any) => Promise<void>;
  joinActivity: (activityId: string, proofFile: File | null, notes?: string) => Promise<void>;
  approveParticipation: (partId: string) => Promise<void>;
  rejectParticipation: (partId: string, notes: string) => Promise<void>;

  // Governance actions
  createPolicy: (policy: any) => Promise<void>;
  acknowledgePolicy: (policyId: string) => Promise<void>;
  createAudit: (audit: any) => Promise<void>;
  updateAuditStatus: (auditId: string, status: string, findings?: string) => Promise<void>;
  createComplianceIssue: (issue: any) => Promise<void>;
  updateComplianceIssueStatus: (issueId: string, status: string) => Promise<void>;

  // Gamification actions
  createChallenge: (challenge: any) => Promise<void>;
  updateChallengeStatus: (challengeId: string, status: string) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<void>;
  updateChallengeProgress: (challengeId: string, progress: number, proofFile: File | null, notes?: string) => Promise<void>;
  approveChallengeCompletion: (compId: string) => Promise<void>;
  rejectChallengeCompletion: (compId: string, notes: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<any>;

  // Settings actions
  updateEsgConfig: (config: any) => Promise<void>;
}

export const useEsgStore = create<ESGState>((set, get) => {
  // Listen for WebSocket Score Updates
  socket.on('score:update', (data: any) => {
    console.log('[WS] ESG score update received:', data);
    set((state) => {
      let updatedScores = [...state.departmentScores];
      if (data.departmentId && data.scores) {
        updatedScores = state.departmentScores.map((s) =>
          s.departmentId === data.departmentId ? { ...s, ...data.scores } : s
        );
      }
      return {
        orgScores: data.orgScore !== undefined
          ? {
              envScore: data.scores?.envScore ?? state.orgScores.envScore,
              socialScore: data.scores?.socialScore ?? state.orgScores.socialScore,
              govScore: data.scores?.govScore ?? state.orgScores.govScore,
              totalScore: data.orgScore,
            }
          : state.orgScores,
        departmentScores: updatedScores,
      };
    });
  });

  // Listen for Live Activity Feed
  socket.on('activity:feed', (activity: any) => {
    console.log('[WS] Activity feed broadcast:', activity);
    set((state) => ({
      activityFeed: [activity, ...state.activityFeed].slice(0, 50),
    }));
  });

  // Listen for ESG Settings Updated
  socket.on('settings:updated', (config: any) => {
    console.log('[WS] Settings updated:', config);
    set({ esgSettings: config });
  });

  return {
    orgScores: { envScore: 50, socialScore: 50, govScore: 50, totalScore: 50 },
    departmentScores: [],
    insights: [],
    activityFeed: [],

    departments: [],
    categories: [],
    emissionFactors: [],
    transactions: [],
    goals: [],
    activities: [],
    pendingParticipations: [],
    policies: [],
    audits: [],
    complianceIssues: [],
    challenges: [],
    pendingChallengeCompletions: [],
    rewards: [],
    leaderboard: [],
    esgSettings: null,

    fetchDashboardData: async () => {
      try {
        const [scoresRes, settingsRes, insightsRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/settings/esg-config'),
          api.get('/environmental/insights'),
        ]);

        const summary = scoresRes.data.data;
        const settings = settingsRes.data.data;
        const insights = insightsRes.data.data;

        set({
          esgSettings: settings,
          orgScores: {
            envScore: summary.departmentScores?.length
              ? summary.departmentScores.reduce((sum: number, s: any) => sum + s.envScore, 0) / summary.departmentScores.length
              : 50,
            socialScore: summary.departmentScores?.length
              ? summary.departmentScores.reduce((sum: number, s: any) => sum + s.socialScore, 0) / summary.departmentScores.length
              : 50,
            govScore: summary.departmentScores?.length
              ? summary.departmentScores.reduce((sum: number, s: any) => sum + s.govScore, 0) / summary.departmentScores.length
              : 50,
            totalScore: summary.orgScore || 50,
          },
          departmentScores: summary.departmentScores || [],
          insights: insights || [],
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    },

    fetchEnvironmentalData: async () => {
      try {
        const [factors, txs, goals, depts] = await Promise.all([
          api.get('/environmental/emission-factors'),
          api.get('/environmental/transactions'),
          api.get('/environmental/goals'),
          api.get('/settings/departments'),
        ]);
        set({
          emissionFactors: factors.data.data,
          transactions: txs.data.data,
          goals: goals.data.data,
          departments: depts.data.data,
        });
      } catch (error) {
        console.error('Failed to load environmental data:', error);
      }
    },

    fetchSocialData: async (userRole?: string) => {
      try {
        const [activities, categories, depts] = await Promise.all([
          api.get('/social/activities'),
          api.get('/settings/categories'),
          api.get('/settings/departments'),
        ]);
        set({
          activities: activities.data.data,
          categories: categories.data.data,
          departments: depts.data.data,
        });

        if (userRole && userRole !== 'EMPLOYEE') {
          const pending = await api.get('/social/participations/pending');
          set({ pendingParticipations: pending.data.data });
        }
      } catch (error) {
        console.error('Failed to load social data:', error);
      }
    },

    fetchGovernanceData: async () => {
      try {
        const [policies, audits, compliance, depts] = await Promise.all([
          api.get('/governance/policies'),
          api.get('/governance/audits'),
          api.get('/governance/issues'),
          api.get('/settings/departments'),
        ]);
        set({
          policies: policies.data.data,
          audits: audits.data.data,
          complianceIssues: compliance.data.data,
          departments: depts.data.data,
        });
      } catch (error) {
        console.error('Failed to load governance data:', error);
      }
    },

    fetchGamificationData: async (userRole?: string) => {
      try {
        const [challenges, rewards, leaderboard] = await Promise.all([
          api.get('/gamification/challenges'),
          api.get('/gamification/rewards'),
          api.get('/gamification/leaderboard'),
        ]);
        set({
          challenges: challenges.data.data,
          rewards: rewards.data.data,
          leaderboard: leaderboard.data.data,
        });

        if (userRole && userRole !== 'EMPLOYEE') {
          const pending = await api.get('/gamification/completions/pending');
          set({ pendingChallengeCompletions: pending.data.data });
        }
      } catch (error) {
        console.error('Failed to load gamification data:', error);
      }
    },

    fetchSettingsData: async () => {
      try {
        const [depts, categories, settings] = await Promise.all([
          api.get('/settings/departments'),
          api.get('/settings/categories'),
          api.get('/settings/esg-config'),
        ]);
        set({
          departments: depts.data.data,
          categories: categories.data.data,
          esgSettings: settings.data.data,
        });
      } catch (error) {
        console.error('Failed to load settings data:', error);
      }
    },

    logTransaction: async (tx: any) => {
      await api.post('/environmental/transactions', tx);
      toast.success('Carbon transaction logged successfully!');
      get().fetchEnvironmentalData();
      get().fetchDashboardData();
    },

    createGoal: async (goal: any) => {
      await api.post('/environmental/goals', goal);
      toast.success('Environmental goal created!');
      get().fetchEnvironmentalData();
      get().fetchDashboardData();
    },

    updateGoalProgress: async (goalId: string, currentCo2: number) => {
      await api.patch(`/environmental/goals/${goalId}`, { currentCo2 });
      toast.success('Goal progress updated!');
      get().fetchEnvironmentalData();
      get().fetchDashboardData();
    },

    createCsrActivity: async (act: any) => {
      await api.post('/social/activities', act);
      toast.success('CSR activity drive launched!');
      get().fetchSocialData();
    },

    joinActivity: async (activityId: string, proofFile: File | null, notes?: string) => {
      const formData = new FormData();
      if (notes) formData.append('notes', notes);
      if (proofFile) formData.append('proof', proofFile);

      await api.post(`/social/activities/${activityId}/join`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Successfully submitted participation request!');
      get().fetchSocialData();
    },

    approveParticipation: async (partId: string) => {
      await api.patch(`/social/participations/${partId}/approve`);
      toast.success('Participation approved!');
      get().fetchSocialData();
      get().fetchDashboardData();
    },

    rejectParticipation: async (partId: string, notes: string) => {
      await api.patch(`/social/participations/${partId}/reject`, { notes });
      toast.success('Participation rejected.');
      get().fetchSocialData();
    },

    createPolicy: async (policy: any) => {
      await api.post('/governance/policies', policy);
      toast.success('ESG policy drafted successfully!');
      get().fetchGovernanceData();
    },

    acknowledgePolicy: async (policyId: string) => {
      await api.post(`/governance/policies/${policyId}/acknowledge`);
      toast.success('Policy acknowledged!');
      get().fetchGovernanceData();
      get().fetchDashboardData();
    },

    createAudit: async (audit: any) => {
      await api.post('/governance/audits', audit);
      toast.success('Department audit scheduled!');
      get().fetchGovernanceData();
      get().fetchDashboardData();
    },

    updateAuditStatus: async (auditId: string, status: string, findings?: string) => {
      await api.patch(`/governance/audits/${auditId}`, { status, findings });
      toast.success('Audit status updated!');
      get().fetchGovernanceData();
    },

    createComplianceIssue: async (issue: any) => {
      await api.post('/governance/issues', issue);
      toast.success('Compliance issue logged!');
      get().fetchGovernanceData();
      get().fetchDashboardData();
    },

    updateComplianceIssueStatus: async (issueId: string, status: string) => {
      await api.patch(`/governance/issues/${issueId}`, { status });
      toast.success('Compliance issue updated!');
      get().fetchGovernanceData();
      get().fetchDashboardData();
    },

    createChallenge: async (challenge: any) => {
      await api.post('/gamification/challenges', challenge);
      toast.success('Gamification challenge added!');
      get().fetchGamificationData();
    },

    updateChallengeStatus: async (challengeId: string, status: string) => {
      await api.put(`/gamification/challenges/${challengeId}/status`, { status });
      toast.success('Challenge status updated!');
      get().fetchGamificationData();
    },

    joinChallenge: async (challengeId: string) => {
      await api.post(`/gamification/challenges/${challengeId}/join`);
      toast.success('Joined challenge! Go green!');
      get().fetchGamificationData();
    },

    updateChallengeProgress: async (challengeId: string, progress: number, proofFile: File | null, notes?: string) => {
      const formData = new FormData();
      formData.append('progress', String(progress));
      if (notes) formData.append('notes', notes);
      if (proofFile) formData.append('proof', proofFile);

      await api.post(`/gamification/challenges/${challengeId}/progress`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Progress updated successfully!');
      get().fetchGamificationData();
    },

    approveChallengeCompletion: async (compId: string) => {
      await api.patch(`/gamification/completions/${compId}/approve`);
      toast.success('Challenge completion approved!');
      get().fetchGamificationData();
      get().fetchDashboardData();
    },

    rejectChallengeCompletion: async (compId: string, notes: string) => {
      await api.patch(`/gamification/completions/${compId}/reject`, { notes });
      toast.success('Challenge completion rejected.');
      get().fetchGamificationData();
    },

    redeemReward: async (rewardId: string) => {
      const response = await api.post('/gamification/rewards/redeem', { rewardId });
      toast.success('Reward successfully redeemed!');
      get().fetchGamificationData();
      return response.data.data;
    },

    updateEsgConfig: async (config: any) => {
      await api.patch('/settings/esg-config', config);
      toast.success('ESG Settings updated!');
      get().fetchSettingsData();
      get().fetchDashboardData();
    },
  };
});
export default useEsgStore;
