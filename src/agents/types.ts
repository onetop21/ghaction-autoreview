/**
 * Multi-Agent 시스템 타입 정의
 */

export interface DryAnalysis {
  changeType: 'feature' | 'bugfix' | 'refactor' | 'performance' | 'docs' | 'other';
  purpose: string;
  affectedModules: string[];
  architecturePattern: string;
  technicalStack: string[];
  keyChanges: KeyChange[];
  potentialRisks: string[];
  testCoverage: string;
  breakingChanges: string;
  dependencies: string[];
}

export interface KeyChange {
  file: string;
  type: 'added' | 'modified' | 'deleted';
  description: string;
}

export interface AgentIssue {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  file: string;
  line?: number;
  description: string;
  recommendation: string;
  [key: string]: any; // 각 Agent별 추가 필드
}

export interface AgentResult {
  agentType: string;
  issues: AgentIssue[];
  summary?: any;
  metadata?: Record<string, any>;
}

export interface SecurityAgentResult extends AgentResult {
  agentType: 'security';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface PerformanceAgentResult extends AgentResult {
  agentType: 'performance';
  summary: string; // 'Good' | 'Acceptable' | 'Needs Improvement'
}

export interface QualityAgentResult extends AgentResult {
  agentType: 'quality';
  metrics: {
    complexity: string;
    maintainability: string;
    testability: string;
  };
  positives: string[];
}

export interface StyleAgentResult extends AgentResult {
  agentType: 'style';
  summary: {
    totalIssues: number;
    autoFixable: number;
    consistency: string;
  };
}

export interface ArchitectureAgentResult extends AgentResult {
  agentType: 'architecture';
  architecturalDebt: {
    level: string;
    description: string;
  };
  consistency: {
    score: string;
    description: string;
  };
}

export type SpecializedAgentResult =
  | SecurityAgentResult
  | PerformanceAgentResult
  | QualityAgentResult
  | StyleAgentResult
  | ArchitectureAgentResult;

export interface AggregatedReview {
  summary: {
    changeType: string;
    affectedModules: string[];
    overallAssessment: 'Good' | 'Acceptable' | 'Needs Improvement';
    mergeRecommendation: 'Yes' | 'Conditional' | 'No';
  };
  positives: string[];
  criticalIssues: AgentIssue[];
  highPriorityIssues: AgentIssue[];
  mediumLowPriorityIssues: AgentIssue[];
  statistics: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  qualityScores: {
    security: number;
    performance: number;
    quality: number;
    consistency: number;
  };
  nextSteps: string[];
}

export interface CodeChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}
