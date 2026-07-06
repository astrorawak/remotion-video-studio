import { FRAME_TIMING } from './videoConfig';

export type SceneId = 'scene01' | 'scene02' | 'scene03' | 'scene04' | 'scene05';

export interface SceneDefinition {
  id: SceneId;
  title: string;
  description: string;
  from: number;
  durationInFrames: number;
  cameraShakeIntensity: number;
}

export const SCENES: SceneDefinition[] = [
  {
    id: 'scene01',
    title: 'The Approach',
    description: 'Boy 1 marches aggressively towards the POV motorcycle.',
    from: FRAME_TIMING.SCENE_1_START,
    durationInFrames: FRAME_TIMING.SCENE_1_END - FRAME_TIMING.SCENE_1_START,
    cameraShakeIntensity: 0,
  },
  {
    id: 'scene02',
    title: 'The Confrontation',
    description: 'Close-up, shouting, physical push/slap.',
    from: FRAME_TIMING.SCENE_2_START,
    durationInFrames: FRAME_TIMING.SCENE_2_END - FRAME_TIMING.SCENE_2_START,
    cameraShakeIntensity: 1.5,
  },
  {
    id: 'scene03',
    title: 'The Intervention',
    description: 'Boy 3 steps in to mediate.',
    from: FRAME_TIMING.SCENE_3_START,
    durationInFrames: FRAME_TIMING.SCENE_3_END - FRAME_TIMING.SCENE_3_START,
    cameraShakeIntensity: 0,
  },
  {
    id: 'scene04',
    title: 'The Glare',
    description: 'Boy 2 leans in with a stern expression.',
    from: FRAME_TIMING.SCENE_4_START,
    durationInFrames: FRAME_TIMING.SCENE_4_END - FRAME_TIMING.SCENE_4_START,
    cameraShakeIntensity: 0.5,
  },
  {
    id: 'scene05',
    title: 'The Escalation',
    description: 'Lunge, struggle, intense camera shake, fall to grass, fade to black.',
    from: FRAME_TIMING.SCENE_5_START,
    durationInFrames: FRAME_TIMING.SCENE_5_END - FRAME_TIMING.SCENE_5_START,
    cameraShakeIntensity: 3,
  },
];
