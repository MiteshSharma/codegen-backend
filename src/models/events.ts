// src/types/events.ts
export type StreamEventType = 
  | 'content_update'
  | 'complete'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: any;
  timestamp: number;
}